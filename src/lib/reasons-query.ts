/**
 * QC Reasons list + detail — READ-ONLY aggregates.
 * SELECT / GROUP BY only. Never INSERT / UPDATE / DELETE / MERGE against the database.
 */
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { C1_SPECIAL_REASON_SQL_EXCLUDE, CATEGORY_SQL_TOKEN, buildSubTypSql } from '@/lib/defect-category-sql';
import { getAppDataDir } from '@/lib/daily-report-automation-settings';
import {
    buildReasonsDetail,
    buildReasonsList,
    buildReasonsRatePareto,
    buildReasonsStratify,
    classifyReasonsTone,
    formatGeneratedAt,
    formatReasonsCodewareLabel,
    parseReasonsDetailParams,
    parseReasonsYearParam,
    yearsForReasonsParam,
    parseReasonsKind,
    parseReasonsFamily,
    parseReasonsTone,
    parseReasonsCp,
    parseReasonsGroups,
    parseReasonsForming,
    parseReasonsGlaze,
    reasonsRowsFromMixPayload,
    parseReasonsListParams,
    yearQueryWindow,
    reasonsYearOptions,
    mergeReasonsYearDetails,
    mergeReasonsYearOverviews,
    reasonsGroupOptions,
    yearCompareSeries,
    yearStatFromTotals,
    REASONS_MIN_CE_YEAR,
    type ReasonsDetailParams,
    type ReasonsDetailQueryInput,
    type ReasonsDetailResponse,
    type ReasonsOverviewResponse,
    buildReasonsOverview,
    type ReasonsDetailRow,
    type ReasonsKind,
    type ReasonsListParams,
    type ReasonsListResponse,
    type ReasonsMonthRow,
    type ReasonsProdRow,
    type ReasonsQueryInput,
} from '@/lib/reasons';
import { mergeSumByKeys, querySortSources } from '@/lib/sort-query';
import { bindIsoDate } from '@/lib/sql-params';
import { SORT_VIEW_TOKEN, sourcesForCategory } from '@/lib/sort-source';
import { toFiniteNumber } from '@/lib/utils';
import { loadGlazePtGroupMap } from '@/lib/glaze-pt-group';
import { displayCp, qtyProcResolveGroup } from '@/lib/qtyproc';
import { getQtyProcResponse } from '@/lib/qtyproc-server';

const CATEGORY = 'ALL';
const CACHE_VERSION = 'v9';
const FRESH_MS = 10 * 60 * 1000;
const CP_SQL = `(
                UPPER(RTRIM(LTRIM(ISNULL(m_cp, '')))) IN (N'C', N'C1', N'CS', N'C(FRIT&BOM)')
                OR UPPER(RTRIM(LTRIM(ISNULL(m_cp, '')))) LIKE 'P[1-5]%'
            )`;
/** Mix C1 = somboon user + CP C. SELECT-only — no database objects are changed. */
const IS_ROUND1_SQL = `CASE WHEN LOWER(RTRIM(LTRIM(ISNULL(m_user, '')))) LIKE 'somboon%' THEN 1 ELSE 0 END`;
const IS_ROUND1_JOB_SQL = `MAX(CASE WHEN LOWER(RTRIM(LTRIM(ISNULL(m_user, '')))) LIKE 'somboon%' THEN 1 ELSE 0 END)`;

function reasonsDisplayCp(row: Record<string, unknown>): string {
    return displayCp(String(row.cp || '').trim(), toFiniteNumber(row.is_round1));
}

const PART_FAMILY_SQL = `CASE
                WHEN m_part LIKE '143%' THEN '143'
                WHEN m_part LIKE '142%' THEN '142'
                ELSE 'other'
            END`;
const UNIT_TONE_SQL = `CASE
                WHEN RTRIM(LTRIM(ISNULL(unit, ''))) LIKE 'W5240%' THEN 'W5240'
                WHEN RTRIM(LTRIM(ISNULL(unit, ''))) LIKE 'W5241%' THEN 'W5241'
                ELSE ''
            END`;

type CacheEntry = {
    at: number;
    key: string;
    defects: ReasonsMonthRow[];
    prods: ReasonsProdRow[];
};

const memCache = new Map<string, CacheEntry>();
const rebuildInflight = new Map<string, Promise<CacheEntry>>();
const prodRebuildInflight = new Map<number, Promise<ReasonsProdRow[]>>();

