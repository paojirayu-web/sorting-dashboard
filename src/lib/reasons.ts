/** QC Reasons list + detail contract. Pure helpers — no I/O. */
import {
    classifyGlaze,
    classifyProduct,
    GLAZE_LABEL,
    QTYPROC_GLAZE_TYPES,
    QTYPROC_HIDDEN_KEYS,
    qtyProcGroupLabels,
    qtyProcGroupMatches,
    qtyProcGroupsSelected,
    SHAPE_LABEL,
} from '@/lib/qtyproc';

export const REASONS_MAX_PAGE_SIZE = 100;
export const REASONS_DEFAULT_PAGE_SIZE = 50;
export const REASONS_SPARK_MONTHS = 12;
export const REASONS_MIN_CE_YEAR = 2020;
/** Current year plus this many previous years (2026 → 2025–2026). */
export const REASONS_YEAR_LOOKBACK = 1;
export const REASONS_DEFAULT_CP = 'C';
export const REASONS_CODEWARE_TOP_N = 10;
/** Mix-style floor: tiny wares inflate rate and are excluded from Top codeware ranking. */
export const REASONS_CODEWARE_MIN_QTYPROC = 300;
export const REASONS_MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
/** Mix-style filters. Group / forming / glaze are on the Reasons header; unit / customer stay API-only. */
export const REASONS_FUTURE_FILTER_KEYS = ['unit', 'group', 'forming', 'customer', 'glaze', 'cp'] as const;
export const REASONS_PARETO_TOP_N = 10;
export const REASONS_PARETO_CHART_N = 15;
export const REASONS_PARETO_OTHER = 'Other';

export const REASONS_FOCUS_TONES = ['white', 'black', 'inglaze', 'onglaze'] as const;
export const REASONS_FAMILIES = ['all', 'ww', 'dw'] as const;

export type ReasonsKind = 'scrap' | 'reject';
export type ReasonsSort = 'qty' | 'pct';
export type ReasonsDir = 'asc' | 'desc';
export type ReasonsFamily = (typeof REASONS_FAMILIES)[number];
export type ReasonsFocusTone = (typeof REASONS_FOCUS_TONES)[number];
export type ReasonsToneParam = ReasonsFocusTone | 'all';
export type ReasonsYearParam = number | 'all';
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
    cp?: string | null;
};

export type ReasonsTrendPoint = {
    mo: number;
    label: string;
    qty: number;
    pct: number;
    delta: number | null;
};

/** Overlay series for year-all (2026 vs 2025) or tone-all (White vs Black). */
export type ReasonsNamedTrend = {
    key: string;
    label: string;
    color: string;
    trend: ReasonsTrendPoint[];
};

export type ReasonsYearStat = {
    year: number;
    qty: number;
    qtyproc: number;
    pct: number;
    color: string;
};

export type ReasonsCodewareItem = {
    code: string;
    desc1?: string;
    desc2?: string;
    qty: number;
    qtyproc: number;
    pct: number;
    tone?: ReasonsFocusTone;
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
    year: ReasonsYearParam;
    years?: number[];
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
    compare?: ReasonsNamedTrend[];
};

export type ReasonsDetailResponse = {
    meta: ReasonsDetailMeta;
    trend: ReasonsTrendPoint[];
    codeware: ReasonsCodewareItem[];
    other?: ReasonsCodewareItem;
    familyShare?: ReasonsFamilyShareItem[];
    series?: ReasonsToneSeries[];
    activeTone?: ReasonsFocusTone;
    compare?: ReasonsNamedTrend[];
    yearStats?: ReasonsYearStat[];
    groupOptions?: ReasonsGroupOption[];
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
    group?: string | null;
};

export const REASONS_CP_OPTIONS: { value: string; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'C', label: 'C' },
    { value: 'C1', label: 'C1' },
    { value: 'P1', label: 'P1' },
    { value: 'P2', label: 'P2' },
    { value: 'P3', label: 'P3' },
    { value: 'P4', label: 'P4' },
    { value: 'P5', label: 'P5' },
];

export type ReasonsDetailParams = {
    rsn: string;
    year: ReasonsYearParam;
    kind: ReasonsKind;
    family: ReasonsFamily;
    tone: ReasonsToneParam;
    /** Mix filters: cp / group / forming / glaze are sliced in memory from the year×kind cache. */
    unit: string;
    group: string[];
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
    desc1?: string;
    desc2?: string;
    cp?: string;
    mPart?: string;
    group?: string;
    groupLabel?: string;
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
    cp: string;
};

export type ReasonsMonthRow = {
    rsn: string;
    mo: number;
    qty: number;
    tone?: ReasonsToneKey;
    desc1?: string;
    desc2?: string;
    cp?: string;
    mPart?: string;
    group?: string;
    groupLabel?: string;
};

export type ReasonsProdRow = {
    mo: number;
    qtyproc: number;
    tone?: ReasonsToneKey;
    desc1?: string;
    desc2?: string;
    cp?: string;
    mPart?: string;
    group?: string;
    groupLabel?: string;
};

export type ReasonsMixParams = {
    family: ReasonsFamily;
    tone: ReasonsToneParam;
    cp: string;
    group: string[];
    forming: string;
    glaze: string;
};

export const REASONS_FAMILY_OPTIONS: { value: ReasonsFamily; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'ww', label: 'WW' },
    { value: 'dw', label: 'DW' },
];

