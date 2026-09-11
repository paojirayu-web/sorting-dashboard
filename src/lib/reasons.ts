/** QC Reasons list + detail contract. Pure helpers — no I/O. */

export const REASONS_MAX_PAGE_SIZE = 100;
export const REASONS_DEFAULT_PAGE_SIZE = 50;
export const REASONS_SPARK_MONTHS = 12;
export const REASONS_MIN_CE_YEAR = 2020;
export const REASONS_CODEWARE_TOP_N = 10;
export const REASONS_MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
/** Accepted on APIs for later slices — not shown in this PR's UI. */
export const REASONS_FUTURE_FILTER_KEYS = ['unit', 'shape', 'forming', 'customer', 'glaze', 'cp'] as const;

export type ReasonsKind = 'scrap' | 'reject';
export type ReasonsSort = 'qty' | 'pct';
export type ReasonsDir = 'asc' | 'desc';

export type ReasonsItem = {
    rsn: string;
    qty: number;
    pct: number;
    spark: number[];
};

export type ReasonsMeta = {
    total: number;
    page: number;
    pageSize: number;
    generatedAt: string;
    stale: boolean;
    selectedRsn?: string;
};

export type ReasonsListResponse = {
    items: ReasonsItem[];
    meta: ReasonsMeta;
};

export type ReasonsQueryInput = {
    year?: string | null;
    kind?: string | null;
    q?: string | null;
    page?: string | null;
    pageSize?: string | null;
    rsn?: string | null;
    sort?: string | null;
    dir?: string | null;
};

export type ReasonsTrendPoint = {
    mo: number;
    label: string;
    qty: number;
};

export type ReasonsCodewareItem = {
    code: string;
    qty: number;
    pct: number;
};

export type ReasonsDetailMeta = {
    generatedAt: string;
    stale: boolean;
    rsn: string;
    year: number;
    kind: ReasonsKind;
    qty: number;
};

export type ReasonsDetailResponse = {
    trend: ReasonsTrendPoint[];
    codeware: ReasonsCodewareItem[];
    meta: ReasonsDetailMeta;
};

export type ReasonsDetailQueryInput = {
    rsn?: string | null;
    year?: string | null;
    kind?: string | null;
    unit?: string | null;
    shape?: string | null;
    forming?: string | null;
    customer?: string | null;
    glaze?: string | null;
    cp?: string | null;
};

export type ReasonsDetailParams = {
    rsn: string;
    year: number;
    kind: ReasonsKind;
    /** Stored for a later filter slice; ignored by this PR's query. */
    unit: string;
    shape: string;
    forming: string;
    customer: string;
    glaze: string;
    cp: string;
};

export type ReasonsDetailRow = {
    mo: number;
    code: string;
    qty: number;
};

export type ReasonsListParams = {
    year: number;
    kind: ReasonsKind;
    q: string;
    page: number;
    pageSize: number;
    rsn: string;
    sort: ReasonsSort;
    dir: ReasonsDir;
};

export type ReasonsMonthRow = {
    rsn: string;
    mo: number;
    qty: number;
};

export function bangkokNow(): Date {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
}

export function latestReasonsYear(now: Date = bangkokNow()): number {
    return now.getFullYear();
}

export function reasonsYearOptions(now: Date = bangkokNow()): number[] {
    const latest = latestReasonsYear(now);
    const years: number[] = [];
    for (let year = latest; year >= REASONS_MIN_CE_YEAR; year -= 1) {
        years.push(year);
        if (years.length >= 4) break;
    }
    return years;
}

/** Accept CE (2026) or BE (2569). */
export function parseReasonsYear(raw: string | null | undefined, now: Date = bangkokNow()): number {
    const latest = latestReasonsYear(now);
    if (raw == null || String(raw).trim() === '') return latest;
    const n = Number(String(raw).trim());
    if (!Number.isFinite(n) || !Number.isInteger(n)) return latest;
    const ce = n >= 2500 ? n - 543 : n;
    if (ce < REASONS_MIN_CE_YEAR || ce > latest + 1) return latest;
    return ce;
}