function cacheKey(year: number, kind: ReasonsKind): string {
    return `${CACHE_VERSION}|${year}|${kind}`;
}

function cacheFilePath(key: string): string {
    const safe = key.replace(/[^a-zA-Z0-9._-]+/g, '_');
    return path.join(getAppDataDir(), 'data', `reasons-cache-${safe}.json`);
}

function isMonthRow(row: unknown): row is ReasonsMonthRow {
    if (!row || typeof row !== 'object') return false;
    const item = row as Partial<ReasonsMonthRow>;
    return typeof item.rsn === 'string' && typeof item.mo === 'number' && typeof item.qty === 'number';
}

function isProdRow(row: unknown): row is ReasonsProdRow {
    if (!row || typeof row !== 'object') return false;
    const item = row as Partial<ReasonsProdRow>;
    return typeof item.mo === 'number' && typeof item.qtyproc === 'number';
}

async function readDiskCache(key: string): Promise<CacheEntry | null> {
    try {
        const parsed = JSON.parse(await readFile(cacheFilePath(key), 'utf8')) as CacheEntry;
        if (
            parsed?.at
            && parsed.key === key
            && Array.isArray(parsed.defects)
            && parsed.defects.every(isMonthRow)
            && Array.isArray(parsed.prods)
            && parsed.prods.every(isProdRow)
        ) {
            return parsed;
        }
    } catch {
        /* no disk cache */
    }
    return null;
}

function writeDiskCache(entry: CacheEntry) {
    mkdir(path.dirname(cacheFilePath(entry.key)), { recursive: true })
        .then(() => writeFile(cacheFilePath(entry.key), JSON.stringify(entry), 'utf8'))
        .catch(() => { /* ignore cache write errors */ });
}

function mapMonthRows(rows: Record<string, unknown>[]): ReasonsMonthRow[] {
    return mergeSumByKeys(
        rows.map((row) => ({
            rsn: String(row.rsn || '').trim(),
            mo: toFiniteNumber(row.mo),
            qty: toFiniteNumber(row.qty),
            tone: classifyReasonsTone({
                source: String(row._source || ''),
                partFamily: String(row.part_family || ''),
                unitTone: String(row.unit_tone || ''),
            }),
            desc1: String(row.desc1 || '').trim(),
            desc2: String(row.desc2 || '').trim(),
            cp: reasonsDisplayCp(row),
            mPart: String(row.m_part || '').trim(),
        })),
        ['rsn', 'mo', 'tone', 'desc1', 'desc2', 'cp', 'mPart'],
        ['qty'],
    )
        .map((row) => ({
            rsn: row.rsn,
            mo: row.mo,
            qty: row.qty,
            tone: row.tone,
            desc1: row.desc1,
            desc2: row.desc2,
            cp: row.cp,
            mPart: row.mPart,
        }))
        .filter((row) => row.rsn && row.qty > 0 && row.mo >= 1 && row.mo <= 12);
}

function mapProdRows(rows: Record<string, unknown>[]): ReasonsProdRow[] {
    return mergeSumByKeys(
        rows.map((row) => ({
            mo: toFiniteNumber(row.mo),
            qtyproc: toFiniteNumber(row.qtyproc),
            tone: classifyReasonsTone({
                source: String(row._source || ''),
                partFamily: String(row.part_family || ''),
                unitTone: String(row.unit_tone || ''),
            }),
            desc1: String(row.desc1 || '').trim(),
            desc2: String(row.desc2 || '').trim(),
            cp: reasonsDisplayCp(row),
            mPart: String(row.m_part || '').trim(),
        })),
        ['mo', 'tone', 'desc1', 'desc2', 'cp', 'mPart'],
        ['qtyproc'],
    )
        .map((row) => ({
            mo: row.mo,
            qtyproc: row.qtyproc,
            tone: row.tone,
            desc1: row.desc1,
            desc2: row.desc2,
            cp: row.cp,
            mPart: row.mPart,
        }))
        .filter((row) => row.qtyproc > 0 && row.mo >= 1 && row.mo <= 12);
}

async function stampReasonsGroups<T extends { mPart?: string; group?: string; groupLabel?: string }>(rows: T[]): Promise<T[]> {
    if (!rows.length) return rows;
    const map = await loadGlazePtGroupMap();
    for (const row of rows) {
        const info = qtyProcResolveGroup(row.mPart, map);
        row.group = info.code;
        row.groupLabel = info.name;
    }
    return rows;
}