export const REASONS_WW_TONE_OPTIONS: { value: ReasonsToneParam; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'white', label: 'White' },
    { value: 'black', label: 'Black' },
];

export const REASONS_DW_TONE_OPTIONS: { value: ReasonsToneParam; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'inglaze', label: 'Inglaze' },
    { value: 'onglaze', label: 'Onglaze' },
];

export const REASONS_ALL_TONE_OPTIONS: { value: ReasonsToneParam; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'white', label: 'White' },
    { value: 'black', label: 'Black' },
    { value: 'inglaze', label: 'Inglaze' },
    { value: 'onglaze', label: 'Onglaze' },
];

export function toneOptionsForFamily(family: ReasonsFamily): { value: ReasonsToneParam; label: string }[] {
    if (family === 'ww') return REASONS_WW_TONE_OPTIONS;
    if (family === 'dw') return REASONS_DW_TONE_OPTIONS;
    return [];
}

export function toneFitsFamily(family: ReasonsFamily, tone: ReasonsToneParam): boolean {
    if (tone === 'all' || family === 'all') return true;
    if (family === 'ww') return tone === 'white' || tone === 'black';
    return tone === 'inglaze' || tone === 'onglaze';
}

export function nextToneForFamily(family: ReasonsFamily, tone: ReasonsToneParam): ReasonsToneParam {
    if (family === 'all') return 'all';
    return toneFitsFamily(family, tone) ? tone : 'all';
}

export const REASONS_TONE_LABEL: Record<ReasonsFocusTone, string> = {
    white: 'White',
    black: 'Black',
    inglaze: 'Inglaze',
    onglaze: 'Onglaze',
};

export const REASONS_TONE_COLOR: Record<ReasonsFocusTone, string> = {
    white: '#0d9488',
    black: '#db2777',
    inglaze: '#d97706',
    onglaze: '#9333ea',
};

export const REASONS_SHAPE_OPTIONS: { value: string; label: string }[] = [
    { value: 'all', label: 'All' },
    ...Object.entries(SHAPE_LABEL).map(([value, label]) => ({ value, label })),
];

export const REASONS_FORMING_OPTIONS: { value: string; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'ISO', label: 'ISO' },
    { value: 'JIG', label: 'JIG' },
    { value: 'RAM', label: 'RAM' },
    { value: 'Casting', label: 'Casting' },
    { value: 'HPC', label: 'HPC' },
];

export const REASONS_GLAZE_OPTIONS: { value: string; label: string }[] = [
    { value: 'all', label: 'All' },
    ...QTYPROC_GLAZE_TYPES.map((value) => ({ value, label: GLAZE_LABEL[value] })),
];

export function bangkokNow(): Date {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
}

export function latestReasonsYear(now: Date = bangkokNow()): number {
    return now.getFullYear();
}

export function reasonsYearOptions(now: Date = bangkokNow()): number[] {
    const latest = latestReasonsYear(now);
    const minYear = Math.max(REASONS_MIN_CE_YEAR, latest - REASONS_YEAR_LOOKBACK);
    const years: number[] = [];
    for (let year = latest; year >= minYear; year -= 1) years.push(year);
    return years;
}

/** Accept CE (2026) or BE (2569). Only current year and previous year. */
export function parseReasonsYear(raw: string | null | undefined, now: Date = bangkokNow()): number {
    const latest = latestReasonsYear(now);
    const allowed = reasonsYearOptions(now);
    if (raw == null || String(raw).trim() === '') return latest;
    const n = Number(String(raw).trim());
    if (!Number.isFinite(n) || !Number.isInteger(n)) return latest;
    const ce = n >= 2500 ? n - 543 : n;
    if (!allowed.includes(ce)) return latest;
    return ce;
}

/** Header year: a single CE year, or `all` to overlay the lookback window. */
export function parseReasonsYearParam(raw: string | null | undefined, now: Date = bangkokNow()): ReasonsYearParam {
    const v = String(raw || '').trim().toLowerCase();
    if (!v || v === 'all') return 'all';
    return parseReasonsYear(raw, now);
}

export function yearsForReasonsParam(year: ReasonsYearParam, now: Date = bangkokNow()): number[] {
    return year === 'all' ? reasonsYearOptions(now) : [year];
}

export function formatReasonsYearLabel(year: ReasonsYearParam, now: Date = bangkokNow()): string {
    if (year !== 'all') return String(year);
    const years = yearsForReasonsParam(year, now);
    if (years.length === 0) return 'All';
    const hi = Math.max(...years);
    const lo = Math.min(...years);
    return lo === hi ? String(hi) : `${lo}–${hi}`;
}

/** Latest year is first (blue), previous is amber. */
export const REASONS_YEAR_PALETTE = ['#2563eb', '#d97706'] as const;

export function reasonsYearColor(index: number): string {
    return REASONS_YEAR_PALETTE[index % REASONS_YEAR_PALETTE.length];
}

export function isYearCompareKey(key: string): boolean {
    return /^y\d{4}$/.test(key);
}

export function yearCompareSeries(
    parts: { year: number; trend: ReasonsTrendPoint[] }[],
): ReasonsNamedTrend[] {
    return parts.map((part, index) => ({
        key: `y${part.year}`,
        label: String(part.year),
        color: reasonsYearColor(index),
        trend: part.trend,
    }));
}

