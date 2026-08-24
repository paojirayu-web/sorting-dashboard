import { isSomboonCpC } from '@/lib/c1-special-reason';
import type {
    DefectJobMetricRow,
    DefectProductMonthRow,
    DefectTrendRecord,
    DefectWareKilnMonthRow,
} from '@/lib/defect-reason-query';
import { isRejectSubTyp, isScrapSubTyp } from '@/lib/sub-typ';

export type DefectTrendMode = 'scrap' | 'reject';

export const BREAKDOWN_PANEL_TOP_N = 10;
export const BREAKDOWN_MONTH_TOP_N = 10;
/** Minimum ware process qty to include in breakdown ranking */
export const BREAKDOWN_MIN_QTYPROC = 500;

export type DefectChartRow = {
    month: string;
    defectQty: number;
    defectPct: number | null;
    scrapQty: number;
    scrapPct: number | null;
    rejectQty: number;
    totalPct: number | null;
    /** Defect qty as % of total scrap (or reject) qty in the month */
    sharePct: number | null;
};

export type DefectMonthlyBreakdownRow = {
    month: string;
    label: string;
    /** DW (143): pt_desc2 shown below label (pt_desc1) */
    labelSub?: string;
    /** Set when C/P filter is ALL — display CP beside codeware */
    mCp?: string;
    qty: number;
    qtyproc: number;
    /** defect qty / ware process qty (jobs with this defect) */
    pct: number;
    rank: number;
};

export type DefectKilnShareRow = {
    kiln: string;
    qty: number;
    pct: number;
};

export function buildWareBreakdownKey(
    month: string,
    label: string,
    labelSub?: string,
    mCp?: string,
): string {
    return `${month}\0${label}\0${labelSub ?? ''}\0${mCp ?? ''}`;
}

export type SingleDefectTrendResult = {
    chartData: DefectChartRow[];
    total: number;
    cpOptions: string[];
    wareBreakdown: DefectMonthlyBreakdownRow[];
};

export function getDisplayCpFromRecord(record: Pick<DefectTrendRecord, 'm_cp' | 'm_user'>): string {
    const cp = (record.m_cp || '').trim();
    if (isSomboonCpC({ m_user: record.m_user, m_cp: cp })) return 'C1';
    if (cp === 'C(FRIT&BOM)' || cp === 'Cs') return 'C1';
    return cp;
}

function matchesCpFilter(
    record: Pick<DefectTrendRecord, 'm_cp' | 'm_user'>,
    mCpFilter: string,
): boolean {
    if (mCpFilter === 'ALL') return true;
    return getDisplayCpFromRecord(record) === mCpFilter;
}

export function collectDefectCpOptionsFromRecords(records: DefectTrendRecord[]): string[] {
    const cps = new Set<string>();
    records.forEach((record) => {
        const cp = getDisplayCpFromRecord(record);
        if (cp) cps.add(cp);
    });
    return Array.from(cps).sort((a, b) => {
        if (a === 'C1') return -1;
        if (b === 'C1') return 1;
        if (a === 'C') return -1;
        if (b === 'C') return 1;
        return a.localeCompare(b);
    });
}

export function formatDefectProductLabel(row: Pick<DefectProductMonthRow, 'pt_desc1' | 'pt_desc2' | 'm_part'>): string {
    const desc1 = (row.pt_desc1 || '').trim();
    const desc2 = (row.pt_desc2 || '').trim();
    if ((row.m_part || '').startsWith('143') && desc2) {
        return `${desc1} (${desc2})`;
    }
    return desc1;
}

function buildMonthlyJobPct(
    jobMetrics: DefectJobMetricRow[],
    mCpFilter: string,
): Map<string, { qtyp: number; scrap: number; scrapPct: number; reject: number; rejectPct: number }> {
    const byMonth = new Map<string, { qtyp: number; scrap: number; reject: number }>();

    jobMetrics.forEach((row) => {
        if (!matchesCpFilter(row, mCpFilter)) return;
        const bucket = byMonth.get(row.month) || { qtyp: 0, scrap: 0, reject: 0 };
        bucket.qtyp += row.qtyp || 0;
        bucket.scrap += row.qtyscrp || 0;
        bucket.reject += row.qtyrjct || 0;
        byMonth.set(row.month, bucket);
    });

    const result = new Map<string, { qtyp: number; scrap: number; scrapPct: number; reject: number; rejectPct: number }>();
    byMonth.forEach((value, month) => {
        const scrapPct = value.qtyp > 0 ? (value.scrap / value.qtyp) * 100 : 0;
        const rejectPct = value.qtyp > 0 ? (value.reject / value.qtyp) * 100 : 0;
        result.set(month, {
            qtyp: value.qtyp,
            scrap: value.scrap,
            scrapPct: Math.round(scrapPct * 10) / 10,
            reject: value.reject,
            rejectPct: Math.round(rejectPct * 10) / 10,
        });
    });
    return result;
}

function isDwCodeware(mPart: string): boolean {
    return (mPart || '').startsWith('143');
}