function queryOpts(start: string, endExcl: string) {
    return {
        sources: sourcesForCategory(CATEGORY),
        category: CATEGORY,
        kilnDirect: true as const,
        bind: (req: Parameters<typeof bindIsoDate>[0]) => {
            bindIsoDate(req, 'startDate', start);
            bindIsoDate(req, 'endDate', endExcl);
        },
    };
}

/** Year x kind monthly defect qty by rsn, tone, codeware, cp. */
export async function queryReasonsMonthRows(year: number, kind: ReasonsKind): Promise<ReasonsMonthRow[]> {
    const { start, endExcl } = yearQueryWindow(year);
    const subTypSql = buildSubTypSql(kind);
    const result = await querySortSources<{
        rsn: string;
        mo: number;
        part_family: string;
        unit_tone: string;
        desc1: string;
        desc2: string;
        cp: string;
        is_round1: number;
        m_part: string;
        qty: number;
    }>(
        `
            SELECT
                RTRIM(LTRIM(rsn_desc)) AS rsn,
                MONTH(m_date) AS mo,
                ${PART_FAMILY_SQL} AS part_family,
                ${UNIT_TONE_SQL} AS unit_tone,
                RTRIM(LTRIM(ISNULL(pt_desc1, ''))) AS desc1,
                RTRIM(LTRIM(ISNULL(pt_desc2, ''))) AS desc2,
                UPPER(RTRIM(LTRIM(ISNULL(m_cp, '')))) AS cp,
                ${IS_ROUND1_SQL} AS is_round1,
                RTRIM(LTRIM(ISNULL(m_part, ''))) AS m_part,
                SUM(sub_qty) AS qty
            FROM ${SORT_VIEW_TOKEN} WITH (NOLOCK)
            WHERE m_date >= @startDate
                AND m_date < @endDate
                AND rsn_desc IS NOT NULL
                AND rsn_desc <> N''
                AND ${CATEGORY_SQL_TOKEN}
                AND ${C1_SPECIAL_REASON_SQL_EXCLUDE}
                AND ${subTypSql}
                AND ${CP_SQL}
            GROUP BY
                RTRIM(LTRIM(rsn_desc)),
                MONTH(m_date),
                ${PART_FAMILY_SQL},
                ${UNIT_TONE_SQL},
                RTRIM(LTRIM(ISNULL(pt_desc1, ''))),
                RTRIM(LTRIM(ISNULL(pt_desc2, ''))),
                UPPER(RTRIM(LTRIM(ISNULL(m_cp, '')))),
                ${IS_ROUND1_SQL},
                RTRIM(LTRIM(ISNULL(m_part, '')))
            HAVING SUM(sub_qty) > 0
        `,
        queryOpts(start, endExcl),
    );

    return mapMonthRows(result.recordset as Record<string, unknown>[]);
}

/** Job-deduped qtyproc (MAX qtyp per job) by month, tone, codeware, cp. */
export async function queryReasonsProdRows(year: number): Promise<ReasonsProdRow[]> {
    const { start, endExcl } = yearQueryWindow(year);
    const result = await querySortSources<{
        mo: number;
        part_family: string;
        unit_tone: string;
        desc1: string;
        desc2: string;
        cp: string;
        is_round1: number;
        m_part: string;
        qtyproc: number;
    }>(
        `
            SELECT
                mo,
                part_family,
                unit_tone,
                desc1,
                desc2,
                cp,
                is_round1,
                m_part,
                SUM(qtyproc) AS qtyproc
            FROM (
                SELECT
                    MONTH(m_date) AS mo,
                    ${PART_FAMILY_SQL} AS part_family,
                    ${UNIT_TONE_SQL} AS unit_tone,
                    MAX(RTRIM(LTRIM(ISNULL(pt_desc1, '')))) AS desc1,
                    MAX(RTRIM(LTRIM(ISNULL(pt_desc2, '')))) AS desc2,
                    UPPER(RTRIM(LTRIM(ISNULL(m_cp, '')))) AS cp,
                    ${IS_ROUND1_JOB_SQL} AS is_round1,
                    RTRIM(LTRIM(ISNULL(m_part, ''))) AS m_part,
                    MAX(ISNULL(qtyp, 0)) AS qtyproc
                FROM ${SORT_VIEW_TOKEN} WITH (NOLOCK)
                WHERE m_date >= @startDate
                    AND m_date < @endDate
                    AND ${CATEGORY_SQL_TOKEN}
                    AND ${CP_SQL}
                GROUP BY
                    m_date,
                    m_doc,
                    m_job,
                    m_kiln,
                    m_cp,
                    ${PART_FAMILY_SQL},
                    ${UNIT_TONE_SQL},
                    RTRIM(LTRIM(ISNULL(m_part, '')))
            ) jobs
            GROUP BY mo, part_family, unit_tone, desc1, desc2, cp, is_round1, m_part
            HAVING SUM(qtyproc) > 0
        `,
        queryOpts(start, endExcl),
    );

    return mapProdRows(result.recordset as Record<string, unknown>[]);
}