/** WW All → White vs Black; DW All → Inglaze vs Onglaze. Family All overlays only on Focus. */
export function compareTonesForSlice(family: ReasonsFamily, tone: ReasonsToneParam): ReasonsFocusTone[] | null {
    if (tone !== 'all') return null;
    if (family === 'ww') return ['white', 'black'];
    if (family === 'dw') return ['inglaze', 'onglaze'];
    return null;
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

export function defaultToneForFamily(_family: ReasonsFamily): ReasonsToneParam {
    return 'all';
}

export function parseReasonsTone(family: ReasonsFamily, raw: string | null | undefined): ReasonsToneParam {
    const v = String(raw || '').trim().toLowerCase();
    if (family === 'ww') {
        if (v === 'black' || v === 'ww_black') return 'black';
        if (v === 'white' || v === 'ww_white') return 'white';
        return 'all';
    }
    if (family === 'dw') {
        if (v === 'onglaze' || v === 'dw_onglaze') return 'onglaze';
        if (v === 'inglaze' || v === 'dw' || v === 'dw_inglaze') return 'inglaze';
        return 'all';
    }
    if (v === 'black' || v === 'ww_black') return 'black';
    if (v === 'white' || v === 'ww_white') return 'white';
    if (v === 'inglaze' || v === 'dw' || v === 'dw_inglaze') return 'inglaze';
    if (v === 'onglaze' || v === 'dw_onglaze') return 'onglaze';
    return 'all';
}

export function parseReasonsCp(raw: string | null | undefined): string {
    const v = String(raw || '').trim();
    if (!v) return REASONS_DEFAULT_CP;
    if (v.toLowerCase() === 'all') return 'all';
    const cp = v.toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9._()-]{0,20}$/.test(cp)) return REASONS_DEFAULT_CP;
    return cp;
}

const SHAPE_VALUES = new Set(REASONS_SHAPE_OPTIONS.map((o) => o.value));
const FORMING_VALUES = new Set(REASONS_FORMING_OPTIONS.map((o) => o.value));
const GLAZE_VALUES = new Set(REASONS_GLAZE_OPTIONS.map((o) => o.value));

function parseMixDim(raw: string | null | undefined, allowed: Set<string>): string {
    const v = String(raw || '').trim();
    if (!v || v.toLowerCase() === 'all') return 'all';
    return allowed.has(v) ? v : 'all';
}

export function parseReasonsShape(raw: string | null | undefined): string {
    return parseMixDim(raw, SHAPE_VALUES);
}

export function parseReasonsGroups(raw: string | null | undefined): string[] {
    const value = String(raw || '').trim();
    if (!value || value.toLowerCase() === 'all') return [];
    return [...new Set(
        value.split(',').map((part) => part.trim()).filter((part) => part && part.toLowerCase() !== 'all'),
    )];
}

export function reasonsGroupsQuery(groups: string[]): string | null {
    const selected = qtyProcGroupsSelected(groups);
    return selected.length ? selected.join(',') : null;
}

export type ReasonsGroupOption = { value: string; label: string };

export function reasonsGroupOptions(
    rows: { group?: string; groupLabel?: string }[],
): ReasonsGroupOption[] {
    const labels = qtyProcGroupLabels(rows);
    return Object.keys(labels)
        .filter((code) => !QTYPROC_HIDDEN_KEYS.has(String(code).toLowerCase()))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
        .map((value) => ({ value, label: labels[value] || value }));
}

export function parseReasonsForming(raw: string | null | undefined): string {
    return parseMixDim(raw, FORMING_VALUES);
}

export function parseReasonsGlaze(raw: string | null | undefined): string {
    const v = String(raw || '').trim().toUpperCase();
    if (!v || v === 'ALL') return 'all';
    return GLAZE_VALUES.has(v) ? v : 'all';
}

export function matchesReasonsMix(
    row: { tone?: ReasonsToneKey; cp?: string; desc1?: string; desc2?: string; group?: string },
    params: ReasonsMixParams,
): boolean {
    if (!rowMatchesSlice(row.tone, params.family, params.tone)) return false;
    if (params.cp && params.cp !== 'all' && String(row.cp || '').toUpperCase() !== params.cp) return false;
    if (!qtyProcGroupMatches(params.group, row.group)) return false;
    const forming = params.forming || 'all';
    const glaze = params.glaze || 'all';
    if (forming === 'all' && glaze === 'all') return true;
    const classified = classifyProduct(row.desc1, row.desc2);
    if (forming !== 'all' && classified.forming !== forming) return false;
    if (glaze !== 'all' && classifyGlaze(row.desc1, row.desc2) !== glaze) return false;
    return true;
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
        cp: parseReasonsCp(input.cp),
    };
}

function optionalFilter(raw: string | null | undefined): string {
    return String(raw || '').trim();
}

