/** Qty Process infographic: C / C1 production qty, shape, forming. Port of sorting-production-presentation. */

export const QTYPROC_START = '2023-01-01';
export const QTYPROC_END_EXCL = '2027-01-01';
export const QTYPROC_CE_YEARS = [2023, 2024, 2025, 2026] as const;
export const BE_OFFSET = 543;
export const QTYPROC_BE_YEARS = QTYPROC_CE_YEARS.map((y) => y + BE_OFFSET);
/** Charts / year filter start at 2567 (CE 2024). 2566 is still queried but not shown. */
export const QTYPROC_DISPLAY_BE_YEARS = QTYPROC_BE_YEARS.filter((y) => y >= 2567);
/** Mix year dropdown default — current display year (2569 = 2026). */
export const QTYPROC_DEFAULT_YEAR = QTYPROC_DISPLAY_BE_YEARS[QTYPROC_DISPLAY_BE_YEARS.length - 1];
export const QTYPROC_MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export const QTYPROC_HIDDEN_KEYS = new Set(['unknown', 'unclassified', '']);
export const QTYPROC_UNCLASSIFIED_GROUP = 'unclassified';

export const SHAPE_LABEL: Record<string, string> = {
    plate: 'Plate',
    teapot: 'Teapot',
    jar: 'Jar',
    vessel: 'Pitcher',
    cup: 'Cup',
    acc: 'Acc.',
    mug: 'Mug',
    bowl: 'Bowl',
    lid: 'Lid',
};

export const SHAPE_COLOR: Record<string, string> = {
    mug: '#c45c32',
    plate: '#3b82f6',
    bowl: '#22c55e',
    acc: '#a1a1aa',
    lid: '#eab308',
    jar: '#0ea5e9',
    cup: '#8b5cf6',
    teapot: '#f97316',
    vessel: '#ec4899',
    unknown: '#71717a',
};

export const FORM_COLOR: Record<string, string> = {
    JIG: '#c45c32',
    Casting: '#3b82f6',
    HPC: '#ec4899',
    RAM: '#8b5cf6',
    ISO: '#0ea5e9',
    Unknown: '#71717a',
};

export type QtyProcYearFilter = 'all' | number;
export const QTYPROC_P_ROUNDS = ['P1', 'P2', 'P3', 'P4', 'P5'] as const;
export type QtyProcPRound = (typeof QTYPROC_P_ROUNDS)[number];
/** FF = first fire only (no P). All = include P1–P5. */
export type QtyProcScope = 'ff' | 'all';
export const QTYPROC_SCOPE_OPTIONS: { value: QtyProcScope; label: string }[] = [
    { value: 'ff', label: 'FF' },
    { value: 'all', label: 'All' },
];
export type QtyProcCpFilter = 'all' | 'C' | 'C1' | 'CUSTOM' | 'FRIT' | 'BOM' | QtyProcPRound;
export type QtyProcCp = 'C' | 'FRIT' | 'BOM' | 'CUSTOM_C' | QtyProcPRound;
export type QtyProcLineFilter = 'all' | 'WHITE' | 'BLACK';
export type QtyProcTrendView = 'group' | 'forming';
export const QTYPROC_GLAZE_TYPES = ['T', 'G', 'A', 'SM', 'M'] as const;
export type QtyProcGroupInfo = { code: string; name: string };

const GROUP_FAMILY_COLOR: Record<string, string> = {
    '0': '#71717a',
    '1': '#c45c32',
    '2': '#3b82f6',
    '3': '#22c55e',
    '4': '#a1a1aa',
    '5': '#8b5cf6',
    '6': '#0ea5e9',
    '7': '#ec4899',
    '8': '#eab308',
};

export function qtyProcGroupColor(code: string | null | undefined): string {
    const family = String(code || '').trim()[0] || '0';
    return GROUP_FAMILY_COLOR[family] || '#71717a';
}

export function qtyProcGroupLabels(
    mix: { group?: string; groupLabel?: string }[] | undefined,
): Record<string, string> {
    const out: Record<string, string> = {};
    for (const row of mix || []) {
        const code = String(row.group || '').trim();
        if (!code) continue;
        out[code] = String(row.groupLabel || code).trim() || code;
    }
    return out;
}

/** Empty or `all` means every group. */
export type QtyProcGroupFilter = string[];
export type QtyProcQualityView = 'period' | 'group';

export function qtyProcGroupIsAll(filter: string[] | string | null | undefined): boolean {
    if (filter == null) return true;
    const keys = Array.isArray(filter) ? filter : [filter];
    return keys.length === 0 || keys.every((key) => !key || key === 'all');
}

