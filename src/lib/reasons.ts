/** QC Reasons list + detail contract. Pure helpers — no I/O. */

export const REASONS_MAX_PAGE_SIZE = 100;
export const REASONS_DEFAULT_PAGE_SIZE = 50;
export const REASONS_SPARK_MONTHS = 12;
export const REASONS_MIN_CE_YEAR = 2020;
export const REASONS_CODEWARE_TOP_N = 15;
export const REASONS_MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
/** Accepted on APIs for later slices — not shown in this PR's UI. */
export const REASONS_FUTURE_FILTER_KEYS = ['unit', 'shape', 'forming', 'customer', 'glaze', 'cp'] as const;

export const REASONS_FOCUS_TONES = ['white', 'black', 'inglaze', 'onglaze'] as const;
export const REASONS_FAMILIES = ['all', 'ww', 'dw'] as const;

export type ReasonsKind = 'scrap' | 'reject';
export type ReasonsSort = 'qty' | 'pct';
export type ReasonsDir = 'asc' | 'desc';
export type ReasonsFamily = (typeof REASONS_FAMILIES)[number];
export type ReasonsFocusTone = (typeof REASONS_FOCUS_TONES)[number];
export type ReasonsToneParam = ReasonsFocusTone | 'all';
/** Bucket from unit / m_part / source. `ww` is unclassified WW; `other` is neither family. */
export type ReasonsToneKey = ReasonsFocusTone | 'ww' | 'other';

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
    pct: number;
    delta: number | null;
};

export type ReasonsCodewareItem = {
    code: string;
    qty: number;
    pct: number;
};

export type ReasonsFamilyShareItem = {
    tone: ReasonsFocusTone;
    label: string;
    qty: number;
    pct: number;
};

export type ReasonsDetailMeta = {
    generatedAt: string;
    stale: boolean;
    rsn: string;
    year: number;
    kind: ReasonsKind;
    family: ReasonsFamily;
    tone: ReasonsToneParam;
    qty: number;
    pct: number;
    rank: number | null;
    delta: number | null;
    peakMo: number | null;
    peakLabel: string | null;
    peakQty: number;
};

export type ReasonsToneSeries = {
    tone: ReasonsFocusTone;
    meta: ReasonsDetailMeta;
    trend: ReasonsTrendPoint[];
};

export type ReasonsDetailResponse = {
    meta: ReasonsDetailMeta;
    trend: ReasonsTrendPoint[];
    codeware: ReasonsCodewareItem[];
    other?: ReasonsCodewareItem;
    familyShare?: ReasonsFamilyShareItem[];
    series?: ReasonsToneSeries[];
    activeTone?: ReasonsFocusTone;
};

export type ReasonsDetailQueryInput = {
    rsn?: string | null;
    year?: string | null;
    kind?: string | null;
    family?: string | null;
    tone?: string | null;
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
    family: ReasonsFamily;
    tone: ReasonsToneParam;
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
    tone: ReasonsToneKey;
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
    tone?: ReasonsToneKey;
};

export const REASONS_FAMILY_OPTIONS: { value: ReasonsFamily; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'ww', label: 'WW' },
    { value: 'dw', label: 'DW' },
];

export const REASONS_WW_TONE_OPTIONS: { value: ReasonsToneParam; label: string }[] = [
    { value: 'white', label: 'White' },
    { value: 'black', label: 'Black' },
    { value: 'all', label: 'All' },
];

export const REASONS_DW_TONE_OPTIONS: { value: ReasonsToneParam; label: string }[] = [
    { value: 'inglaze', label: 'Inglaze' },
    { value: 'onglaze', label: 'Onglaze' },
    { value: 'all', label: 'All' },
];

