import type { CPData } from '@/types/dashboard';
import { sortCpBreakdownForDisplay } from '@/lib/firing-cycle-labels';

export type YieldPlanningRow = {
    mCp: string;
    qtyProcess: number;
    qtyGood: number;
    qtyReject: number;
    qtyScrap: number;
};

export type YieldPlanningResult = {
    rows: YieldPlanningRow[];
    divisorCp: string | null;
    divisorProcess: number;
};

export type YieldThroughRoundMetrics = {
    pctA: number;
    pctP: number;
    pctC: number;
    good: number;
    reject: number;
    scrap: number;
    throughMcp: string;
};

export type YieldRoundOption = {
    mCp: string;
    index: number;
};

/** Baseline input round: prefer glaze round C, else first firing C1. */
export function getYieldDivisorCp(cpBreakdown: CPData[]): CPData | null {
    const c = cpBreakdown.find((cp) => cp.m_cp === 'C' && (cp.metrics.totalQtyp || 0) > 0);
    if (c) return c;
    const c1 = cpBreakdown.find((cp) => cp.m_cp === 'C1' && (cp.metrics.totalQtyp || 0) > 0);
    if (c1) return c1;
    return null;
}

export function getYieldRoundOptions(rows: YieldPlanningRow[]): YieldRoundOption[] {
    return rows
        .map((row, index) => ({ mCp: row.mCp, index }))
        .filter(({ index }) => rows[index].qtyProcess > 0);
}

export function computeYieldThroughRound(
    rows: YieldPlanningRow[],
    throughIndex: number,
    divisorProcess: number,
): YieldThroughRoundMetrics | null {
    if (!divisorProcess || throughIndex < 0 || throughIndex >= rows.length) return null;

    const included = rows.slice(0, throughIndex + 1);
    const good = included.reduce((s, r) => s + r.qtyGood, 0);
    const reject = included.reduce((s, r) => s + r.qtyReject, 0);
    const scrap = included.reduce((s, r) => s + r.qtyScrap, 0);
    const ratio = (n: number) => n / divisorProcess;

    return {
        pctA: ratio(good),
        pctP: ratio(reject),
        pctC: ratio(scrap),
        good,
        reject,
        scrap,
        throughMcp: rows[throughIndex].mCp,
    };
}

export function getDefaultThroughRoundIndex(options: YieldRoundOption[]): number {
    if (options.length === 0) return -1;
    return options[options.length - 1].index;
}

export function buildYieldPlanningResult(cpBreakdown: CPData[]): YieldPlanningResult {
    const sorted = sortCpBreakdownForDisplay(cpBreakdown);
    const divisor = getYieldDivisorCp(sorted);

    const rows: YieldPlanningRow[] = sorted.map((cp) => ({
        mCp: cp.m_cp,
        qtyProcess: cp.metrics.totalQtyp || 0,
        qtyGood: cp.metrics.totalQtycomp || 0,
        qtyReject: cp.metrics.totalReject || 0,
        qtyScrap: cp.metrics.totalScrap || 0,
    }));

    return {
        rows,
        divisorCp: divisor?.m_cp ?? null,
        divisorProcess: divisor?.metrics.totalQtyp || 0,
    };
}