export function qtyProcGroupsSelected(filter: string[] | string | null | undefined): string[] {
    if (qtyProcGroupIsAll(filter)) return [];
    const keys = Array.isArray(filter) ? filter : [filter];
    return keys.filter((key): key is string => Boolean(key) && key !== 'all');
}

export function qtyProcGroupMatches(
    filter: string[] | string | null | undefined,
    rowGroup: string | null | undefined,
): boolean {
    const selected = qtyProcGroupsSelected(filter);
    if (!selected.length) return true;
    return selected.includes(String(rowGroup || ''));
}

export function qtyProcPruneGroups(selected: string[], keys: string[]): string[] {
    if (qtyProcGroupIsAll(selected)) return selected.length === 0 ? selected : [];
    const next = selected.filter((key) => keys.includes(key));
    return next.length === selected.length ? selected : next;
}

const QTYPROC_SIZE_RE = /\s*\((S|M|L|XL|XXL)\)\s*$/i;
export const QTYPROC_SIZES = ['S', 'M', 'L', 'XL', 'XXL'] as const;
export type QtyProcSize = (typeof QTYPROC_SIZES)[number];
export const QTYPROC_SIZE_COLOR: Record<string, string> = {
    S: '#22c55e',
    M: '#3b82f6',
    L: '#f97316',
    XL: '#a855f7',
    XXL: '#ef4444',
};

/** MUG&CUP (S) → S. Unlabeled → ''. */
export function qtyProcGroupSize(label: string | null | undefined): QtyProcSize | '' {
    const name = String(label || '').trim();
    const match = name.match(/\((S|M|L|XL|XXL)\)/i);
    return match ? (match[1].toUpperCase() as QtyProcSize) : '';
}

/** MUG&CUP (S) / MUG&CUP EMB/DMB (XL) → MUG&CUP. PLATE (L) → PLATE. */
export function qtyProcMajorGroup(label: string | null | undefined): string {
    const name = String(label || '').trim();
    if (!name) return 'Other';
    const noSize = name.replace(QTYPROC_SIZE_RE, '').trim() || name;
    return noSize.split(/\s+/)[0] || noSize;
}

export function qtyProcResolveGroup(
    mPart: string | null | undefined,
    lookup?: Map<string, QtyProcGroupInfo>,
): QtyProcGroupInfo {
    const part = String(mPart || '').trim();
    const hit = part ? lookup?.get(part) : undefined;
    if (hit?.code) {
        return { code: hit.code, name: hit.name || hit.code };
    }
    return { code: QTYPROC_UNCLASSIFIED_GROUP, name: 'Unclassified' };
}

export type QtyProcGlaze = (typeof QTYPROC_GLAZE_TYPES)[number];
export const GLAZE_LABEL: Record<QtyProcGlaze, string> = {
    T: 'Transparent',
    G: 'Glossy',
    A: 'Art',
    SM: 'Semi-matte',
    M: 'Matte',
};

export function pRoundOf(mCp: string | null | undefined): QtyProcPRound | null {
    const match = String(mCp || '').trim().toUpperCase().match(/^P([1-5])/);
    return match ? (`P${match[1]}` as QtyProcPRound) : null;
}

export const QTYPROC_PAGE_TITLE = 'Production Mix';

/** Glaze code from description, e.g. W/W JBSB30/T0040 (VB) → T0040. SM is two letters. */
export function extractGlazeCode(desc: string | null | undefined): string | null {
    if (!desc) return null;
    const match = String(desc).match(/\/([A-Za-z]{1,2}\d{2,})/);
    return match ? match[1].toUpperCase() : null;
}

export function classifyGlaze(desc1: string | null | undefined, desc2?: string | null): QtyProcGlaze | 'unknown' {
    const code = extractGlazeCode(desc1) || extractGlazeCode(desc2);
    if (!code) return 'unknown';
    if (code.startsWith('SM')) return 'SM';
    const ch = code[0];
    if (ch === 'T' || ch === 'G' || ch === 'A' || ch === 'M') return ch;
    return 'unknown';
}

export function isTGlaze(desc: string | null | undefined): boolean {
    const code = extractGlazeCode(desc);
    return !!code && code.startsWith('T');
}

/** First-firing C1: BOM = glaze starts with T; FRIT = special but glaze is not T. */
export function specialKind(desc1: string | null | undefined, desc2: string | null | undefined, firstCp: 'C' | 'C1'): QtyProcCp {
    if (firstCp !== 'C1') return 'C';
    return isTGlaze(desc1) || isTGlaze(desc2) ? 'BOM' : 'FRIT';
}

