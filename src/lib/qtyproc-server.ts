import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { C1_SPECIAL_REASON_SQL } from '@/lib/c1-special-reason';
import { getAppDataDir } from '@/lib/daily-report-automation-settings';
import { CATEGORY_SQL_TOKEN } from '@/lib/defect-category-sql';
import {
    buildQtyProcPayload,
    qtyProcToneFromUnit,
    QTYPROC_CE_YEARS,
    QTYPROC_DISPLAY_BE_YEARS,
    QTYPROC_END_EXCL,
    QTYPROC_START,
    type QtyProcJobRow,
    type QtyProcPayload,
} from '@/lib/qtyproc';
import { querySortSources } from '@/lib/sort-query';
import { getCategoryLabel, SORT_VIEW_TOKEN } from '@/lib/sort-source';
import { toFiniteNumber } from '@/lib/utils';

export type QtyProcApiPayload = QtyProcPayload & {
    fromCache?: boolean;
    stale?: boolean;
};

type CacheEntry = { at: number; key?: string; payload: QtyProcPayload };

const memCache = new Map<string, CacheEntry>();
const FRESH_MS = 30 * 60 * 1000;
const CACHE_KEY = 'WW|ALL|v16';

let rebuildInflight: Promise<CacheEntry> | null = null;

function cacheFilePath() {
    return path.join(getAppDataDir(), 'data', 'qtyproc-cache.json');
}

function pickNum(row: Record<string, unknown>, names: string[]): number {
    const lower = new Map(Object.entries(row).map(([key, val]) => [key.toLowerCase(), val]));
    for (const name of names) {
        const raw = lower.get(name.toLowerCase());
        if (raw == null || raw === '') continue;
        const n = toFiniteNumber(raw);
        if (Number.isFinite(n) && n !== 0) return n;
        const fromStr = Number(String(raw).replace(/,/g, ''));
        if (Number.isFinite(fromStr)) return fromStr;
        if (n === 0) return 0;
    }
    return 0;
}

function pickStr(row: Record<string, unknown>, names: string[], fallback = ''): string {
    const lower = new Map(Object.entries(row).map(([key, val]) => [key.toLowerCase(), val]));
    for (const name of names) {
        const raw = lower.get(name.toLowerCase());
        if (raw == null || raw === '') continue;
        return String(raw);
    }
    return fallback;
}

function payloadHasMixTone(payload: QtyProcPayload): boolean {
    return (payload.mix || []).some((row) => {
        const tone = String(row.tone || '').toUpperCase();
        return tone === 'WHITE' || tone === 'BLACK';
    });
}

function payloadHasMixCustomer(payload: QtyProcPayload): boolean {
    return (payload.mix || []).some((row) => typeof row.customer === 'string');
}

function payloadHasMixGlaze(payload: QtyProcPayload): boolean {
    return (payload.mix || []).some((row) => typeof row.glaze === 'string');
}

function payloadHasCustomC(payload: QtyProcPayload): boolean {
    return Object.values(payload.byYear || {}).some((block) => typeof block.customC === 'number');
}

function jobsSql(start: string, endExcl: string) {
    return `
        SELECT
            ce_year,
            mo,
            m_cp,
            is_round1,
            pt_desc1,
            pt_desc2,
            unit,
            SUM(qtyp) AS qtyp,
            SUM(qtycomp) AS qtycomp,
            SUM(qtyscrp) AS qtyscrp,
            SUM(qtyrjct) AS qtyrjct,
            SUM(c1_adj) AS c1_adj,
            SUM(jobs) AS jobs
        FROM (
            SELECT
                YEAR(m_date) AS ce_year,
                MONTH(m_date) AS mo,
                m_cp,
                MAX(CASE WHEN m_user LIKE 'somboon%' THEN 1 ELSE 0 END) AS is_round1,
                MAX(qtyp) AS qtyp,
                MAX(ISNULL(qtycomp, 0)) AS qtycomp,
                MAX(ISNULL(qtyscrp, 0)) AS qtyscrp,
                MAX(ISNULL(qtyrjct, 0)) AS qtyrjct,
                SUM(CASE
                    WHEN LOWER(RTRIM(LTRIM(m_user))) LIKE 'somboon%'
                     AND UPPER(RTRIM(LTRIM(m_cp))) = 'C'
                     AND ${C1_SPECIAL_REASON_SQL}
                    THEN ISNULL(sub_qty, 0) ELSE 0
                END) AS c1_adj,
                MAX(RTRIM(LTRIM(pt_desc1))) AS pt_desc1,
                MAX(RTRIM(LTRIM(ISNULL(pt_desc2, '')))) AS pt_desc2,
                MAX(RTRIM(LTRIM(ISNULL(unit, '')))) AS unit,
                1 AS jobs
            FROM ${SORT_VIEW_TOKEN} WITH (NOLOCK)
            WHERE m_date >= '${start}' AND m_date < '${endExcl}'
              AND ${CATEGORY_SQL_TOKEN}
              AND (
                    m_cp IN ('C', 'C1', 'CS', 'C(FRIT&BOM)', 'P1', 'P2', 'P3', 'P4', 'P5')
                    OR UPPER(RTRIM(LTRIM(m_cp))) LIKE 'P[1-5]%'
              )
            GROUP BY
                m_date,
                m_doc,
                m_job,
                m_kiln,
                m_cp
        ) jobs
        GROUP BY
            ce_year, mo, m_cp, is_round1, pt_desc1, pt_desc2, unit
    `;
}