async function getProdRows(year: number, forceRefresh: boolean): Promise<ReasonsProdRow[]> {
    if (!forceRefresh) {
        const hit = memCache.get(cacheKey(year, 'scrap')) || memCache.get(cacheKey(year, 'reject'));
        if (hit?.prods?.length) {
            const age = Date.now() - hit.at;
            if (age <= FRESH_MS) return hit.prods;
        }
        const inflight = prodRebuildInflight.get(year);
        if (inflight) return inflight;
    }
    const inflight = prodRebuildInflight.get(year);
    if (inflight && !forceRefresh) return inflight;
    const promise = queryReasonsProdRows(year).finally(() => {
        if (prodRebuildInflight.get(year) === promise) prodRebuildInflight.delete(year);
    });
    prodRebuildInflight.set(year, promise);
    return promise;
}

async function loadMonthRows(year: number, kind: ReasonsKind, forceRefresh = false): Promise<CacheEntry> {
    const key = cacheKey(year, kind);
    const t0 = Date.now();
    const [rawDefects, rawProds] = await Promise.all([
        queryReasonsMonthRows(year, kind),
        getProdRows(year, forceRefresh),
    ]);
    const [defects, prods] = await Promise.all([
        stampReasonsGroups(rawDefects),
        stampReasonsGroups(rawProds),
    ]);
    console.info(
        `[reasons] ${Date.now() - t0}ms year=${year} kind=${kind} defects=${defects.length} prods=${prods.length}`,
    );
    const entry = { at: Date.now(), key, defects, prods };
    memCache.set(key, entry);
    writeDiskCache(entry);
    return entry;
}

function rebuild(year: number, kind: ReasonsKind, forceRefresh = false): Promise<CacheEntry> {
    const key = cacheKey(year, kind);
    const inflight = rebuildInflight.get(key);
    if (inflight) return inflight;
    const promise = loadMonthRows(year, kind, forceRefresh).finally(() => {
        rebuildInflight.delete(key);
    });
    rebuildInflight.set(key, promise);
    return promise;
}

async function getMonthRows(
    year: number,
    kind: ReasonsKind,
    forceRefresh: boolean,
): Promise<{ defects: ReasonsMonthRow[]; prods: ReasonsProdRow[]; stale: boolean; generatedAt: string }> {
    const key = cacheKey(year, kind);
    const pack = (entry: CacheEntry, stale: boolean) => ({
        defects: entry.defects,
        prods: entry.prods,
        stale,
        generatedAt: formatGeneratedAt(new Date(entry.at)),
    });
    if (forceRefresh) {
        return pack(await rebuild(year, kind, true), false);
    }

    const cached = memCache.get(key);
    if (cached) {
        const age = Date.now() - cached.at;
        if (age > FRESH_MS) void rebuild(year, kind);
        return pack(cached, age > FRESH_MS);
    }

    const disk = await readDiskCache(key);
    if (disk) {
        memCache.set(key, disk);
        const age = Date.now() - disk.at;
        if (age > FRESH_MS) void rebuild(year, kind);
        return pack(disk, age > FRESH_MS);
    }

    return pack(await rebuild(year, kind), false);
}

async function getYearKindRows(
    year: number,
    kind: ReasonsKind,
    family: string,
    forceRefresh: boolean,
): Promise<{ defects: ReasonsMonthRow[]; prods: ReasonsProdRow[]; stale: boolean; generatedAt: string }> {
    if (family === 'ww') {
        const mix = await getQtyProcResponse(forceRefresh);
        const { defects, prods } = reasonsRowsFromMixPayload(mix, year, kind);
        return {
            defects,
            prods,
            stale: Boolean(mix.stale || mix.reasonsPending),
            generatedAt: mix.generatedAt || formatGeneratedAt(),
        };
    }
    return getMonthRows(year, kind, forceRefresh);
}