export function qtyProcCpMatches(filter: QtyProcCpFilter, rowCp: string): boolean {
    if (filter === 'CUSTOM') return rowCp === 'CUSTOM_C';
    if (rowCp === 'CUSTOM_C') return false;
    if (filter === 'all') return true;
    if (filter === 'C') return rowCp === 'C';
    if (filter === 'C1') return rowCp === 'FRIT' || rowCp === 'BOM' || rowCp === 'C1';
    const p = pRoundOf(filter);
    if (p) return pRoundOf(rowCp) === p;
    return rowCp === filter;
}

export function qtyProcRowMatches(filter: QtyProcCpFilter, rowCp: string, scope: QtyProcScope): boolean {
    if (scope !== 'all' && pRoundOf(rowCp)) return false;
    return qtyProcCpMatches(filter, rowCp);
}

/** WW White = unit W5240, WW Black = unit W5241. */
export function qtyProcToneFromUnit(unit: string | null | undefined): string {
    const u = String(unit || '').trim().toUpperCase();
    if (u.startsWith('W5240')) return 'WHITE';
    if (u.startsWith('W5241')) return 'BLACK';
    return 'NA';
}

export function qtyProcLineMatches(filter: QtyProcLineFilter, tone: string): boolean {
    if (filter === 'all') return true;
    const t = String(tone || '').toUpperCase();
    if (filter === 'WHITE') return t === 'WHITE';
    if (filter === 'BLACK') return t === 'BLACK';
    return true;
}

/** Customer label from pt_desc2 (WW/BW ware). */
export function qtyProcCustomer(desc2: string | null | undefined): string {
    const t = String(desc2 || '').replace(/\s+/g, ' ').trim();
    return t || '(blank)';
}

export function qtyProcMixKeys(
    mix: { shape: string; forming: string; customer?: string; group?: string }[] | undefined,
    field: 'shape' | 'forming' | 'customer' | 'group',
): string[] {
    const keys = new Set<string>();
    for (const row of mix || []) {
        const key = field === 'customer'
            ? (row.customer || '(blank)')
            : field === 'group'
                ? (row.group || '')
                : row[field];
        if (!key || (field !== 'customer' && QTYPROC_HIDDEN_KEYS.has(String(key).toLowerCase()))) continue;
        keys.add(key);
    }
    const list = [...keys];
    if (field === 'customer') {
        const named = list.filter((k) => k !== '(blank)').sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
        return keys.has('(blank)') ? [...named, '(blank)'] : named;
    }
    if (field === 'group') {
        return list.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }
    return list.sort();
}

const SKIP_PREFIX = new Set(['W/W', 'WW', 'BIS', 'B/W', 'D/W', 'G/W', 'S/W']);

const SHAPE_BY_2: Record<string, string> = {
    R: 'plate',
    O: 'plate',
    P: 'plate',
    T: 'teapot',
    J: 'jar',
    V: 'vessel',
    C: 'cup',
    A: 'acc',
    M: 'mug',
    E: 'mug',
    S: 'mug',
    B: 'bowl',
};

const FORMING_BY_1: Record<string, string> = {
    I: 'ISO',
    J: 'JIG',
    R: 'RAM',
    C: 'Casting',
    P: 'HPC',
};

export type QtyProcTone = 'WHITE' | 'BLACK' | 'NA';

export type QtyProcJobRow = {
    ce_year: number;
    mo: number;
    m_cp: string;
    is_round1: number;
    m_part?: string | null;
    pt_desc1: string | null;
    pt_desc2?: string | null;
    tone: string;
    qtyp: number;
    qtycomp: number;
    qtyscrp: number;
    qtyrjct: number;
    jobs: number;
};

export type QtyProcYearBlock = {
    qtyproc: number;
    qtycomp: number;
    qtyscrp: number;
    qtyrjct: number;
    c: number;
    c1: number;
    frit: number;
    bom: number;
    p1: number;
    p2: number;
    p3: number;
    p4: number;
    p5: number;
    customC: number;
    jobs: number;
    white: number;
    black: number;
    byShape: Record<string, number>;
    byForming: Record<string, number>;
    months: { m: number; qtyproc: number; qtycomp: number; qtyscrp: number; qtyrjct: number; c: number; c1: number; frit: number; bom: number; p1: number; p2: number; p3: number; p4: number; p5: number; customC: number }[];
};

export type QtyProcMixRow = {
    y: number;
    m: number;
    shape: string;
    forming: string;
    group: string;
    groupLabel: string;
    cp: QtyProcCp;
    tone: string;
    customer: string;
    glaze: string;
    qtyproc: number;
    qtycomp: number;
    qtyscrp: number;
    qtyrjct: number;
};

export type QtyProcReasonKind = 'scrap' | 'reject';