export const REASONS_TONE_LABEL: Record<ReasonsFocusTone, string> = {
    white: 'White',
    black: 'Black',
    inglaze: 'Inglaze',
    onglaze: 'Onglaze',
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

export function parseReasonsFamily(raw: string | null | undefined): ReasonsFamily {
    const v = String(raw || '').trim().toLowerCase();
    if (v === 'ww') return 'ww';
    if (v === 'dw') return 'dw';
    return 'all';
}

export function defaultToneForFamily(family: ReasonsFamily): ReasonsToneParam {
    if (family === 'dw') return 'inglaze';
    return 'white';
}

export function parseReasonsTone(family: ReasonsFamily, raw: string | null | undefined): ReasonsToneParam {
    const v = String(raw || '').trim().toLowerCase();
    if (family === 'ww') {
        if (v === 'black' || v === 'ww_black') return 'black';
        if (v === 'all') return 'all';
        return 'white';
    }
    if (family === 'dw') {
        if (v === 'onglaze' || v === 'dw_onglaze') return 'onglaze';
        if (v === 'all') return 'all';
        return 'inglaze';
    }
    if (v === 'black' || v === 'ww_black') return 'black';
    if (v === 'inglaze' || v === 'dw' || v === 'dw_inglaze') return 'inglaze';
    if (v === 'onglaze' || v === 'dw_onglaze') return 'onglaze';
    return 'white';
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
    const family = parseReasonsFamily(input.family);
    return {
        rsn: String(input.rsn || '').trim(),
        year: parseReasonsYear(input.year, now),
        kind: parseReasonsKind(input.kind),
        family,
        tone: parseReasonsTone(family, input.tone),
        unit: optionalFilter(input.unit),
        shape: optionalFilter(input.shape),
        forming: optionalFilter(input.forming),
        customer: optionalFilter(input.customer),
        glaze: optionalFilter(input.glaze),
        cp: optionalFilter(input.cp),
    };
}

export function familyForFocusTone(tone: ReasonsFocusTone): ReasonsFamily {
    return tone === 'white' || tone === 'black' ? 'ww' : 'dw';
}

export function isReasonsFocusTone(value: string): value is ReasonsFocusTone {
    return (REASONS_FOCUS_TONES as readonly string[]).includes(value);
}

/** Tones included in a Focus slice (family + tone). */
export function tonesMatchingSlice(family: ReasonsFamily, tone: ReasonsToneParam): ReasonsToneKey[] {
    if (family === 'all') {
        if (tone === 'all') return [...REASONS_FOCUS_TONES, 'ww', 'other'];
        return [tone];
    }
    if (family === 'ww') {
        if (tone === 'white') return ['white'];
        if (tone === 'black') return ['black'];
        return ['white', 'black', 'ww'];
    }
    if (tone === 'inglaze') return ['inglaze'];
    if (tone === 'onglaze') return ['onglaze'];
    return ['inglaze', 'onglaze'];
}

export function classifyReasonsTone(input: {
    source?: string | null;
    partFamily?: string | null;
    unitTone?: string | null;
    mPart?: string | null;
    unit?: string | null;
}): ReasonsToneKey {
    if (String(input.source || '').trim() === 'sdb') return 'onglaze';
    const part = String(input.partFamily || input.mPart || '').trim();
    const unit = String(input.unitTone || input.unit || '').trim();
    const isDw = part === '143' || part.startsWith('143');
    const isWw = part === '142' || part.startsWith('142');
    if (isDw) return 'inglaze';
    if (isWw && (unit === 'W5240' || unit.startsWith('W5240'))) return 'white';
    if (isWw && (unit === 'W5241' || unit.startsWith('W5241'))) return 'black';
    if (isWw) return 'ww';
    return 'other';
}

/** Deep-link into Reasons Focus from Mix Top 10 (or any rsn row). */
export function reasonsFocusHref(input: {
    rsn: string;
    year?: number | string | null;
    kind?: ReasonsKind | null;
    family?: ReasonsFamily | null;
    tone?: ReasonsToneParam | null;
}): string {
    const params = new URLSearchParams();
    params.set('rsn', input.rsn);
    if (input.year != null && String(input.year) !== '') params.set('year', String(input.year));
    if (input.kind) params.set('kind', input.kind);
    if (input.family) params.set('family', input.family);
    if (input.tone) params.set('tone', input.tone);
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

function rowMatchesSlice(tone: ReasonsToneKey | undefined, family: ReasonsFamily, sliceTone: ReasonsToneParam): boolean {
    return tonesMatchingSlice(family, sliceTone).includes(tone || 'other');
}

type RsnAgg = { qty: number; spark: number[] };

function aggregateByRsn(rows: ReasonsMonthRow[]): Map<string, RsnAgg> {
    const byRsn = new Map<string, RsnAgg>();
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
    return byRsn;
}

function kindSparkFromAggs(byRsn: Map<string, RsnAgg>): number[] {
    const spark = emptySpark();
    for (const row of byRsn.values()) {
        for (let i = 0; i < REASONS_SPARK_MONTHS; i += 1) spark[i] += row.spark[i];
    }
    return spark;
}

function latestMonthDelta(spark: number[]): number | null {
    let last = 0;
    for (let i = REASONS_SPARK_MONTHS; i >= 1; i -= 1) {
        if (spark[i - 1] > 0) {
            last = i;
            break;
        }
    }
    if (last <= 1) return null;
    return spark[last - 1] - spark[last - 2];
}

function peakFromSpark(spark: number[]): { peakMo: number | null; peakLabel: string | null; peakQty: number } {
    let peakMo: number | null = null;
    let peakQty = 0;
    for (let i = 0; i < REASONS_SPARK_MONTHS; i += 1) {
        if (spark[i] > peakQty) {
            peakQty = spark[i];
            peakMo = i + 1;
        }
    }
    return {
        peakMo,
        peakLabel: peakMo != null ? REASONS_MONTH_LABELS[peakMo - 1] : null,
        peakQty,
    };
}

function buildTrend(rsnSpark: number[], kindSpark: number[]): ReasonsTrendPoint[] {
    return rsnSpark.map((monthQty, i) => {
        const kindQty = kindSpark[i] || 0;
        return {
            mo: i + 1,
            label: REASONS_MONTH_LABELS[i],
            qty: monthQty,
            pct: kindQty > 0 ? (monthQty / kindQty) * 100 : 0,
            delta: i === 0 ? null : monthQty - rsnSpark[i - 1],
        };
    });
}

function buildCodeware(
    rows: ReasonsDetailRow[],
    denomQty: number,
    topN: number,
): { codeware: ReasonsCodewareItem[]; other?: ReasonsCodewareItem } {
    const byCode = new Map<string, number>();
    for (const row of rows) {
        const qty = Number(row.qty) || 0;
        if (qty <= 0) continue;
        const code = String(row.code || '').trim();
        if (!code) continue;
        byCode.set(code, (byCode.get(code) || 0) + qty);
    }
    const ranked = [...byCode.entries()]
        .map(([code, qty]) => ({ code, qty }))
        .sort((a, b) => b.qty - a.qty || a.code.localeCompare(b.code, 'th'));
    const top = ranked.slice(0, topN);
    const topQty = top.reduce((sum, row) => sum + row.qty, 0);
    const basis = denomQty > 0 ? denomQty : topQty;
    const codeware: ReasonsCodewareItem[] = top.map((row) => ({
        code: row.code,
        qty: row.qty,
        pct: basis > 0 ? (row.qty / basis) * 100 : 0,
    }));
    const rest = Math.max(0, basis - topQty);
    const other = rest > 0.0001
        ? { code: 'Other', qty: rest, pct: basis > 0 ? (rest / basis) * 100 : 0 }
        : undefined;
    return { codeware, other };
}

function buildFamilyShare(
    monthRows: ReasonsMonthRow[],
    rsn: string,
    family: ReasonsFamily,
): ReasonsFamilyShareItem[] | undefined {
    const tones: ReasonsFocusTone[] | null = family === 'ww'
        ? ['white', 'black']
        : family === 'dw'
            ? ['inglaze', 'onglaze']
            : null;
    if (!tones) return undefined;
    const qtyByTone: Record<ReasonsFocusTone, number> = {
        white: 0,
        black: 0,
        inglaze: 0,
        onglaze: 0,
    };
    for (const row of monthRows) {
        if (String(row.rsn || '').trim() !== rsn) continue;
        const tone = row.tone || 'other';
        if (tone === 'white' || tone === 'black' || tone === 'inglaze' || tone === 'onglaze') {
            qtyByTone[tone] += Number(row.qty) || 0;
        }
    }
    const total = tones.reduce((sum, tone) => sum + qtyByTone[tone], 0);
    if (total <= 0) return undefined;
    return tones.map((tone) => ({
        tone,
        label: REASONS_TONE_LABEL[tone],
        qty: qtyByTone[tone],
        pct: (qtyByTone[tone] / total) * 100,
    }));
}

type SliceBuild = {
    meta: ReasonsDetailMeta;
    trend: ReasonsTrendPoint[];
    codeware: ReasonsCodewareItem[];
    other?: ReasonsCodewareItem;
};

function buildSlice(
    monthRows: ReasonsMonthRow[],
    codeRows: ReasonsDetailRow[],
    params: Pick<ReasonsDetailParams, 'rsn' | 'year' | 'kind' | 'family' | 'tone'>,
    options?: { generatedAt?: string; stale?: boolean; topN?: number },
): SliceBuild {
    const slicedMonths = monthRows.filter((row) => rowMatchesSlice(row.tone, params.family, params.tone));
    const byRsn = aggregateByRsn(slicedMonths);
    const grandTotal = [...byRsn.values()].reduce((sum, row) => sum + row.qty, 0);
    const ranked = [...byRsn.entries()]
        .map(([rsn, row]) => ({ rsn, qty: row.qty }))
        .sort((a, b) => b.qty - a.qty || a.rsn.localeCompare(b.rsn, 'th'));
    const thisAgg = byRsn.get(params.rsn) || { qty: 0, spark: emptySpark() };
    const rankIdx = ranked.findIndex((row) => row.rsn === params.rsn);
    const rank = thisAgg.qty > 0 && rankIdx >= 0 ? rankIdx + 1 : null;
    const pct = grandTotal > 0 ? (thisAgg.qty / grandTotal) * 100 : 0;
    const kindSpark = kindSparkFromAggs(byRsn);
    const trend = buildTrend(thisAgg.spark, kindSpark);
    const peak = peakFromSpark(thisAgg.spark);
    const slicedCodes = codeRows.filter((row) => rowMatchesSlice(row.tone, params.family, params.tone));
    const { codeware, other } = buildCodeware(
        slicedCodes,
        thisAgg.qty,
        options?.topN ?? REASONS_CODEWARE_TOP_N,
    );

    return {
        meta: {
            generatedAt: options?.generatedAt || formatGeneratedAt(),
            stale: Boolean(options?.stale),
            rsn: params.rsn,
            year: params.year,
            kind: params.kind,
            family: params.family,
            tone: params.tone,
            qty: thisAgg.qty,
            pct,
            rank,
            delta: latestMonthDelta(thisAgg.spark),
            peakMo: peak.peakMo,
            peakLabel: peak.peakLabel,
            peakQty: peak.peakQty,
        },
        trend,
        codeware,
        other,
    };
}

/** Build the paginated list from monthly aggregates. pct uses the unfiltered year+kind total. */
export function buildReasonsList(
    rows: ReasonsMonthRow[],
    params: ReasonsListParams,
    options?: { generatedAt?: string; stale?: boolean },
): ReasonsListResponse {
    const byRsn = aggregateByRsn(rows);
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

/**
 * Build Focus from the year×kind month cache (rank / % / Δ / trend) plus this
 * defect's codeware aggregates. All-family series are sliced in memory — one pass.
 */
export function buildReasonsDetail(
    monthRows: ReasonsMonthRow[],
    codeRows: ReasonsDetailRow[],
    params: Pick<ReasonsDetailParams, 'rsn' | 'year' | 'kind' | 'family' | 'tone'>,
    options?: { generatedAt?: string; stale?: boolean; topN?: number },
): ReasonsDetailResponse {
    if (params.family === 'all') {
        const activeTone = isReasonsFocusTone(params.tone) ? params.tone : 'white';
        const series: ReasonsToneSeries[] = REASONS_FOCUS_TONES.map((tone) => {
            const slice = buildSlice(
                monthRows,
                codeRows,
                { ...params, family: 'all', tone },
                options,
            );
            return { tone, meta: { ...slice.meta, family: 'all', tone }, trend: slice.trend };
        });
        const active = buildSlice(
            monthRows,
            codeRows,
            { ...params, family: 'all', tone: activeTone },
            options,
        );
        const payload: ReasonsDetailResponse = {
            meta: { ...active.meta, family: 'all', tone: activeTone },
            trend: active.trend,
            codeware: active.codeware,
            series,
            activeTone,
        };
        if (active.other) payload.other = active.other;
        return payload;
    }

    const slice = buildSlice(monthRows, codeRows, params, options);
    const payload: ReasonsDetailResponse = {
        meta: slice.meta,
        trend: slice.trend,
        codeware: slice.codeware,
    };
    if (slice.other) payload.other = slice.other;
    const familyShare = buildFamilyShare(monthRows, params.rsn, params.family);
    if (familyShare) payload.familyShare = familyShare;
    return payload;
}