function mapJobRows(recordset: Record<string, unknown>[]): QtyProcJobRow[] {
    return recordset.map((row) => {
        const adj = pickNum(row, ['c1_adj']);
        const qtycomp = pickNum(row, ['qtycomp', 'comp']);
        const qtyrjct = pickNum(row, ['qtyrjct', 'reject']);
        return {
            ce_year: pickNum(row, ['ce_year']),
            mo: pickNum(row, ['mo']),
            m_cp: pickStr(row, ['m_cp']),
            is_round1: pickNum(row, ['is_round1']),
            pt_desc1: pickStr(row, ['pt_desc1']),
            pt_desc2: pickStr(row, ['pt_desc2']),
            tone: qtyProcToneFromUnit(pickStr(row, ['unit'])) || pickStr(row, ['tone'], 'NA') || 'NA',
            qtyp: pickNum(row, ['qtyp']),
            qtycomp: qtycomp + adj,
            qtyscrp: pickNum(row, ['qtyscrp', 'scrap']),
            qtyrjct: Math.max(0, qtyrjct - adj),
            jobs: pickNum(row, ['jobs']),
        };
    });
}

async function queryKiln(): Promise<QtyProcPayload> {
    const t0 = Date.now();
    const yearResults = await Promise.all(
        QTYPROC_CE_YEARS.map((ce) =>
            querySortSources<Record<string, unknown>>(jobsSql(`${ce}-01-01`, `${ce + 1}-01-01`), {
                sources: ['kilndb'],
                required: true,
                category: 'WW',
            }),
        ),
    );
    const jobRows = mapJobRows(yearResults.flatMap((part) => part.recordset));
    const payload = buildQtyProcPayload(
        jobRows,
        {
            min: QTYPROC_START,
            max: new Date().toISOString().slice(0, 10),
        },
        `${getCategoryLabel('WW')} · Standard / FRIT / BOM / P1–P5 · ปี ${QTYPROC_DISPLAY_BE_YEARS[0]}–${QTYPROC_DISPLAY_BE_YEARS[QTYPROC_DISPLAY_BE_YEARS.length - 1]}`,
    );
    const y2567 = payload.byYear['2567'];
    console.info(
        `[qtyproc] ${Date.now() - t0}ms category=WW rows=${jobRows.length} ` +
        `comp=${y2567?.qtycomp || 0} scrap=${y2567?.qtyscrp || 0} reject=${y2567?.qtyrjct || 0} frit=${y2567?.frit || 0} bom=${y2567?.bom || 0} ` +
        `p1=${y2567?.p1 || 0} p2=${y2567?.p2 || 0} p3=${y2567?.p3 || 0} p4=${y2567?.p4 || 0} p5=${y2567?.p5 || 0}`,
    );
    return payload;
}

async function readDiskCache(): Promise<CacheEntry | null> {
    try {
        const parsed = JSON.parse(await readFile(cacheFilePath(), 'utf8')) as CacheEntry;
        if (parsed?.at && parsed?.payload?.byYear && parsed.key === CACHE_KEY) return parsed;
    } catch {
        /* no disk cache */
    }
    return null;
}

function writeDiskCache(entry: CacheEntry) {
    mkdir(path.dirname(cacheFilePath()), { recursive: true })
        .then(() => writeFile(cacheFilePath(), JSON.stringify(entry), 'utf8'))
        .catch(() => { /* ignore cache write errors */ });
}

function remember(entry: CacheEntry) {
    memCache.set(CACHE_KEY, entry);
    writeDiskCache(entry);
}

function rebuildCache(): Promise<CacheEntry> {
    if (rebuildInflight) return rebuildInflight;
    rebuildInflight = queryKiln()
        .then((payload) => {
            const entry = { at: Date.now(), key: CACHE_KEY, payload };
            remember(entry);
            return entry;
        })
        .finally(() => {
            rebuildInflight = null;
        });
    return rebuildInflight;
}

function withMeta(entry: CacheEntry, fromCache: boolean): QtyProcApiPayload {
    const age = Date.now() - entry.at;
    return {
        ...entry.payload,
        fromCache,
        stale: fromCache && age > FRESH_MS,
    };
}

export async function getQtyProcResponse(forceRefresh = false): Promise<QtyProcApiPayload> {
    if (forceRefresh) {
        return withMeta(await rebuildCache(), false);
    }

    const mem = memCache.get(CACHE_KEY);
    if (mem && payloadHasMixTone(mem.payload) && payloadHasMixCustomer(mem.payload) && payloadHasMixGlaze(mem.payload) && payloadHasCustomC(mem.payload)) {
        if (Date.now() - mem.at > FRESH_MS) void rebuildCache();
        return withMeta(mem, true);
    }

    const disk = await readDiskCache();
    if (disk && payloadHasMixTone(disk.payload) && payloadHasMixCustomer(disk.payload) && payloadHasMixGlaze(disk.payload) && payloadHasCustomC(disk.payload)) {
        remember(disk);
        if (Date.now() - disk.at > FRESH_MS) void rebuildCache();
        return withMeta(disk, true);
    }

    return withMeta(await rebuildCache(), false);
}

export function warmQtyProcCache() {
    void getQtyProcResponse(false).catch((err) => {
        console.error('[qtyproc] warm failed:', err);
    });
}

export { QTYPROC_END_EXCL };