export function buildWareBreakdown(
    products: DefectProductMonthRow[],
    mCpFilter: string,
): DefectMonthlyBreakdownRow[] {
    const splitByCp = mCpFilter === 'ALL';
    const byMonth = new Map<
        string,
        Map<string, { label: string; labelSub?: string; mCp?: string; qty: number; qtyproc: number }>
    >();

    products.forEach((row) => {
        if (!matchesCpFilter(row, mCpFilter)) return;
        const desc1 = (row.pt_desc1 || '').trim();
        const desc2 = (row.pt_desc2 || '').trim();
        const isDw = isDwCodeware(row.m_part);
        const label = desc1 || '-';
        const labelSub = isDw && desc2 ? desc2 : undefined;
        const displayCp = splitByCp ? getDisplayCpFromRecord(row) : undefined;
        const groupKey = splitByCp
            ? `${label}\0${labelSub ?? ''}\0${displayCp}`
            : labelSub
              ? `${label}\0${labelSub}`
              : label;

        if (!byMonth.has(row.month)) byMonth.set(row.month, new Map());
        const bucket = byMonth.get(row.month)!;
        const existing = bucket.get(groupKey);
        if (existing) {
            existing.qty += row.qty || 0;
            existing.qtyproc += row.qtyproc || 0;
        } else {
            bucket.set(groupKey, {
                label,
                labelSub,
                mCp: displayCp,
                qty: row.qty || 0,
                qtyproc: row.qtyproc || 0,
            });
        }
    });

    const rows: DefectMonthlyBreakdownRow[] = [];
    byMonth.forEach((labels, month) => {
        const sorted = Array.from(labels.values())
            .filter((entry) => entry.qtyproc >= BREAKDOWN_MIN_QTYPROC)
            .map((entry) => ({
                ...entry,
                pct: entry.qtyproc > 0 ? Math.round((entry.qty / entry.qtyproc) * 1000) / 10 : 0,
            }))
            .sort((a, b) => {
                if (b.pct !== a.pct) return b.pct - a.pct;
                return b.qty - a.qty;
            });
        sorted.forEach((entry, index) => {
            rows.push({
                month,
                label: entry.label,
                labelSub: entry.labelSub,
                mCp: entry.mCp,
                qty: entry.qty,
                qtyproc: entry.qtyproc,
                pct: entry.pct,
                rank: index + 1,
            });
        });
    });

    return rows.sort((a, b) => {
        const monthCmp = b.month.localeCompare(a.month);
        if (monthCmp !== 0) return monthCmp;
        return a.rank - b.rank;
    });
}

export function buildKilnSharesFromWareRows(
    rows: DefectWareKilnMonthRow[],
    mCpFilter: string,
): DefectKilnShareRow[] {
    const byKiln = new Map<string, number>();

    rows.forEach((row) => {
        if (!matchesCpFilter(row, mCpFilter)) return;
        const kiln = (row.kiln || '').trim() || '-';
        byKiln.set(kiln, (byKiln.get(kiln) || 0) + (row.qty || 0));
    });

    const total = Array.from(byKiln.values()).reduce((sum, qty) => sum + qty, 0);
    return Array.from(byKiln.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([kiln, qty]) => ({
            kiln,
            qty,
            pct: total > 0 ? Math.round((qty / total) * 1000) / 10 : 0,
        }));
}

export function getKilnSharesForWare(
    wareKilns: DefectWareKilnMonthRow[],
    month: string,
    label: string,
    labelSub: string | undefined,
    mCpFilter: string,
): DefectKilnShareRow[] {
    const byKiln = new Map<string, number>();

    wareKilns.forEach((row) => {
        if (!matchesCpFilter(row, mCpFilter)) return;
        if (row.month !== month) return;
        if ((row.pt_desc1 || '').trim() !== label) return;
        const desc2 = (row.pt_desc2 || '').trim();
        if (labelSub !== undefined && desc2 !== labelSub) return;
        const kiln = (row.kiln || '').trim() || '-';
        byKiln.set(kiln, (byKiln.get(kiln) || 0) + (row.qty || 0));
    });

    const total = Array.from(byKiln.values()).reduce((sum, qty) => sum + qty, 0);
    return Array.from(byKiln.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([kiln, qty]) => ({
            kiln,
            qty,
            pct: total > 0 ? Math.round((qty / total) * 1000) / 10 : 0,
        }));
}

export function buildSingleDefectTrend(
    records: DefectTrendRecord[],
    jobMetrics: DefectJobMetricRow[],
    products: DefectProductMonthRow[],
    mCpFilter: string,
    mode: DefectTrendMode,
): SingleDefectTrendResult {
    const monthly = new Map<string, number>();
    let total = 0;

    records.forEach((record) => {
        if (!matchesCpFilter(record, mCpFilter)) return;

        const isMatch = mode === 'scrap' ? isScrapSubTyp(record.sub_typ) : isRejectSubTyp(record.sub_typ);
        if (!isMatch) return;

        const qty = record.sub_qty || 0;
        if (qty <= 0) return;

        total += qty;
        monthly.set(record.month, (monthly.get(record.month) || 0) + qty);
    });

    const monthlyJob = buildMonthlyJobPct(jobMetrics, mCpFilter);
    const months = new Set<string>([...monthly.keys(), ...monthlyJob.keys()]);

    const chartData: DefectChartRow[] = Array.from(months)
        .map((month) => {
            const defectQty = monthly.get(month) || 0;
            const job = monthlyJob.get(month);
            const qtyp = job?.qtyp || 0;
            const defectPct = qtyp > 0 ? Math.round((defectQty / qtyp) * 1000) / 10 : null;
            const totalPct =
                job == null
                    ? null
                    : mode === 'scrap'
                      ? job.scrapPct
                      : job.rejectPct;
            const totalQty = mode === 'scrap' ? (job?.scrap ?? 0) : (job?.reject ?? 0);
            const sharePct =
                totalQty > 0 ? Math.round((defectQty / totalQty) * 1000) / 10 : null;

            return {
                month,
                defectQty,
                defectPct,
                scrapQty: job?.scrap || 0,
                scrapPct: job ? job.scrapPct : null,
                rejectQty: job?.reject || 0,
                totalPct,
                sharePct,
            };
        })
        .sort((a, b) => a.month.localeCompare(b.month));

    return {
        chartData,
        total,
        cpOptions: collectDefectCpOptionsFromRecords(records),
        wareBreakdown: buildWareBreakdown(products, mCpFilter),
    };
}