export type QtyProcReasonJobRow = {
    ce_year: number;
    mo: number;
    m_cp: string;
    is_round1: number;
    m_part?: string | null;
    pt_desc1: string | null;
    pt_desc2?: string | null;
    tone: string;
    rsn_desc: string;
    kind: QtyProcReasonKind;
    qty: number;
};

/** Period rsn_desc rows for Top 10 scrap / reject. CUSTOM_C is omitted. */
export type QtyProcReasonRow = {
    y: number;
    m: number;
    rsn_desc: string;
    kind: QtyProcReasonKind;
    shape: string;
    forming: string;
    group: string;
    groupLabel: string;
    cp: QtyProcCp;
    tone: string;
    customer: string;
    glaze: string;
    qty: number;
};

export type QtyProcPayload = {
    loaded: boolean;
    generatedAt: string;
    scope: string;
    dateRange: { min: string; max: string };
    years: number[];
    byYear: Record<string, QtyProcYearBlock>;
    months: { y: number; m: number; qtyproc: number; qtycomp: number; qtyscrp: number; qtyrjct: number; c: number; c1: number; frit: number; bom: number; p1: number; p2: number; p3: number; p4: number; p5: number; customC: number }[];
    mix: QtyProcMixRow[];
    reasons: QtyProcReasonRow[];
    /** Mix charts are ready; Top 10 scrap/reject is still loading. */
    reasonsPending?: boolean;
};

function extractModelCode(desc: string | null | undefined): string | null {
    if (!desc) return null;
    const tokens = desc.trim().split(/\s+/);
    while (tokens.length && SKIP_PREFIX.has(tokens[0].toUpperCase())) {
        tokens.shift();
    }
    const body = tokens.join(' ');
    if (!body) return null;
    const window = body.slice(0, 6);
    let core = window.replace(/[^A-Z0-9-]/gi, '').toUpperCase();
    if (core.length > 6) core = core.slice(0, 6);
    if (core.length < 4) return null;
    if (body.toUpperCase().includes('-L') && !core.includes('-L')) {
        core = `${core}-L`;
    }
    return core;
}

/**
 * Ware-code size letter: W/W JMSC76/T0040 → JMSC76 → S.
 * Format [Forming][Type][Size]…  3rd char S/M/L/X; XX after that is XXL.
 */
export function qtyProcCodewareSize(
    desc1?: string | null,
    desc2?: string | null,
): QtyProcSize | '' {
    const code = extractModelCode(desc1) || extractModelCode(desc2);
    if (!code || code.length < 3) return '';
    const third = code[2].toUpperCase();
    if (third === 'S' || third === 'M' || third === 'L') return third;
    if (third === 'X') return code[3]?.toUpperCase() === 'X' ? 'XXL' : 'XL';
    return '';
}

/** Group label (S) wins. Codeware letter only when the group has no size. */
export function qtyProcResolveSize(
    groupLabel?: string | null,
    desc1?: string | null,
    desc2?: string | null,
): QtyProcSize | '' {
    return qtyProcGroupSize(groupLabel) || qtyProcCodewareSize(desc1, desc2);
}

export function classifyDesc(desc: string | null | undefined): { shape: string; forming: string } {
    const code = extractModelCode(desc);
    if (!code) return { shape: 'unknown', forming: 'Unknown' };
    const forming = FORMING_BY_1[code[0]] || 'Unknown';
    if (code.includes('-L')) return { shape: 'lid', forming };
    const shape = code.length >= 2 ? (SHAPE_BY_2[code[1]] || 'unknown') : 'unknown';
    return { shape, forming };
}

/** WW uses pt_desc1 (same as kiln-dashboard / presentation). Fall back to desc2 only if desc1 does not parse. */
export function classifyProduct(desc1: string | null | undefined, desc2?: string | null): { shape: string; forming: string } {
    const from1 = classifyDesc(desc1);
    if (from1.forming !== 'Unknown' || from1.shape !== 'unknown') return from1;
    return classifyDesc(desc2);
}

export function displayCp(mCp: string | null | undefined, isRound1: number | null | undefined): string {
    const cp = (mCp || '').trim().toUpperCase();
    const p = pRoundOf(cp);
    if (p) return p;
    if (Number(isRound1 || 0) === 1 && cp === 'C') return 'C1';
    if (cp === 'C(FRIT&BOM)' || cp === 'CS' || cp === 'C1') return 'C1';
    return cp === 'C' ? 'C' : cp;
}

