/**
 * QC Reasons list — READ-ONLY aggregates.
 * SELECT / GROUP BY only. Never INSERT / UPDATE / DELETE / MERGE against the database.
 */
import { CATEGORY_SQL_TOKEN, C1_SPECIAL_REASON_SQL_EXCLUDE, buildSubTypSql } from '@/lib/defect-category-sql';
import {
    buildReasonsList,
    formatGeneratedAt,
    parseReasonsListParams,
    yearBounds,
    type ReasonsKind,
    type ReasonsListParams,
    type ReasonsListResponse,
    type ReasonsMonthRow,
    type ReasonsQueryInput,
} from '@/lib/reasons';
import { mergeSumByKeys, querySortSources } from '@/lib/sort-query';
import { bindIsoDate } from '@/lib/sql-params';
import { SORT_VIEW_TOKEN, sourcesForCategory } from '@/lib/sort-source';
import { toFiniteNumber } from '@/lib/utils';

const CATEGORY = 'ALL';
const CACHE_VERSION = 'v1';
const FRESH_MS = 10 * 60 * 1000;

type CacheEntry = {
    at: number;
    key: string;
    rows: ReasonsMonthRow[];
};

const memCache = new Map<string, CacheEntry>();
const rebuildInflight = new Map<string, Promise<CacheEntry>>();

function cacheKey(year: number, kind: ReasonsKind): string {
    return `${CACHE_VERSION}|${year}|${kind}`;
}

function mapMonthRows(rows: Record<string, unknown>[]): ReasonsMonthRow[] {
    return mergeSumByKeys(
        rows.map((row) => ({
            rsn: String(row.rsn || '').trim(),
            mo: toFiniteNumber(row.mo),
            qty: toFiniteNumber(row.qty),
        })),
        ['rsn', 'mo'],
        ['qty'],
    )
        .map((row) => ({
            rsn: row.rsn,
            mo: row.mo,
            qty: row.qty,
        }))
        .filter((row) => row.rsn && row.qty > 0 && row.mo >= 1 && row.mo <= 12);
}

/** Year × kind monthly totals by rsn_desc. Aggregated — not a raw year dump. */
export async function queryReasonsMonthRows(year: number, kind: ReasonsKind): Promise<ReasonsMonthRow[]> {
    const { start, end } = yearBounds(year);
    const subTypSql = buildSubTypSql(kind);
    const sources = sourcesForCategory(CATEGORY);

    const result = await querySortSources<{ rsn: string; mo: number; qty: number }>(
        `
            SELECT
                RTRIM(LTRIM(rsn_desc)) AS rsn,
                MONTH(CAST(m_date AS date)) AS mo,
                SUM(sub_qty) AS qty
            FROM ${SORT_VIEW_TOKEN} WITH (NOLOCK)
            WHERE m_date >= @startDate
                AND m_date < DATEADD(day, 1, @endDate)
                AND rsn_desc IS NOT NULL
                AND RTRIM(LTRIM(rsn_desc)) != ''
                AND ${CATEGORY_SQL_TOKEN}
                AND ${C1_SPECIAL_REASON_SQL_EXCLUDE}
                AND ${subTypSql}
            GROUP BY
                RTRIM(LTRIM(rsn_desc)),
                MONTH(CAST(m_date AS date))
            HAVING SUM(sub_qty) > 0
        `,
        {
            sources,
            category: CATEGORY,
            bind: (req) => {
                bindIsoDate(req, 'startDate', start);
                bindIsoDate(req, 'endDate', end);
            },
        },
    );

    return mapMonthRows(result.recordset as Record<string, unknown>[]);
}

async function loadMonthRows(year: number, kind: ReasonsKind): Promise<CacheEntry> {
    const key = cacheKey(year, kind);
    const t0 = Date.now();
    const rows = await queryReasonsMonthRows(year, kind);
    console.info(`[reasons] ${Date.now() - t0}ms year=${year} kind=${kind} buckets=${rows.length}`);
    const entry = { at: Date.now(), key, rows };
    memCache.set(key, entry);
    return entry;
}

function rebuild(year: number, kind: ReasonsKind): Promise<CacheEntry> {
    const key = cacheKey(year, kind);
    const inflight = rebuildInflight.get(key);
    if (inflight) return inflight;
    const promise = loadMonthRows(year, kind).finally(() => {
        rebuildInflight.delete(key);
    });
    rebuildInflight.set(key, promise);
    return promise;
}

async function getMonthRows(
    year: number,
    kind: ReasonsKind,
    forceRefresh: boolean,
): Promise<{ rows: ReasonsMonthRow[]; stale: boolean; generatedAt: string }> {
    const key = cacheKey(year, kind);
    if (forceRefresh) {
        const fresh = await rebuild(year, kind);
        return { rows: fresh.rows, stale: false, generatedAt: formatGeneratedAt(new Date(fresh.at)) };
    }

    const cached = memCache.get(key);
    if (cached) {
        const age = Date.now() - cached.at;
        if (age > FRESH_MS) void rebuild(year, kind);
        return {
            rows: cached.rows,
            stale: age > FRESH_MS,
            generatedAt: formatGeneratedAt(new Date(cached.at)),
        };
    }

    const fresh = await rebuild(year, kind);
    return { rows: fresh.rows, stale: false, generatedAt: formatGeneratedAt(new Date(fresh.at)) };
}

export async function getReasonsListResponse(
    input: ReasonsQueryInput,
    forceRefresh = false,
): Promise<ReasonsListResponse> {
    const params: ReasonsListParams = parseReasonsListParams(input);
    const { rows, stale, generatedAt } = await getMonthRows(params.year, params.kind, forceRefresh);
    return buildReasonsList(rows, params, { generatedAt, stale });
}
