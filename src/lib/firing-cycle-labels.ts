import type { CPData } from '@/types/dashboard';

export type FiringCycleRowDef = {
    id: string;
    label: string;
    matchCp: (mCp: string) => boolean;
};

/** กรณีพิเศษ (มี C1 จาก somboon+CP=C): 1st = C1, Frit = C */
export function isSpecialFiringProduct(cpBreakdown: CPData[]): boolean {
    return cpBreakdown.some((cp) => cp.m_cp === 'C1');
}

function getFiringCycleRowDefs(isSpecial: boolean): FiringCycleRowDef[] {
    if (isSpecial) {
        return [
            { id: 'first', label: '1st Firing', matchCp: (cp) => cp === 'C1' },
            { id: 'frit', label: 'Frit Firing', matchCp: (cp) => cp === 'C' },
            { id: 'p1', label: 'P1 Firing', matchCp: (cp) => /^P1(\s|\(|$)/i.test(cp) || cp === 'P1' },
            { id: 'p2', label: 'P2 Firing', matchCp: (cp) => /^P2(\s|\(|$)/i.test(cp) || cp === 'P2' },
        ];
    }

    /** กรณีปกติ: มีแค่ 1st Firing (= C) — แถว Frit ว่างเสมอ */
    return [
        { id: 'first', label: '1st Firing', matchCp: (cp) => cp === 'C' },
        { id: 'frit', label: 'Frit Firing', matchCp: () => false },
        { id: 'p1', label: 'P1 Firing', matchCp: (cp) => /^P1(\s|\(|$)/i.test(cp) || cp === 'P1' },
        { id: 'p2', label: 'P2 Firing', matchCp: (cp) => /^P2(\s|\(|$)/i.test(cp) || cp === 'P2' },
    ];
}

export type FiringCycleQtyRow = {
    label: string;
    mCp?: string;
    qtyProcess: number;
    qtyA: number;
    pctA: number;
    qtyB: number;
    pctB: number;
    qtyP: number;
    pctP: number;
};

function metricsFromCp(cp: CPData): Omit<FiringCycleQtyRow, 'label' | 'mCp'> {
    const total = cp.metrics.totalQtyp || 0;
    const qtyA = cp.metrics.totalQtycomp || 0;
    const qtyB = cp.metrics.totalScrap || 0;
    const qtyP = cp.metrics.totalReject || 0;
    const pct = (qty: number) => (total > 0 ? Math.round((qty / total) * 100) : 0);

    return {
        qtyProcess: total,
        qtyA,
        pctA: pct(qtyA),
        qtyB,
        pctB: pct(qtyB),
        qtyP,
        pctP: pct(qtyP),
    };
}

const emptyRow = (label: string, mCp?: string): FiringCycleQtyRow => ({
    label,
    mCp,
    qtyProcess: 0,
    qtyA: 0,
    pctA: 0,
    qtyB: 0,
    pctB: 0,
    qtyP: 0,
    pctP: 0,
});

export function buildFiringCycleQtyRows(cpBreakdown: CPData[]): FiringCycleQtyRow[] {
    const isSpecial = isSpecialFiringProduct(cpBreakdown);
    const rowDefs = getFiringCycleRowDefs(isSpecial);
    const used = new Set<string>();
    const rows: FiringCycleQtyRow[] = [];

    for (const def of rowDefs) {
        const match = cpBreakdown.find((cp) => def.matchCp(cp.m_cp));
        if (match) {
            used.add(match.m_cp);
            rows.push({ label: def.label, mCp: match.m_cp, ...metricsFromCp(match) });
        } else {
            rows.push(emptyRow(def.label));
        }
    }

    const extras = cpBreakdown
        .filter((cp) => !used.has(cp.m_cp))
        .sort((a, b) => a.m_cp.localeCompare(b.m_cp));

    for (const cp of extras) {
        rows.push({ label: cp.m_cp, mCp: cp.m_cp, ...metricsFromCp(cp) });
    }

    return rows;
}

/** เรียงการ์ดให้สอดคล้องตารางรอบเผา */
export function sortCpBreakdownForDisplay(cpBreakdown: CPData[]): CPData[] {
    const isSpecial = isSpecialFiringProduct(cpBreakdown);
    const order = isSpecial
        ? ['C1', 'C']
        : ['C'];
    const orderIndex = (mCp: string) => {
        const idx = order.indexOf(mCp);
        if (idx !== -1) return idx;
        if (/^P1/i.test(mCp)) return 10;
        if (/^P2/i.test(mCp)) return 11;
        return 50;
    };

    return [...cpBreakdown].sort((a, b) => {
        const diff = orderIndex(a.m_cp) - orderIndex(b.m_cp);
        if (diff !== 0) return diff;
        if (a.m_cp === 'C1') return -1;
        if (b.m_cp === 'C1') return 1;
        return a.m_cp.localeCompare(b.m_cp);
    });
}