export async function getReasonsListResponse(
    input: ReasonsQueryInput,
    forceRefresh = false,
): Promise<ReasonsListResponse> {
    const params: ReasonsListParams = parseReasonsListParams(input);
    const { defects, stale, generatedAt } = await getMonthRows(params.year, params.kind, forceRefresh);
    return buildReasonsList(defects, params, { generatedAt, stale });
}

type DetailCacheEntry = {
    at: number;
    key: string;
    rows: ReasonsDetailRow[];
};

const detailMemCache = new Map<string, DetailCacheEntry>();
const detailRebuildInflight = new Map<string, Promise<DetailCacheEntry>>();

function detailCacheKey(year: number, kind: ReasonsKind, rsn: string): string {
    return `${CACHE_VERSION}|detail|${year}|${kind}|${rsn}`;
}

function mapDetailRows(rows: Record<string, unknown>[]): ReasonsDetailRow[] {
    return mergeSumByKeys(
        rows.map((row) => {
            const desc1 = String(row.code || '').trim();
            const desc2 = String(row.code2 || '').trim();
            const mPart = String(row.m_part || '').trim();
            const tone = classifyReasonsTone({
                source: String(row._source || ''),
                partFamily: String(row.part_family || ''),
                unitTone: String(row.unit_tone || ''),
                mPart,
            });
            return {
                mo: toFiniteNumber(row.mo),
                code: formatReasonsCodewareLabel({
                    pt_desc1: desc1,
                    pt_desc2: desc2,
                    m_part: mPart,
                    tone,
                }),
                qty: toFiniteNumber(row.qty),
                tone,
                desc1,
                desc2,
                cp: reasonsDisplayCp(row),
                mPart,
            };
        }),
        ['mo', 'code', 'tone', 'cp', 'mPart'],
        ['qty'],
    )
        .map((row) => ({
            mo: row.mo,
            code: row.code,
            qty: row.qty,
            tone: row.tone,
            desc1: row.desc1,
            desc2: row.desc2,
            cp: row.cp,
            mPart: row.mPart,
        }))
        .filter((row) => row.qty > 0 && row.mo >= 1 && row.mo <= 12);
}

/**
 * One aggregated query for Focus codeware: month × tone × codeware × cp for a single rsn.
 * Mix filters are applied in memory from the year × kind cache.
 */
export async function queryReasonsDetailRows(
    year: number,
    kind: ReasonsKind,
    rsn: string,
): Promise<ReasonsDetailRow[]> {
    const { start, endExcl } = yearQueryWindow(year);
    const subTypSql = buildSubTypSql(kind);
    const sources = sourcesForCategory(CATEGORY);

    const result = await querySortSources<{
        mo: number;
        part_family: string;
        unit_tone: string;
        code: string;
        code2: string;
        cp: string;
        is_round1: number;
        m_part: string;
        qty: number;
    }>(
        `
            SELECT
                MONTH(m_date) AS mo,
                ${PART_FAMILY_SQL} AS part_family,
                ${UNIT_TONE_SQL} AS unit_tone,
                RTRIM(LTRIM(ISNULL(pt_desc1, ''))) AS code,
                RTRIM(LTRIM(ISNULL(pt_desc2, ''))) AS code2,
                UPPER(RTRIM(LTRIM(ISNULL(m_cp, '')))) AS cp,
                ${IS_ROUND1_SQL} AS is_round1,
                RTRIM(LTRIM(ISNULL(m_part, ''))) AS m_part,
                SUM(sub_qty) AS qty
            FROM ${SORT_VIEW_TOKEN} WITH (NOLOCK)
            WHERE m_date >= @startDate
                AND m_date < @endDate
                AND RTRIM(LTRIM(rsn_desc)) = @rsn
                AND ${CATEGORY_SQL_TOKEN}
                AND ${C1_SPECIAL_REASON_SQL_EXCLUDE}
                AND ${subTypSql}
                AND ${CP_SQL}
            GROUP BY
                MONTH(m_date),
                ${PART_FAMILY_SQL},
                ${UNIT_TONE_SQL},
                RTRIM(LTRIM(ISNULL(pt_desc1, ''))),
                RTRIM(LTRIM(ISNULL(pt_desc2, ''))),
                UPPER(RTRIM(LTRIM(ISNULL(m_cp, '')))),
                ${IS_ROUND1_SQL},
                RTRIM(LTRIM(ISNULL(m_part, '')))
            HAVING SUM(sub_qty) > 0
        `,
        {
            sources,
            category: CATEGORY,
            kilnDirect: true,
            bind: (req) => {
                bindIsoDate(req, 'startDate', start);
                bindIsoDate(req, 'endDate', endExcl);
                req.input('rsn', rsn);
            },
        },
    );

    return mapDetailRows(result.recordset as Record<string, unknown>[]);
}

