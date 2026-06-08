import type { GroupedRow } from '@/types/dashboard';

export interface SortingLogMetrics {
    compRate: number;
    scrapRate: number;
    rejectRate: number;
    cdTop2: [string, number][];
    pjTop2: [string, number][];
}

export interface SortingLogTotals {
    qtyp: number;
    qtycomp: number;
    totalScrap: number;
    totalReject: number;
    compRate: number;
    scrapRate: number;
    rejectRate: number;
}

export function computeSortingLogTotals(rows: GroupedRow[]): SortingLogTotals {
    let qtyp = 0;
    let qtycomp = 0;
    let totalScrap = 0;
    let totalReject = 0;
    for (const row of rows) {
        qtyp += row.qtyp || 0;
        qtycomp += row.qtycomp || 0;
        totalScrap += row.totalScrap || 0;
        totalReject += row.totalReject || 0;
    }
    const base = qtyp || 1;
    return {
        qtyp,
        qtycomp,
        totalScrap,
        totalReject,
        compRate: qtyp > 0 ? (qtycomp / base) * 100 : 0,
        scrapRate: qtyp > 0 ? (totalScrap / base) * 100 : 0,
        rejectRate: qtyp > 0 ? (totalReject / base) * 100 : 0,
    };
}

export function getSortingLogMetrics(item: GroupedRow): SortingLogMetrics {
    const compRate = item.qtyp > 0 ? (item.qtycomp / item.qtyp) * 100 : 0;
    const scrapRate = item.qtyp > 0 ? (item.totalScrap / item.qtyp) * 100 : 0;
    const rejectRate = item.qtyp > 0 ? (item.totalReject / item.qtyp) * 100 : 0;
    const cdTop2 = [...item.cdReasons.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2);
    const pjTop2 = [...item.pjReasons.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2);
    return { compRate, scrapRate, rejectRate, cdTop2, pjTop2 };
}