export function parseReasonsKind(raw: string | null | undefined): ReasonsKind {
    return String(raw || '').trim().toLowerCase() === 'reject' ? 'reject' : 'scrap';
}

export function parseReasonsSort(raw: string | null | undefined): ReasonsSort {
    return String(raw || '').trim().toLowerCase() === 'pct' ? 'pct' : 'qty';
}

export function parseReasonsDir(raw: string | null | undefined): ReasonsDir {
    return String(raw || '').trim().toLowerCase() === 'asc' ? 'asc' : 'desc';
}

export function parseReasonsPage(raw: string | null | undefined): number {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 1) return 1;
    return Math.floor(n);
}

export function parseReasonsPageSize(raw: string | null | undefined): number {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 1) return REASONS_DEFAULT_PAGE_SIZE;
    return Math.min(REASONS_MAX_PAGE_SIZE, Math.floor(n));
}

export function parseReasonsListParams(input: ReasonsQueryInput, now: Date = bangkokNow()): ReasonsListParams {
    return {
        year: parseReasonsYear(input.year, now),
        kind: parseReasonsKind(input.kind),
        q: String(input.q || '').trim(),
        page: parseReasonsPage(input.page),
        pageSize: parseReasonsPageSize(input.pageSize),
        rsn: String(input.rsn || '').trim(),
        sort: parseReasonsSort(input.sort),
        dir: parseReasonsDir(input.dir),
    };
}

function optionalFilter(raw: string | null | undefined): string {
    return String(raw || '').trim();
}

export function parseReasonsDetailParams(input: ReasonsDetailQueryInput, now: Date = bangkokNow()): ReasonsDetailParams {
    return {
        rsn: String(input.rsn || '').trim(),
        year: parseReasonsYear(input.year, now),
        kind: parseReasonsKind(input.kind),
        unit: optionalFilter(input.unit),
        shape: optionalFilter(input.shape),
        forming: optionalFilter(input.forming),
        customer: optionalFilter(input.customer),
        glaze: optionalFilter(input.glaze),
        cp: optionalFilter(input.cp),
    };
}

/** Deep-link into Reasons Focus from Mix Top 10 (or any rsn row). */
export function reasonsFocusHref(input: { rsn: string; year?: number | string | null; kind?: ReasonsKind | null }): string {
    const params = new URLSearchParams();
    params.set('rsn', input.rsn);
    if (input.year != null && String(input.year) !== '') params.set('year', String(input.year));
    if (input.kind) params.set('kind', input.kind);
    return `/reasons?${params.toString()}`;
}

/** Ware label for Top codeware. DW 143 keeps desc2 when present. */
export function formatReasonsCodewareLabel(input: {
    pt_desc1?: string | null;
    pt_desc2?: string | null;
    m_part?: string | null;
}): string {
    const desc1 = String(input.pt_desc1 || '').trim();
    const desc2 = String(input.pt_desc2 || '').trim();
    const part = String(input.m_part || '').trim();
    if (!desc1) return '';
    if (part.startsWith('143') && desc2) return `${desc1} (${desc2})`;
    return desc1;
}

export function yearBounds(year: number): { start: string; end: string } {
    return {
        start: `${year}-01-01`,
        end: `${year}-12-31`,
    };
}

export function emptySpark(): number[] {
    return Array.from({ length: REASONS_SPARK_MONTHS }, () => 0);
}

export function monthIndex(mo: number): number | null {
    if (!Number.isFinite(mo)) return null;
    const n = Math.floor(mo);
    if (n < 1 || n > REASONS_SPARK_MONTHS) return null;
    return n - 1;
}

export function matchesReasonQuery(rsn: string, q: string): boolean {
    if (!q) return true;
    return rsn.toLowerCase().includes(q.toLowerCase());
}

export function formatGeneratedAt(at: Date = new Date()): string {
    return at.toISOString().slice(0, 16).replace('T', ' ');
}

function compareItems(a: ReasonsItem, b: ReasonsItem, sort: ReasonsSort, dir: ReasonsDir): number {
    const mul = dir === 'asc' ? 1 : -1;
    const left = sort === 'pct' ? a.pct : a.qty;
    const right = sort === 'pct' ? b.pct : b.qty;
    if (left !== right) return (left - right) * mul;
    return a.rsn.localeCompare(b.rsn, 'th');
}