function emptyYear(): QtyProcYearBlock {
    return {
        qtyproc: 0,
        qtycomp: 0,
        qtyscrp: 0,
        qtyrjct: 0,
        c: 0,
        c1: 0,
        frit: 0,
        bom: 0,
        p1: 0,
        p2: 0,
        p3: 0,
        p4: 0,
        p5: 0,
        customC: 0,
        jobs: 0,
        white: 0,
        black: 0,
        byShape: {},
        byForming: {},
        months: Array.from({ length: 12 }, (_, i) => ({
            m: i + 1,
            qtyproc: 0,
            qtycomp: 0,
            qtyscrp: 0,
            qtyrjct: 0,
            c: 0,
            c1: 0,
            frit: 0,
            bom: 0,
            p1: 0,
            p2: 0,
            p3: 0,
            p4: 0,
            p5: 0,
            customC: 0,
        })),
    };
}

function num(value: unknown): number {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : 0;
}

function pQtyKey(p: QtyProcPRound): 'p1' | 'p2' | 'p3' | 'p4' | 'p5' {
    return p.toLowerCase() as 'p1' | 'p2' | 'p3' | 'p4' | 'p5';
}

function addQtyProcMix(mix: Map<string, QtyProcMixRow>, row: QtyProcMixRow) {
    const key = `${row.y}|${row.m}|${row.group}|${row.shape}|${row.forming}|${row.cp}|${row.tone}|${row.customer}|${row.glaze}`;
    const existing = mix.get(key);
    if (existing) {
        existing.qtyproc += row.qtyproc;
        existing.qtycomp += row.qtycomp;
        existing.qtyscrp += row.qtyscrp;
        existing.qtyrjct += row.qtyrjct;
        return;
    }
    mix.set(key, { ...row });
}

function addQtyProcReason(reasons: Map<string, QtyProcReasonRow>, row: QtyProcReasonRow) {
    const key = `${row.y}|${row.m}|${row.kind}|${row.rsn_desc}|${row.group}|${row.forming}|${row.cp}|${row.tone}|${row.customer}|${row.glaze}`;
    const existing = reasons.get(key);
    if (existing) {
        existing.qty += row.qty;
        return;
    }
    reasons.set(key, { ...row });
}

function reasonCpOf(row: QtyProcReasonJobRow): QtyProcCp | null {
    const displayed = displayCp(row.m_cp, row.is_round1);
    const p = pRoundOf(displayed);
    if (p) return p;
    if (displayed === 'C1') return specialKind(row.pt_desc1, row.pt_desc2, 'C1');
    if (displayed === 'C') return 'C';
    return null;
}