export function parseReasonsDetailParams(input: ReasonsDetailQueryInput, now: Date = bangkokNow()): ReasonsDetailParams {
    const family = parseReasonsFamily(input.family);
    return {
        rsn: String(input.rsn || '').trim(),
        year: parseReasonsYearParam(input.year, now),
        kind: parseReasonsKind(input.kind),
        family,
        tone: parseReasonsTone(family, input.tone),
        unit: optionalFilter(input.unit),
        group: parseReasonsGroups(input.group),
        forming: parseReasonsForming(input.forming),
        customer: optionalFilter(input.customer),
        glaze: parseReasonsGlaze(input.glaze),
        cp: parseReasonsCp(input.cp),
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

export function isReasonsDwCodeware(input: {
    tone?: ReasonsToneKey;
    m_part?: string | null;
}): boolean {
    if (input.tone === 'inglaze' || input.tone === 'onglaze') return true;
    return String(input.m_part || '').startsWith('143');
}

/** Ware label for Top codeware. All DW keeps desc2 when present. */
export function formatReasonsCodewareLabel(input: {
    pt_desc1?: string | null;
    pt_desc2?: string | null;
    m_part?: string | null;
    tone?: ReasonsToneKey;
}): string {
    const desc1 = String(input.pt_desc1 || '').trim();
    const desc2 = String(input.pt_desc2 || '').trim();
    const part = String(input.m_part || '').trim();
    if (!desc1) return '';
    if (desc2 && isReasonsDwCodeware({ tone: input.tone, m_part: part })) return `${desc1} (${desc2})`;
    return desc1;
}

export function yearBounds(year: number): { start: string; end: string } {
    return {
        start: `${year}-01-01`,
        end: `${year}-12-31`,
    };
}

function pad2(n: number): string {
    return String(n).padStart(2, '0');
}

export function addDaysIso(isoDate: string, days: number): string {
    const [year, month, day] = isoDate.split('-').map(Number);
    const utc = Date.UTC(year, (month || 1) - 1, (day || 1) + days);
    const next = new Date(utc);
    return `${next.getUTCFullYear()}-${pad2(next.getUTCMonth() + 1)}-${pad2(next.getUTCDate())}`;
}

/** Inclusive start, exclusive end. Current year stops at tomorrow so we do not scan empty future months. */
export function yearQueryWindow(year: number, now: Date = bangkokNow()): { start: string; endExcl: string } {
    const start = `${year}-01-01`;
    const yearEndExcl = `${year + 1}-01-01`;
    const today = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
    const tomorrow = addDaysIso(today, 1);
    if (year < now.getFullYear()) return { start, endExcl: yearEndExcl };
    if (year > now.getFullYear()) return { start, endExcl: start };
    return { start, endExcl: tomorrow < yearEndExcl ? tomorrow : yearEndExcl };
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

type ToneQty = Record<ReasonsFocusTone, number>;

function emptyTones(): ToneQty {
    return { white: 0, black: 0, inglaze: 0, onglaze: 0 };
}

type RsnAgg = { qty: number; spark: number[]; ww: number; dw: number; tones: ToneQty };

export function familyLabelFromTone(tone?: ReasonsToneKey): 'WW' | 'DW' | null {
    if (tone === 'inglaze' || tone === 'onglaze') return 'DW';
    if (tone === 'white' || tone === 'black' || tone === 'ww') return 'WW';
    return null;
}

export function originLabelFromQty(ww: number, dw: number): string | undefined {
    if (ww > 0 && dw > 0) return 'WW+DW';
    if (ww > 0) return 'WW';
    if (dw > 0) return 'DW';
    return undefined;
}

export function toneOriginLabelFromQty(tones: Partial<Record<ReasonsFocusTone, number>>): string | undefined {
    const present = REASONS_FOCUS_TONES.filter((tone) => (tones[tone] || 0) > 0);
    if (present.length === 0) return undefined;
    return present.map((tone) => REASONS_TONE_LABEL[tone]).join('+');
}

function aggregateByRsn(rows: ReasonsMonthRow[]): Map<string, RsnAgg> {
    const byRsn = new Map<string, RsnAgg>();
    for (const row of rows) {
        const rsn = String(row.rsn || '').trim();
        const qty = Number(row.qty) || 0;
        if (!rsn || qty <= 0) continue;
        const slot = byRsn.get(rsn) || { qty: 0, spark: emptySpark(), ww: 0, dw: 0, tones: emptyTones() };
        slot.qty += qty;
        const family = familyLabelFromTone(row.tone);
        if (family === 'WW') slot.ww += qty;
        if (family === 'DW') slot.dw += qty;
        const focus = focusToneOf(row.tone);
        if (focus) slot.tones[focus] += qty;
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

function prodSparkFromRows(rows: ReasonsProdRow[]): number[] {
    const spark = emptySpark();
    for (const row of rows) {
        const idx = monthIndex(Number(row.mo));
        if (idx == null) continue;
        spark[idx] += Number(row.qtyproc) || 0;
    }
    return spark;
}

function sumQtyproc(rows: ReasonsProdRow[]): number {
    return rows.reduce((sum, row) => sum + (Number(row.qtyproc) || 0), 0);
}

function focusToneOf(tone: ReasonsToneKey | undefined): ReasonsFocusTone | undefined {
    if (tone === 'white' || tone === 'black' || tone === 'inglaze' || tone === 'onglaze') return tone;
    return undefined;
}

function prodProcByCode(rows: ReasonsProdRow[], splitTone = false): Map<string, number> {
    const byCode = new Map<string, number>();
    for (const row of rows) {
        const code = formatReasonsCodewareLabel({
            pt_desc1: row.desc1,
            pt_desc2: row.desc2,
            m_part: row.mPart,
            tone: row.tone,
        });
        if (!code) continue;
        const tone = splitTone ? focusToneOf(row.tone) : undefined;
        const key = splitTone ? `${tone || '_'}\t${code}` : code;
        byCode.set(key, (byCode.get(key) || 0) + (Number(row.qtyproc) || 0));
    }
    return byCode;
}

type ReasonsSliceParams = Pick<ReasonsDetailParams, 'rsn' | 'year' | 'kind' | 'family' | 'tone'> & Partial<Pick<ReasonsDetailParams, 'cp' | 'group' | 'forming' | 'glaze'>>;

function mixFromDetail(params: ReasonsSliceParams): ReasonsMixParams {
    return {
        family: params.family,
        tone: params.tone,
        cp: params.cp || 'all',
        group: params.group || [],
        forming: params.forming || 'all',
        glaze: params.glaze || 'all',
    };
}

function mixIsNarrow(mix: ReasonsMixParams): boolean {
    if (qtyProcGroupsSelected(mix.group).length > 0) return true;
    if (mix.forming && mix.forming !== 'all') return true;
    if (mix.glaze && mix.glaze !== 'all') return true;
    if (mix.cp && mix.cp !== 'all' && mix.cp !== REASONS_DEFAULT_CP) return true;
    return false;
}

function buildTrend(rsnSpark: number[], kindSpark: number[], prodSpark?: number[]): ReasonsTrendPoint[] {
    return rsnSpark.map((monthQty, i) => {
        const kindQty = kindSpark[i] || 0;
        const comp = prodSpark?.[i] || 0;
        return {
            mo: i + 1,
            label: REASONS_MONTH_LABELS[i],
            qty: monthQty,
            pct: prodSpark
                ? (comp > 0 ? (monthQty / comp) * 100 : 0)
                : (kindQty > 0 ? (monthQty / kindQty) * 100 : 0),
            delta: i === 0 ? null : monthQty - rsnSpark[i - 1],
        };
    });
}

function buildCodeware(
    rows: ReasonsDetailRow[],
    prodByCode: Map<string, number>,
    topN: number,
    minQtyproc = REASONS_CODEWARE_MIN_QTYPROC,
    splitTone = false,
): { codeware: ReasonsCodewareItem[]; other?: ReasonsCodewareItem } {
    const byKey = new Map<string, { code: string; qty: number; tone?: ReasonsFocusTone; desc1?: string; desc2?: string }>();
    for (const row of rows) {
        const qty = Number(row.qty) || 0;
        if (qty <= 0) continue;
        const code = String(row.code || '').trim();
        if (!code) continue;
        const tone = splitTone ? focusToneOf(row.tone) : undefined;
        const key = splitTone ? `${tone || '_'}\t${code}` : code;
        const desc1 = String(row.desc1 || '').trim() || code;
        const desc2 = String(row.desc2 || '').trim();
        const slot = byKey.get(key) || { code, qty: 0, tone, desc1, desc2: desc2 || undefined };
        slot.qty += qty;
        if (!slot.desc1 && desc1) slot.desc1 = desc1;
        if (!slot.desc2 && desc2) slot.desc2 = desc2;
        byKey.set(key, slot);
    }
    const ranked = [...byKey.entries()]
        .map(([key, row]) => {
            const qtyproc = prodByCode.get(key) || 0;
            const item: ReasonsCodewareItem = {
                code: row.code,
                qty: row.qty,
                qtyproc,
                pct: qtyproc > 0 ? (row.qty / qtyproc) * 100 : 0,
            };
            if (row.tone) item.tone = row.tone;
            if (row.desc1) item.desc1 = row.desc1;
            if (row.desc2) item.desc2 = row.desc2;
            return item;
        })
        .filter((row) => row.qtyproc >= minQtyproc)
        .sort((a, b) => b.pct - a.pct || b.qty - a.qty || a.code.localeCompare(b.code, 'th'));
    const top = ranked.slice(0, topN);
    const rest = ranked.slice(topN);
    const otherQty = rest.reduce((sum, row) => sum + row.qty, 0);
    const otherProc = rest.reduce((sum, row) => sum + row.qtyproc, 0);
    const other = otherQty > 0.0001
        ? {
            code: 'Other',
            qty: otherQty,
            qtyproc: otherProc,
            pct: otherProc > 0 ? (otherQty / otherProc) * 100 : 0,
        }
        : undefined;
    return { codeware: top, other };
}

function trendHasQty(trend: ReasonsTrendPoint[]): boolean {
    return trend.some((point) => (Number(point.qty) || 0) > 0);
}

function namedTrendsForTones(
    tones: readonly ReasonsFocusTone[],
    trendOf: (tone: ReasonsFocusTone) => ReasonsTrendPoint[],
): ReasonsNamedTrend[] | undefined {
    const items = tones
        .map((tone) => ({
            key: tone,
            label: REASONS_TONE_LABEL[tone],
            color: REASONS_TONE_COLOR[tone],
            trend: trendOf(tone),
        }))
        .filter((item) => trendHasQty(item.trend));
    return items.length ? items : undefined;
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
            : family === 'all'
                ? [...REASONS_FOCUS_TONES]
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
    const present = tones.filter((tone) => qtyByTone[tone] > 0);
    const total = present.reduce((sum, tone) => sum + qtyByTone[tone], 0);
    if (total <= 0) return undefined;
    return present.map((tone) => ({
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
    prodRows: ReasonsProdRow[],
    params: ReasonsSliceParams,
    options?: { generatedAt?: string; stale?: boolean; topN?: number },
): SliceBuild {
    const mix = mixFromDetail(params);
    const slicedMonths = monthRows.filter((row) => matchesReasonsMix(row, mix));
    const slicedProds = prodRows.filter((row) => matchesReasonsMix(row, mix));
    const byRsn = aggregateByRsn(slicedMonths);
    const qtyproc = sumQtyproc(slicedProds);
    const ranked = [...byRsn.entries()]
        .map(([rsn, row]) => ({
            rsn,
            qty: row.qty,
            pct: qtyproc > 0 ? (row.qty / qtyproc) * 100 : 0,
        }))
        .sort((a, b) => b.pct - a.pct || b.qty - a.qty || a.rsn.localeCompare(b.rsn, 'th'));
    const thisAgg = byRsn.get(params.rsn) || { qty: 0, spark: emptySpark() };
    const rankIdx = ranked.findIndex((row) => row.rsn === params.rsn);
    const rank = thisAgg.qty > 0 && rankIdx >= 0 ? rankIdx + 1 : null;
    const pct = qtyproc > 0 ? (thisAgg.qty / qtyproc) * 100 : 0;
    const kindSpark = kindSparkFromAggs(byRsn);
    const trend = buildTrend(thisAgg.spark, kindSpark, prodSparkFromRows(slicedProds));
    const peak = peakFromSpark(thisAgg.spark);
    const slicedCodes = codeRows.filter((row) => matchesReasonsMix(row, mix));
    const splitTone = params.tone === 'all';
    const minQtyproc = mixIsNarrow(mix) ? 0 : REASONS_CODEWARE_MIN_QTYPROC;
    let { codeware, other } = buildCodeware(
        slicedCodes,
        prodProcByCode(slicedProds, splitTone),
        options?.topN ?? REASONS_CODEWARE_TOP_N,
        minQtyproc,
        splitTone,
    );
    if (codeware.length === 0 && !other && slicedCodes.some((row) => (Number(row.qty) || 0) > 0)) {
        ({ codeware, other } = buildCodeware(
            slicedCodes,
            prodProcByCode(slicedProds, splitTone),
            options?.topN ?? REASONS_CODEWARE_TOP_N,
            0,
            splitTone,
        ));
    }

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
    prodRows: ReasonsProdRow[],
    params: ReasonsSliceParams,
    options?: { generatedAt?: string; stale?: boolean; topN?: number },
): ReasonsDetailResponse {
    if (params.family === 'all') {
        const activeTone = isReasonsFocusTone(params.tone) ? params.tone : 'white';
        const series: ReasonsToneSeries[] = REASONS_FOCUS_TONES.map((tone) => {
            const slice = buildSlice(
                monthRows,
                codeRows,
                prodRows,
                { ...params, family: 'all', tone },
                options,
            );
            return { tone, meta: { ...slice.meta, family: 'all', tone }, trend: slice.trend };
        });
        const active = buildSlice(
            monthRows,
            codeRows,
            prodRows,
            { ...params, family: 'all', tone: activeTone },
            options,
        );
        const mixed = params.tone === 'all'
            ? buildSlice(monthRows, codeRows, prodRows, { ...params, family: 'all', tone: 'all' }, options)
            : active;
        const payload: ReasonsDetailResponse = {
            meta: { ...mixed.meta, family: 'all', tone: params.tone === 'all' ? 'all' : activeTone },
            trend: mixed.trend,
            codeware: mixed.codeware,
            series,
            activeTone,
        };
        if (mixed.other) payload.other = mixed.other;
        if (params.tone === 'all') {
            const familyShare = buildFamilyShare(
                monthRows.filter((row) => matchesReasonsMix(row, mixFromDetail({ ...params, family: 'all', tone: 'all' }))),
                params.rsn,
                'all',
            );
            if (familyShare) payload.familyShare = familyShare;
            const compare = namedTrendsForTones(
                REASONS_FOCUS_TONES,
                (tone) => series.find((item) => item.tone === tone)?.trend || [],
            );
            if (compare) payload.compare = compare;
        }
        return payload;
    }

    const slice = buildSlice(monthRows, codeRows, prodRows, params, options);
    const payload: ReasonsDetailResponse = {
        meta: slice.meta,
        trend: slice.trend,
        codeware: slice.codeware,
    };
    if (slice.other) payload.other = slice.other;
    const familyShare = buildFamilyShare(
        monthRows.filter((row) => matchesReasonsMix(row, mixFromDetail(params))),
        params.rsn,
        params.family,
    );
    if (familyShare) payload.familyShare = familyShare;
    const pair = compareTonesForSlice(params.family, params.tone);
    if (pair) {
        const compare = namedTrendsForTones(pair, (tone) => buildSlice(
            monthRows,
            codeRows,
            prodRows,
            { ...params, tone },
            options,
        ).trend);
        if (compare) payload.compare = compare;
    }
    return payload;
}

export type ReasonsOverviewTopItem = {
    rsn: string;
    qty: number;
    pct: number;
    spark: number[];
    share?: number;
    cum?: number;
    other?: boolean;
    otherCount?: number;
    origin?: string;
    toneOrigin?: string;
};

export type ReasonsOverviewCard = {
    tone: ReasonsFocusTone;
    label: string;
    qty: number;
    qtyproc: number;
    rate: number;
    pct: number;
    top: ReasonsOverviewTopItem[];
    spark: number[];
    trend: ReasonsTrendPoint[];
};

export type ReasonsOverviewResponse = {
    mode: 'quad' | 'scope';
    meta: {
        year: ReasonsYearParam;
        years?: number[];
        kind: ReasonsKind;
        family: ReasonsFamily;
        tone: ReasonsToneParam;
        qty: number;
        qtyproc: number;
        reasonCount: number;
        generatedAt: string;
        stale: boolean;
    };
    cards?: ReasonsOverviewCard[];
    top?: ReasonsOverviewTopItem[];
    rsnOptions?: string[];
    trend?: ReasonsTrendPoint[];
    compare?: ReasonsNamedTrend[];
    yearStats?: ReasonsYearStat[];
    groupOptions?: ReasonsGroupOption[];
};

export function paretoTopItems(
    items: ReasonsOverviewTopItem[],
    n = REASONS_PARETO_TOP_N,
): ReasonsOverviewTopItem[] {
    const named = items.filter((item) => !item.other && item.rsn !== REASONS_PARETO_OTHER);
    const total = named.reduce((sum, item) => sum + item.qty, 0);
    const sorted = [...named].sort((a, b) => b.qty - a.qty || a.rsn.localeCompare(b.rsn, 'th'));
    const k = Math.min(Math.max(n, 0), sorted.length);
    const top = sorted.slice(0, k);
    const rest = sorted.slice(k);
    const restQty = rest.reduce((sum, item) => sum + item.qty, 0);
    const rows = restQty > 0
        ? [...top, {
            rsn: REASONS_PARETO_OTHER,
            qty: restQty,
            pct: 0,
            spark: [],
            other: true,
            otherCount: rest.length,
        }]
        : top;
    let cum = 0;
    return rows.map((item) => {
        const share = total > 0 ? (item.qty / total) * 100 : 0;
        cum += share;
        return { ...item, share, cum };
    });
}

/** Full ranking for the Overview Pareto — every reason, no Other bucket. */
export function paretoAllItems(items: ReasonsOverviewTopItem[]): ReasonsOverviewTopItem[] {
    const total = items.reduce((sum, item) => sum + item.qty, 0);
    const sorted = [...items].sort((a, b) => b.qty - a.qty || a.rsn.localeCompare(b.rsn, 'th'));
    let cum = 0;
    return sorted.map((item) => {
        const share = total > 0 ? (item.qty / total) * 100 : 0;
        cum += share;
        return { ...item, share, cum };
    });
}

function rankedFromRows(
    defects: ReasonsMonthRow[],
    prods: ReasonsProdRow[],
    family: ReasonsFamily = 'all',
): {
    items: ReasonsOverviewTopItem[];
    qty: number;
    qtyproc: number;
    spark: number[];
    reasonCount: number;
} {
    const byRsn = aggregateByRsn(defects);
    const qty = [...byRsn.values()].reduce((sum, row) => sum + row.qty, 0);
    const qtyproc = sumQtyproc(prods);
    const spark = kindSparkFromAggs(byRsn);
    const items = [...byRsn.entries()]
        .map(([rsn, row]) => {
            const toneOrigin = toneOriginLabelFromQty(row.tones);
            return {
                rsn,
                qty: row.qty,
                pct: qtyproc > 0 ? (row.qty / qtyproc) * 100 : 0,
                spark: row.spark,
                origin: family === 'ww' || family === 'dw' ? toneOrigin : originLabelFromQty(row.ww, row.dw),
                toneOrigin,
            };
        })
        .sort((a, b) => b.pct - a.pct || b.qty - a.qty || a.rsn.localeCompare(b.rsn, 'th'));
    return { items, qty, qtyproc, spark, reasonCount: items.length };
}

function scopeTrendFromSparks(defectSpark: number[], prodSpark: number[]): ReasonsTrendPoint[] {
    return defectSpark.map((qty, index) => {
        const prev = index > 0 ? defectSpark[index - 1] : null;
        const comp = prodSpark[index] || 0;
        return {
            mo: index + 1,
            label: REASONS_MONTH_LABELS[index],
            qty,
            pct: comp > 0 ? (qty / comp) * 100 : 0,
            delta: prev == null ? null : qty - prev,
        };
    });
}

function tonesForOverview(family: ReasonsFamily, tone: ReasonsToneParam): ReasonsFocusTone[] {
    if (isReasonsFocusTone(tone)) return [tone];
    if (family === 'ww') return ['white', 'black'];
    if (family === 'dw') return ['inglaze', 'onglaze'];
    return [...REASONS_FOCUS_TONES];
}

/** Layer A overview — one in-memory pass over year×kind cache. Ranked by sub_qty / qtyproc. */
export function buildReasonsOverview(
    rows: ReasonsMonthRow[],
    prods: ReasonsProdRow[],
    params: ReasonsMixParams & { year: ReasonsYearParam; kind: ReasonsKind },
    options?: { generatedAt?: string; stale?: boolean },
): ReasonsOverviewResponse {
    const generatedAt = options?.generatedAt || formatGeneratedAt();
    const stale = Boolean(options?.stale);
    const sliced = rows.filter((row) => matchesReasonsMix(row, params));
    const slicedProds = prods.filter((row) => matchesReasonsMix(row, params));
    const ranked = rankedFromRows(sliced, slicedProds, params.family);
    const tones = tonesForOverview(params.family, params.tone);
    const cards: ReasonsOverviewCard[] = tones.map((tone) => {
        const mix = { ...params, family: params.family === 'all' ? 'all' as const : familyForFocusTone(tone), tone };
        const toneRows = rows.filter((row) => matchesReasonsMix(row, mix));
        const toneProds = prods.filter((row) => matchesReasonsMix(row, mix));
        const toneRanked = rankedFromRows(toneRows, toneProds, mix.family);
        const toneTrend = scopeTrendFromSparks(toneRanked.spark, prodSparkFromRows(toneProds));
        return {
            tone,
            label: REASONS_TONE_LABEL[tone],
            qty: toneRanked.qty,
            qtyproc: toneRanked.qtyproc,
            rate: toneRanked.qtyproc > 0 ? (toneRanked.qty / toneRanked.qtyproc) * 100 : 0,
            pct: 0,
            top: paretoTopItems(toneRanked.items),
            spark: toneRanked.spark,
            trend: toneTrend,
        };
    });
    const cardQty = cards.reduce((sum, card) => sum + card.qty, 0);
    for (const card of cards) {
        card.pct = cardQty > 0 ? (card.qty / cardQty) * 100 : 0;
    }

    const pair = compareTonesForSlice(params.family, params.tone);
    const compare = pair
        ? pair.map((tone) => {
            const card = cards.find((item) => item.tone === tone);
            return {
                key: tone,
                label: REASONS_TONE_LABEL[tone],
                color: REASONS_TONE_COLOR[tone],
                trend: card?.trend || [],
            };
        })
        : undefined;

    return {
        mode: params.family === 'all' ? 'quad' : 'scope',
        meta: {
            year: params.year,
            kind: params.kind,
            family: params.family,
            tone: params.tone,
            qty: ranked.qty,
            qtyproc: ranked.qtyproc,
            reasonCount: ranked.reasonCount,
            generatedAt,
            stale,
        },
        cards,
        top: paretoAllItems(ranked.items),
        rsnOptions: ranked.items.map((item) => item.rsn),
        trend: scopeTrendFromSparks(ranked.spark, prodSparkFromRows(slicedProds)),
        compare,
    };
}

export function yearStatFromTotals(
    year: number,
    qty: number,
    qtyproc: number,
    index: number,
): ReasonsYearStat {
    return {
        year,
        qty,
        qtyproc,
        pct: qtyproc > 0 ? (qty / qtyproc) * 100 : 0,
        color: reasonsYearColor(index),
    };
}

export function mergeReasonsYearOverviews(
    parts: { year: number; payload: ReasonsOverviewResponse }[],
    combined: ReasonsOverviewResponse,
): ReasonsOverviewResponse {
    if (parts.length <= 1) return combined;
    const years = parts.map((part) => part.year);
    const latest = parts[0].payload;
    const cards = (combined.cards || []).map((card) => {
        const src = (latest.cards || []).find((item) => item.tone === card.tone);
        return src ? { ...card, spark: src.spark, trend: src.trend } : card;
    });
    return {
        ...combined,
        cards,
        trend: latest.trend,
        compare: yearCompareSeries(parts.map((part) => ({
            year: part.year,
            trend: part.payload.trend || [],
        }))),
        yearStats: parts.map((part, index) => yearStatFromTotals(
            part.year,
            part.payload.meta.qty,
            part.payload.meta.qtyproc,
            index,
        )),
        meta: {
            ...combined.meta,
            year: 'all',
            years,
        },
    };
}

export function mergeReasonsYearDetails(
    parts: { year: number; payload: ReasonsDetailResponse }[],
    combined: ReasonsDetailResponse,
): ReasonsDetailResponse {
    if (parts.length <= 1) return combined;
    const years = parts.map((part) => part.year);
    const latest = parts[0].payload;
    const merged: ReasonsDetailResponse = {
        ...combined,
        meta: {
            ...combined.meta,
            year: 'all',
            years,
            delta: latest.meta.delta,
            peakMo: latest.meta.peakMo,
            peakLabel: latest.meta.peakLabel,
            peakQty: latest.meta.peakQty,
        },
        trend: latest.trend,
        compare: parts.map((part, index) => ({
            key: `y${part.year}`,
            label: String(part.year),
            color: reasonsYearColor(index),
            trend: part.payload.trend,
        })),
        yearStats: parts.map((part, index) => {
            const qty = part.payload.meta.qty;
            const pct = part.payload.meta.pct;
            const qtyproc = pct > 0 ? qty / (pct / 100) : 0;
            return yearStatFromTotals(part.year, qty, qtyproc, index);
        }),
        series: (combined.series || latest.series)?.map((item) => ({
            ...item,
            trend: latest.series?.find((row) => row.tone === item.tone)?.trend || item.trend,
            compare: parts.map((part, index) => ({
                key: `y${part.year}`,
                label: String(part.year),
                color: reasonsYearColor(index),
                trend: part.payload.series?.find((row) => row.tone === item.tone)?.trend || [],
            })),
        })),
    };
    return merged;
}