async function loadDetailRows(year: number, kind: ReasonsKind, rsn: string): Promise<DetailCacheEntry> {
    const key = detailCacheKey(year, kind, rsn);
    const t0 = Date.now();
    const rows = await stampReasonsGroups(await queryReasonsDetailRows(year, kind, rsn));
    console.info(`[reasons-detail] ${Date.now() - t0}ms year=${year} kind=${kind} buckets=${rows.length}`);
    const entry = { at: Date.now(), key, rows };
    detailMemCache.set(key, entry);
    return entry;
}

function rebuildDetail(year: number, kind: ReasonsKind, rsn: string): Promise<DetailCacheEntry> {
    const key = detailCacheKey(year, kind, rsn);
    const inflight = detailRebuildInflight.get(key);
    if (inflight) return inflight;
    const promise = loadDetailRows(year, kind, rsn).finally(() => {
        detailRebuildInflight.delete(key);
    });
    detailRebuildInflight.set(key, promise);
    return promise;
}

async function getDetailRows(
    year: number,
    kind: ReasonsKind,
    rsn: string,
    forceRefresh: boolean,
): Promise<{ rows: ReasonsDetailRow[]; stale: boolean; generatedAt: string }> {
    const key = detailCacheKey(year, kind, rsn);
    if (forceRefresh) {
        const fresh = await rebuildDetail(year, kind, rsn);
        return { rows: fresh.rows, stale: false, generatedAt: formatGeneratedAt(new Date(fresh.at)) };
    }

    const cached = detailMemCache.get(key);
    if (cached) {
        const age = Date.now() - cached.at;
        if (age > FRESH_MS) void rebuildDetail(year, kind, rsn);
        if (cached.rows.some((row) => !row.group)) {
            await stampReasonsGroups(cached.rows);
        }
        return {
            rows: cached.rows,
            stale: age > FRESH_MS,
            generatedAt: formatGeneratedAt(new Date(cached.at)),
        };
    }

    const fresh = await rebuildDetail(year, kind, rsn);
    return { rows: fresh.rows, stale: false, generatedAt: formatGeneratedAt(new Date(fresh.at)) };
}

function withFocusQc(payload: ReasonsDetailResponse, codeRows: ReasonsDetailRow[]): ReasonsDetailResponse {
    const tone = payload.meta?.tone;
    const sliced = tone && tone !== 'all'
        ? codeRows.filter((row) => row.tone === tone)
        : codeRows;
    const pool = payload.paretoCodeware?.length ? payload.paretoCodeware : (payload.codeware || []);
    payload.paretoCodeware = pool;
    payload.pareto = buildReasonsRatePareto(pool);
    payload.stratify = buildReasonsStratify(sliced);
    return payload;
}
export async function getReasonsDetailResponse(
    input: ReasonsDetailQueryInput,
    forceRefresh = false,
): Promise<ReasonsDetailResponse> {
    const params: ReasonsDetailParams = parseReasonsDetailParams(input);
    if (!params.rsn) {
        throw new Error('rsn is required');
    }
    const years = yearsForReasonsParam(params.year);
    const packs = await Promise.all(years.map(async (year) => {
        const useMixProds = params.family === 'ww';
        const [month, detail, sqlMonth] = await Promise.all([
            getYearKindRows(year, params.kind, params.family, forceRefresh),
            getDetailRows(year, params.kind, params.rsn, forceRefresh),
            useMixProds ? getMonthRows(year, params.kind, forceRefresh) : Promise.resolve(null),
        ]);
        const codeProds = sqlMonth?.prods;
        const payload = buildReasonsDetail(month.defects, detail.rows, month.prods, { ...params, year }, {
            generatedAt: month.generatedAt,
            stale: month.stale || detail.stale,
            codeProds,
        });
        payload.groupOptions = reasonsGroupOptions(month.defects);
        return { year, month, detail, codeProds, payload: withFocusQc(payload, detail.rows) };
    }));
    const stale = packs.some((pack) => pack.month.stale || pack.detail.stale);
    const generatedAt = packs[0]?.month.generatedAt;
    if (packs.length === 1) {
        return packs[0].payload;
    }
    const combined = buildReasonsDetail(
        packs.flatMap((pack) => pack.month.defects),
        packs.flatMap((pack) => pack.detail.rows),
        packs.flatMap((pack) => pack.month.prods),
        { ...params, year: 'all' },
        {
            generatedAt,
            stale,
            codeProds: packs.flatMap((pack) => pack.codeProds || []),
        },
    );
    combined.groupOptions = reasonsGroupOptions(packs.flatMap((pack) => pack.month.defects));
    return withFocusQc(mergeReasonsYearDetails(
        packs.map((pack) => ({ year: pack.year, payload: pack.payload })),
        combined,
    ), packs.flatMap((pack) => pack.detail.rows));
}