export function buildQtyProcPayload(
    jobRows: QtyProcJobRow[],
    dateRange: { min: string; max: string },
    scope: string,
    reasonJobs: QtyProcReasonJobRow[] = [],
    groupByPart?: Map<string, QtyProcGroupInfo>,
): QtyProcPayload {
    const productYear = new Map<string, {
        ce: number;
        tone: string;
        desc1: string;
        desc2: string;
        jobs: {
            mo: number;
            cp: 'C' | 'C1';
            shape: string;
            forming: string;
            group: string;
            groupLabel: string;
            qtyproc: number;
            qtycomp: number;
            qtyscrp: number;
            qtyrjct: number;
            jobs: number;
        }[];
    }>();
    const pRows: {
        ce: number;
        mo: number;
        p: QtyProcPRound;
        shape: string;
        forming: string;
        group: string;
        groupLabel: string;
        tone: string;
        customer: string;
        glaze: string;
        qtyproc: number;
        qtycomp: number;
        qtyscrp: number;
        qtyrjct: number;
        jobs: number;
    }[] = [];

    for (const row of jobRows) {
        const ce = Number(row.ce_year);
        if (ce < 2023 || ce > 2026) continue;
        const cp = displayCp(row.m_cp, row.is_round1);
        const { shape, forming } = classifyProduct(row.pt_desc1, row.pt_desc2);
        const groupInfo = qtyProcResolveGroup(row.m_part, groupByPart);
        const desc1 = (row.pt_desc1 || '').trim();
        const desc2 = (row.pt_desc2 || '').trim();
        const tone = row.tone || 'NA';
        const p = pRoundOf(cp);
        if (p) {
            pRows.push({
                ce,
                mo: Number(row.mo) || 1,
                p,
                shape,
                forming,
                group: groupInfo.code,
                groupLabel: groupInfo.name,
                tone,
                customer: qtyProcCustomer(desc2),
                glaze: classifyGlaze(desc1, desc2),
                qtyproc: num(row.qtyp),
                qtycomp: num(row.qtycomp),
                qtyscrp: num(row.qtyscrp),
                qtyrjct: num(row.qtyrjct),
                jobs: Number(row.jobs) || 0,
            });
            continue;
        }
        if (cp !== 'C' && cp !== 'C1') continue;
        const key = `${ce}\0${desc1}\0${desc2}\0${tone}`;
        let bucket = productYear.get(key);
        if (!bucket) {
            bucket = { ce, tone, desc1, desc2, jobs: [] };
            productYear.set(key, bucket);
        }
        bucket.jobs.push({
            mo: Number(row.mo) || 1,
            cp,
            shape,
            forming,
            group: groupInfo.code,
            groupLabel: groupInfo.name,
            qtyproc: num(row.qtyp),
            qtycomp: num(row.qtycomp),
            qtyscrp: num(row.qtyscrp),
            qtyrjct: num(row.qtyrjct),
            jobs: Number(row.jobs) || 0,
        });
    }

    const byYear: Record<string, QtyProcYearBlock> = {};
    for (const y of QTYPROC_CE_YEARS) {
        byYear[String(y + BE_OFFSET)] = emptyYear();
    }
    const mix = new Map<string, QtyProcMixRow>();
    const reasons = new Map<string, QtyProcReasonRow>();

    for (const { ce, tone, desc1, desc2, jobs } of productYear.values()) {
        const be = String(ce + BE_OFFSET);
        const year = byYear[be];
        if (!year) continue;
        const hasC1 = jobs.some((j) => j.cp === 'C1');
        const firstCp: 'C' | 'C1' = hasC1 ? 'C1' : 'C';
        const firstJobs = jobs.filter((j) => j.cp === firstCp);
        const kind = specialKind(desc1, desc2, firstCp);
        const customer = qtyProcCustomer(desc2);
        const glaze = classifyGlaze(desc1, desc2);
        const qty = firstJobs.reduce((s, j) => s + j.qtyproc, 0);
        const comp = firstJobs.reduce((s, j) => s + j.qtycomp, 0);
        const scrap = firstJobs.reduce((s, j) => s + j.qtyscrp, 0);
        const reject = firstJobs.reduce((s, j) => s + j.qtyrjct, 0);
        const jobN = firstJobs.reduce((s, j) => s + j.jobs, 0);
        const shape = firstJobs[0]?.shape || 'unknown';
        const forming = firstJobs[0]?.forming || 'Unknown';

        year.qtyproc += qty;
        year.qtycomp += comp;
        year.qtyscrp += scrap;
        year.qtyrjct += reject;
        year.jobs += jobN;
        if (kind === 'BOM') {
            year.bom += qty;
            year.c1 += qty;
        } else if (kind === 'FRIT') {
            year.frit += qty;
            year.c1 += qty;
        } else {
            year.c += qty;
        }
        if (tone === 'WHITE') year.white += qty;
        else if (tone === 'BLACK') year.black += qty;
        year.byShape[shape] = (year.byShape[shape] || 0) + qty;
        year.byForming[forming] = (year.byForming[forming] || 0) + qty;

        const monthQty = new Map<number, { qtyproc: number; qtycomp: number; qtyscrp: number; qtyrjct: number }>();
        const monthGroupQty = new Map<string, {
            m: number;
            group: string;
            groupLabel: string;
            shape: string;
            forming: string;
            qtyproc: number;
            qtycomp: number;
            qtyscrp: number;
            qtyrjct: number;
        }>();
        for (const j of firstJobs) {
            const slot = monthQty.get(j.mo) || { qtyproc: 0, qtycomp: 0, qtyscrp: 0, qtyrjct: 0 };
            slot.qtyproc += j.qtyproc;
            slot.qtycomp += j.qtycomp;
            slot.qtyscrp += j.qtyscrp;
            slot.qtyrjct += j.qtyrjct;
            monthQty.set(j.mo, slot);
            const gKey = `${j.mo}|${j.group}|${j.shape}|${j.forming}`;
            const gSlot = monthGroupQty.get(gKey) || {
                m: j.mo,
                group: j.group,
                groupLabel: j.groupLabel,
                shape: j.shape,
                forming: j.forming,
                qtyproc: 0,
                qtycomp: 0,
                qtyscrp: 0,
                qtyrjct: 0,
            };
            gSlot.qtyproc += j.qtyproc;
            gSlot.qtycomp += j.qtycomp;
            gSlot.qtyscrp += j.qtyscrp;
            gSlot.qtyrjct += j.qtyrjct;
            monthGroupQty.set(gKey, gSlot);
        }
        for (const [m, q] of monthQty) {
            if (m < 1 || m > 12) continue;
            const slot = year.months[m - 1];
            slot.qtyproc += q.qtyproc;
            slot.qtycomp += q.qtycomp;
            slot.qtyscrp += q.qtyscrp;
            slot.qtyrjct += q.qtyrjct;
            if (kind === 'BOM') {
                slot.bom += q.qtyproc;
                slot.c1 += q.qtyproc;
            } else if (kind === 'FRIT') {
                slot.frit += q.qtyproc;
                slot.c1 += q.qtyproc;
            } else {
                slot.c += q.qtyproc;
            }
        }
        for (const q of monthGroupQty.values()) {
            if (q.m < 1 || q.m > 12) continue;
            addQtyProcMix(mix, {
                y: Number(be),
                m: q.m,
                shape: q.shape,
                forming: q.forming,
                group: q.group,
                groupLabel: q.groupLabel,
                cp: kind,
                tone,
                customer,
                glaze,
                qtyproc: q.qtyproc,
                qtycomp: q.qtycomp,
                qtyscrp: q.qtyscrp,
                qtyrjct: q.qtyrjct,
            });
        }

        if (hasC1) {
            const cByMonth = new Map<number, { qtyproc: number; qtycomp: number; qtyscrp: number; qtyrjct: number }>();
            const cByMonthGroup = new Map<string, {
                m: number;
                group: string;
                groupLabel: string;
                shape: string;
                forming: string;
                qtyproc: number;
                qtycomp: number;
                qtyscrp: number;
                qtyrjct: number;
            }>();
            for (const j of jobs) {
                if (j.cp !== 'C') continue;
                const slot = cByMonth.get(j.mo) || { qtyproc: 0, qtycomp: 0, qtyscrp: 0, qtyrjct: 0 };
                slot.qtyproc += j.qtyproc;
                slot.qtycomp += j.qtycomp;
                slot.qtyscrp += j.qtyscrp;
                slot.qtyrjct += j.qtyrjct;
                cByMonth.set(j.mo, slot);
                const gKey = `${j.mo}|${j.group}|${j.shape}|${j.forming}`;
                const gSlot = cByMonthGroup.get(gKey) || {
                    m: j.mo,
                    group: j.group,
                    groupLabel: j.groupLabel,
                    shape: j.shape,
                    forming: j.forming,
                    qtyproc: 0,
                    qtycomp: 0,
                    qtyscrp: 0,
                    qtyrjct: 0,
                };
                gSlot.qtyproc += j.qtyproc;
                gSlot.qtycomp += j.qtycomp;
                gSlot.qtyscrp += j.qtyscrp;
                gSlot.qtyrjct += j.qtyrjct;
                cByMonthGroup.set(gKey, gSlot);
            }
            const cTotal = [...cByMonth.values()].reduce((s, q) => s + q.qtyproc, 0);
            const cap = Math.min(cTotal, qty);
            const scale = cTotal > 0 ? cap / cTotal : 0;
            for (const [m, q] of cByMonth) {
                const customQty = q.qtyproc * scale;
                if (m < 1 || m > 12 || customQty <= 0) continue;
                year.customC += customQty;
                year.months[m - 1].customC += customQty;
            }
            for (const q of cByMonthGroup.values()) {
                const customQty = q.qtyproc * scale;
                if (q.m < 1 || q.m > 12 || customQty <= 0) continue;
                addQtyProcMix(mix, {
                    y: Number(be),
                    m: q.m,
                    shape: q.shape,
                    forming: q.forming,
                    group: q.group,
                    groupLabel: q.groupLabel,
                    cp: 'CUSTOM_C',
                    tone,
                    customer,
                    glaze,
                    qtyproc: customQty,
                    qtycomp: q.qtycomp * scale,
                    qtyscrp: q.qtyscrp * scale,
                    qtyrjct: q.qtyrjct * scale,
                });
            }
        }
    }

    for (const row of pRows) {
        const be = String(row.ce + BE_OFFSET);
        const year = byYear[be];
        if (!year) continue;
        const field = pQtyKey(row.p);
        year.qtyproc += row.qtyproc;
        year.qtycomp += row.qtycomp;
        year.qtyscrp += row.qtyscrp;
        year.qtyrjct += row.qtyrjct;
        year.jobs += row.jobs;
        year[field] += row.qtyproc;
        if (row.tone === 'WHITE') year.white += row.qtyproc;
        else if (row.tone === 'BLACK') year.black += row.qtyproc;
        year.byShape[row.shape] = (year.byShape[row.shape] || 0) + row.qtyproc;
        year.byForming[row.forming] = (year.byForming[row.forming] || 0) + row.qtyproc;
        if (row.mo < 1 || row.mo > 12) continue;
        const slot = year.months[row.mo - 1];
        slot.qtyproc += row.qtyproc;
        slot.qtycomp += row.qtycomp;
        slot.qtyscrp += row.qtyscrp;
        slot.qtyrjct += row.qtyrjct;
        slot[field] += row.qtyproc;
        addQtyProcMix(mix, {
            y: Number(be),
            m: row.mo,
            shape: row.shape,
            forming: row.forming,
            group: row.group,
            groupLabel: row.groupLabel,
            cp: row.p,
            tone: row.tone,
            customer: row.customer,
            glaze: row.glaze,
            qtyproc: row.qtyproc,
            qtycomp: row.qtycomp,
            qtyscrp: row.qtyscrp,
            qtyrjct: row.qtyrjct,
        });
    }

    for (const row of reasonJobs) {
        const ce = Number(row.ce_year);
        if (ce < 2023 || ce > 2026) continue;
        const rsn = (row.rsn_desc || '').trim();
        const qty = num(row.qty);
        if (!rsn || qty <= 0) continue;
        const cp = reasonCpOf(row);
        if (!cp) continue;
        const mo = Number(row.mo) || 0;
        if (mo < 1 || mo > 12) continue;
        const { shape, forming } = classifyProduct(row.pt_desc1, row.pt_desc2);
        const groupInfo = qtyProcResolveGroup(row.m_part, groupByPart);
        addQtyProcReason(reasons, {
            y: ce + BE_OFFSET,
            m: mo,
            rsn_desc: rsn,
            kind: row.kind === 'reject' ? 'reject' : 'scrap',
            shape,
            forming,
            group: groupInfo.code,
            groupLabel: groupInfo.name,
            cp,
            tone: row.tone || 'NA',
            customer: qtyProcCustomer(row.pt_desc2),
            glaze: classifyGlaze(row.pt_desc1, row.pt_desc2),
            qty,
        });
    }

    const months: QtyProcPayload['months'] = [];
    for (const [be, year] of Object.entries(byYear)) {
        year.qtyproc = Math.round(year.qtyproc);
        year.qtycomp = Math.round(year.qtycomp);
        year.qtyscrp = Math.round(year.qtyscrp);
        year.qtyrjct = Math.round(year.qtyrjct);
        year.c = Math.round(year.c);
        year.c1 = Math.round(year.c1);
        year.frit = Math.round(year.frit);
        year.bom = Math.round(year.bom);
        year.p1 = Math.round(year.p1);
        year.p2 = Math.round(year.p2);
        year.p3 = Math.round(year.p3);
        year.p4 = Math.round(year.p4);
        year.p5 = Math.round(year.p5);
        year.customC = Math.round(year.customC);
        year.white = Math.round(year.white);
        year.black = Math.round(year.black);
        year.byShape = Object.fromEntries(
            Object.entries(year.byShape)
                .map(([k, v]) => [k, Math.round(v)] as const)
                .sort((a, b) => b[1] - a[1]),
        );
        year.byForming = Object.fromEntries(
            Object.entries(year.byForming)
                .map(([k, v]) => [k, Math.round(v)] as const)
                .sort((a, b) => b[1] - a[1]),
        );
        for (const slot of year.months) {
            slot.qtyproc = Math.round(slot.qtyproc);
            slot.qtycomp = Math.round(slot.qtycomp);
            slot.qtyscrp = Math.round(slot.qtyscrp);
            slot.qtyrjct = Math.round(slot.qtyrjct);
            slot.c = Math.round(slot.c);
            slot.c1 = Math.round(slot.c1);
            slot.frit = Math.round(slot.frit);
            slot.bom = Math.round(slot.bom);
            slot.p1 = Math.round(slot.p1);
            slot.p2 = Math.round(slot.p2);
            slot.p3 = Math.round(slot.p3);
            slot.p4 = Math.round(slot.p4);
            slot.p5 = Math.round(slot.p5);
            slot.customC = Math.round(slot.customC);
            months.push({ y: Number(be), ...slot });
        }
    }

    const mixRows = [...mix.values()]
        .map((r) => ({
            ...r,
            qtyproc: Math.round(r.qtyproc),
            qtycomp: Math.round(r.qtycomp),
            qtyscrp: Math.round(r.qtyscrp),
            qtyrjct: Math.round(r.qtyrjct),
        }))
        .filter((r) => r.qtyproc > 0)
        .sort((a, b) => b.qtyproc - a.qtyproc);

    const reasonRows = [...reasons.values()]
        .map((r) => ({ ...r, qty: Math.round(r.qty) }))
        .filter((r) => r.qty > 0)
        .sort((a, b) => b.qty - a.qty || a.rsn_desc.localeCompare(b.rsn_desc));

    return {
        loaded: true,
        generatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        scope,
        dateRange,
        years: [...QTYPROC_DISPLAY_BE_YEARS],
        byYear,
        months,
        mix: mixRows,
        reasons: reasonRows,
    };
}
