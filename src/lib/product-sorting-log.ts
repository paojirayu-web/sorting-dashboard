import { isC1SpecialReasonForRecord, isSomboonCpC } from '@/lib/c1-special-reason';
import { isRejectSubTyp, isScrapSubTyp } from '@/lib/sub-typ';
import { normalizeMDate } from '@/lib/utils';
import type { DataItem, GroupedRow } from '@/types/dashboard';

export function matchesSelectedProduct(
    item: DataItem,
    selectedProduct: string,
): boolean {
    if (selectedProduct.startsWith('DW:')) {
        const rest = selectedProduct.slice(3);
        const sepIdx = rest.indexOf('|||');
        if (sepIdx !== -1) {
            const pt_desc2 = rest.slice(0, sepIdx).trim();
            const pt_desc1 = rest.slice(sepIdx + 3).trim();
            return (
                (item.pt_desc2 || '').trim() === pt_desc2 &&
                (item.pt_desc1 || '').trim() === pt_desc1 &&
                (item.m_part || '').startsWith('143')
            );
        }
        const pt_desc2 = rest.trim();
        return (item.pt_desc2 || '').trim() === pt_desc2 && (item.m_part || '').startsWith('143');
    }
    return (item.pt_desc1 || '').trim() === selectedProduct.trim();
}

export function getDisplayCpFromItem(item: DataItem): string {
    return isSomboonCpC(item) ? 'C1' : item.m_cp;
}

/** Empty, or includes ALL → no filter on that dimension. */
export function matchesMultiFilter(selected: string[], value: string): boolean {
    if (selected.length === 0 || selected.includes('ALL')) return true;
    return selected.includes(value);
}

export function matchesAnalysisDateRange(
    item: DataItem,
    startDate: string,
    endDate: string,
): boolean {
    if (!startDate || !endDate) return true;
    const dateStr = normalizeMDate(item.m_date);
    if (!dateStr) return false;
    return dateStr >= startDate && dateStr <= endDate;
}

/** Kilns excluded from the default Kiln filter selection. */
export const DEFAULT_EXCLUDED_KILNS = ['REWORK'] as const;

export function getDefaultLogKilnFilters(kilnOptions: string[]): string[] {
    if (kilnOptions.length === 0) return ['ALL'];

    const excluded = new Set<string>(DEFAULT_EXCLUDED_KILNS);
    const selected = kilnOptions.filter((k) => !excluded.has(k));

    if (selected.length === 0 || selected.length === kilnOptions.length) {
        return ['ALL'];
    }

    return selected;
}

export function buildProductSortingLogRows(
    allData: DataItem[],
    selectedProduct: string,
    logCpFilters: string[],
    logKilnFilters: string[],
    startDate: string,
    endDate: string,
): GroupedRow[] {
    if (!allData.length || !selectedProduct) return [];

    const grouped = new Map<string, GroupedRow>();

    allData
        .filter((item) => {
            if (!matchesSelectedProduct(item, selectedProduct)) return false;
            if (!matchesAnalysisDateRange(item, startDate, endDate)) return false;
            const displayCp = getDisplayCpFromItem(item);
            if (!matchesMultiFilter(logCpFilters, displayCp)) return false;
            if (!matchesMultiFilter(logKilnFilters, item.m_kiln)) return false;
            return true;
        })
        .forEach((item) => {
            const dateStr = normalizeMDate(item.m_date);
            const displayCp = getDisplayCpFromItem(item);
            const key = `${item.m_doc}-${item.m_job}-${dateStr}-${item.m_kiln}-${displayCp}`;

            if (!grouped.has(key)) {
                grouped.set(key, {
                    ...item,
                    m_cp: displayCp,
                    cdReasons: new Map<string, number>(),
                    pjReasons: new Map<string, number>(),
                    totalScrap: item.qtyscrp || 0,
                    totalReject: item.qtyrjct || 0,
                });
            }
            const g = grouped.get(key)!;

            if (item.rsn_desc) {
                if (isC1SpecialReasonForRecord(item)) {
                    g.qtycomp += item.sub_qty || 0;
                    g.totalReject = Math.max(0, g.totalReject - (item.sub_qty || 0));
                } else if (isScrapSubTyp(item.sub_typ)) {
                    g.cdReasons.set(
                        item.rsn_desc,
                        (g.cdReasons.get(item.rsn_desc) || 0) + (item.sub_qty || 0),
                    );
                } else if (isRejectSubTyp(item.sub_typ)) {
                    g.pjReasons.set(
                        item.rsn_desc,
                        (g.pjReasons.get(item.rsn_desc) || 0) + (item.sub_qty || 0),
                    );
                }
            }
        });

    return Array.from(grouped.values()).sort((a, b) => {
        const dateA = new Date(a.m_date).getTime();
        const dateB = new Date(b.m_date).getTime();
        if (dateB !== dateA) return dateB - dateA;
        const cpCmp = (a.m_cp || '').localeCompare(b.m_cp || '');
        if (cpCmp !== 0) return cpCmp;
        return (a.m_kiln || '').localeCompare(b.m_kiln || '');
    });
}

export function collectKilnValues(
    allData: DataItem[],
    selectedProduct: string,
    startDate: string,
    endDate: string,
): string[] {
    const kilns = new Set<string>();
    allData.forEach((item) => {
        if (!matchesSelectedProduct(item, selectedProduct)) return;
        if (!matchesAnalysisDateRange(item, startDate, endDate)) return;
        if (item.m_kiln) kilns.add(item.m_kiln);
    });
    return Array.from(kilns).sort();
}

export function collectCpValues(
    allData: DataItem[],
    selectedProduct: string,
    startDate: string,
    endDate: string,
    cpBreakdownMcp?: string[],
): string[] {
    const cps = new Set<string>();
    allData.forEach((item) => {
        if (!matchesSelectedProduct(item, selectedProduct)) return;
        if (!matchesAnalysisDateRange(item, startDate, endDate)) return;
        cps.add(getDisplayCpFromItem(item));
    });
    cpBreakdownMcp?.forEach((cp) => cps.add(cp));
    return Array.from(cps).sort((a, b) => {
        if (a === 'C1') return -1;
        if (b === 'C1') return 1;
        return a.localeCompare(b);
    });
}

export type ProductSortingLogExportRow = Pick<
    GroupedRow,
    | 'pt_desc1'
    | 'pt_desc2'
    | 'm_part'
    | 'm_date'
    | 'm_cp'
    | 'm_kiln'
    | 'qtyp'
    | 'qtycomp'
    | 'totalScrap'
    | 'totalReject'
>;

export function toProductSortingLogExportRows(rows: GroupedRow[]): ProductSortingLogExportRow[] {
    return rows.map((row) => ({
        pt_desc1: row.pt_desc1,
        pt_desc2: row.pt_desc2,
        m_part: row.m_part,
        m_date: row.m_date,
        m_cp: row.m_cp,
        m_kiln: row.m_kiln,
        qtyp: row.qtyp,
        qtycomp: row.qtycomp,
        totalScrap: row.totalScrap,
        totalReject: row.totalReject,
    }));
}