export async function getReasonsOverviewResponse(
    input: {
        year?: string | null;
        kind?: string | null;
        family?: string | null;
        tone?: string | null;
        cp?: string | null;
        group?: string | null;
        forming?: string | null;
        glaze?: string | null;
    },
    forceRefresh = false,
): Promise<ReasonsOverviewResponse> {
    const yearParam = parseReasonsYearParam(input.year);
    const years = yearsForReasonsParam(yearParam);
    const kind = parseReasonsKind(input.kind);
    const family = parseReasonsFamily(input.family);
    const tone = parseReasonsTone(family, input.tone);
    const cp = parseReasonsCp(input.cp);
    const group = parseReasonsGroups(input.group);
    const forming = parseReasonsForming(input.forming);
    const glaze = parseReasonsGlaze(input.glaze);
    const mix = { kind, family, tone, cp, group, forming, glaze };
    const packs = await Promise.all(years.map(async (year) => {
        const month = await getYearKindRows(year, kind, family, forceRefresh);
        const payload = buildReasonsOverview(
            month.defects,
            month.prods,
            { year, ...mix },
            { generatedAt: month.generatedAt, stale: month.stale },
        );
        payload.groupOptions = reasonsGroupOptions(month.defects);
        return { year, month, payload };
    }));
    if (packs.length === 1) {
        const current = packs[0];
        const prevYear = current.year - 1;
        if (prevYear >= REASONS_MIN_CE_YEAR) {
            const prevMonth = await getYearKindRows(prevYear, kind, family, forceRefresh);
            const prevPayload = buildReasonsOverview(
                prevMonth.defects,
                prevMonth.prods,
                { year: prevYear, ...mix },
                { generatedAt: prevMonth.generatedAt, stale: prevMonth.stale },
            );
            current.payload.compare = [
                ...(current.payload.compare || []),
                ...yearCompareSeries([
                    { year: current.year, trend: current.payload.trend || [] },
                    { year: prevYear, trend: prevPayload.trend || [] },
                ]),
            ];
            current.payload.yearStats = [
                yearStatFromTotals(current.year, current.payload.meta.qty, current.payload.meta.qtyproc, 0),
                yearStatFromTotals(prevYear, prevPayload.meta.qty, prevPayload.meta.qtyproc, 1),
            ];
            if (prevMonth.stale) current.payload.meta.stale = true;
        }
        return current.payload;
    }
    const stale = packs.some((pack) => pack.month.stale);
    const combined = buildReasonsOverview(
        packs.flatMap((pack) => pack.month.defects),
        packs.flatMap((pack) => pack.month.prods),
        { year: 'all', ...mix },
        { generatedAt: packs[0]?.month.generatedAt, stale },
    );
    const merged = mergeReasonsYearOverviews(
        packs.map((pack) => ({ year: pack.year, payload: pack.payload })),
        combined,
    );
    merged.groupOptions = reasonsGroupOptions(packs.flatMap((pack) => pack.month.defects));
    return merged;
}

export function warmReasonsCache() {
    for (const year of reasonsYearOptions()) {
        void getMonthRows(year, 'scrap', false).catch((err) => {
            console.error('[reasons] warm failed:', err);
        });
    }
}