/** Build the paginated list from monthly aggregates. pct uses the unfiltered year+kind total. */
export function buildReasonsList(
    rows: ReasonsMonthRow[],
    params: ReasonsListParams,
    options?: { generatedAt?: string; stale?: boolean },
): ReasonsListResponse {
    const byRsn = new Map<string, { qty: number; spark: number[] }>();
    for (const row of rows) {
        const rsn = String(row.rsn || '').trim();
        const qty = Number(row.qty) || 0;
        if (!rsn || qty <= 0) continue;
        const slot = byRsn.get(rsn) || { qty: 0, spark: emptySpark() };
        slot.qty += qty;
        const idx = monthIndex(Number(row.mo));
        if (idx != null) slot.spark[idx] += qty;
        byRsn.set(rsn, slot);
    }

    const grandTotal = [...byRsn.values()].reduce((sum, row) => sum + row.qty, 0);
    const ranked = [...byRsn.entries()]
        .map(([rsn, row]) => ({
            rsn,
            qty: row.qty,
            pct: grandTotal > 0 ? (row.qty / grandTotal) * 100 : 0,
            spark: row.spark,
        }))
        .filter((item) => matchesReasonQuery(item.rsn, params.q))
        .sort((a, b) => compareItems(a, b, params.sort, params.dir));

    const total = ranked.length;
    const pageSize = params.pageSize;
    const maxPage = Math.max(1, Math.ceil(total / pageSize) || 1);
    let page = Math.min(params.page, maxPage);

    const selectedRsn = params.rsn;
    if (selectedRsn) {
        const idx = ranked.findIndex((item) => item.rsn === selectedRsn);
        if (idx >= 0) {
            page = Math.floor(idx / pageSize) + 1;
        }
    }

    const start = (page - 1) * pageSize;
    const items = ranked.slice(start, start + pageSize);

    const meta: ReasonsMeta = {
        total,
        page,
        pageSize,
        generatedAt: options?.generatedAt || formatGeneratedAt(),
        stale: Boolean(options?.stale),
    };
    if (selectedRsn) meta.selectedRsn = selectedRsn;

    return { items, meta };
}

/** Build Focus trend + Top codeware from monthly×code aggregates. pct uses this defect's year total. */
export function buildReasonsDetail(
    rows: ReasonsDetailRow[],
    params: Pick<ReasonsDetailParams, 'rsn' | 'year' | 'kind'>,
    options?: { generatedAt?: string; stale?: boolean; topN?: number },
): ReasonsDetailResponse {
    const spark = emptySpark();
    const byCode = new Map<string, number>();
    for (const row of rows) {
        const qty = Number(row.qty) || 0;
        if (qty <= 0) continue;
        const idx = monthIndex(Number(row.mo));
        if (idx != null) spark[idx] += qty;
        const code = String(row.code || '').trim();
        if (code) byCode.set(code, (byCode.get(code) || 0) + qty);
    }

    const qty = spark.reduce((sum, value) => sum + value, 0);
    const trend: ReasonsTrendPoint[] = spark.map((monthQty, i) => ({
        mo: i + 1,
        label: REASONS_MONTH_LABELS[i],
        qty: monthQty,
    }));

    const topN = options?.topN ?? REASONS_CODEWARE_TOP_N;
    const codeware: ReasonsCodewareItem[] = [...byCode.entries()]
        .map(([code, codeQty]) => ({
            code,
            qty: codeQty,
            pct: qty > 0 ? (codeQty / qty) * 100 : 0,
        }))
        .sort((a, b) => b.qty - a.qty || a.code.localeCompare(b.code, 'th'))
        .slice(0, topN);

    return {
        trend,
        codeware,
        meta: {
            generatedAt: options?.generatedAt || formatGeneratedAt(),
            stale: Boolean(options?.stale),
            rsn: params.rsn,
            year: params.year,
            kind: params.kind,
            qty,
        },
    };
}
