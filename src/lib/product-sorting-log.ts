import { isC1SpecialReasonForRecord, isSomboonCpC } from '@/lib/c1-special-reason';
import { DW_INGLAZE_PRODUCT_PREFIX, ONGLAZE_PRODUCT_PREFIX } from '@/lib/sort-source';
import { isRejectSubTyp, isScrapSubTyp } from '@/lib/sub-typ';
import { normalizeMDate } from '@/lib/utils';
import type { DataItem, GroupedRow } from '@/types/dashboard';

export function parseAnalysisProduct(product: string): {
    kind: 'ww' | 'dw' | 'og';
    pt_desc1: string;
    pt_desc2: string;
} {
    if (product.startsWith(ONGLAZE_PRODUCT_PREFIX)) {
        const rest = product.slice(ONGLAZE_PRODUCT_PREFIX.length);
        const sepIdx = rest.indexOf('|||');
        if (sepIdx !== -1) {
            return {
                kind: 'og',
                pt_desc2: rest.slice(0, sepIdx).trim(),
                pt_desc1: rest.slice(sepIdx + 3).trim(),
            };
        }
        return { kind: 'og', pt_desc2: '', pt_desc1: rest.trim() };
    }
    if (product.startsWith(DW_INGLAZE_PRODUCT_PREFIX)) {
        const rest = product.slice(DW_INGLAZE_PRODUCT_PREFIX.length);
        const sepIdx = rest.indexOf('|||');
        if (sepIdx !== -1) {
            return {
                kind: 'dw',
                pt_desc2: rest.slice(0, sepIdx).trim(),
                pt_desc1: rest.slice(sepIdx + 3).trim(),
            };
        }
        return { kind: 'dw', pt_desc2: rest.trim(), pt_desc1: '' };
    }
    return { kind: 'ww', pt_desc1: product.trim(), pt_desc2: '' };
}

export function matchesSelectedProduct(
    item: DataItem,
    selectedProduct: string,
): boolean {
    const parsed = parseAnalysisProduct(selectedProduct);
    const desc1 = (item.pt_desc1 || '').trim();
    const desc2 = (item.pt_desc2 || '').trim();

    if (parsed.kind === 'og') {
        if (parsed.pt_desc2) return desc2 === parsed.pt_desc2 && desc1 === parsed.pt_desc1;
        return desc1 === parsed.pt_desc1;
    }
    if (parsed.kind === 'dw') {
        if (!(item.m_part || '').startsWith('143')) return false;
        if (parsed.pt_desc1) return desc2 === parsed.pt_desc2 && desc1 === parsed.pt_desc1;
        return desc2 === parsed.pt_desc2;
    }
    return desc1 === parsed.pt_desc1;
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
                const c1Adj =
                    isSomboonCpC(item) && !item.rsn_desc ? item.c1_special_qty || 0 : 0;
                grouped.set(key, {
                    ...item,
                    m_cp: displayCp,
                    qtycomp: (item.qtycomp || 0) + c1Adj,
                    cdReasons: new Map<string, number>(),
                    pjReasons: new Map<string, number>(),
                    totalScrap: item.qtyscrp || 0,
                    totalReject: Math.max(0, (item.qtyrjct || 0) - c1Adj),
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

export function jobReasonQueryCp(displayCp: string): string {
    return displayCp === 'C1' ? 'C' : displayCp;
}

function sameBlankable(a: string | null | undefined, b: string | null | undefined): boolean {
    return String(a || '').trim() === String(b || '').trim();
}

export function applyReasonRowsToGroupedRow(
    row: GroupedRow,
    reasons: Array<{
        m_date?: string;
        m_doc?: string;
        m_job?: string;
        m_kiln?: string;
        m_cp?: string;
        sub_typ?: string;
        rsn_desc?: string;
        sub_qty?: number;
    }>,
): GroupedRow {
    const cdReasons = new Map<string, number>();
    const pjReasons = new Map<string, number>();
    const rawCp = jobReasonQueryCp(row.m_cp);
    const rowDate = normalizeMDate(row.m_date);

    for (const reason of reasons) {
        if (reason.m_date && normalizeMDate(reason.m_date) !== rowDate) continue;
        if (reason.m_doc != null && !sameBlankable(reason.m_doc, row.m_doc)) continue;
        if (reason.m_job != null && !sameBlankable(reason.m_job, row.m_job)) continue;
        if (reason.m_kiln != null && !sameBlankable(reason.m_kiln, row.m_kiln)) continue;
        if (reason.m_cp != null && !sameBlankable(jobReasonQueryCp(String(reason.m_cp)), rawCp)) continue;

        const desc = (reason.rsn_desc || '').trim();
        if (!desc) continue;
        if (
            isC1SpecialReasonForRecord({
                m_user: row.m_user,
                m_cp: rawCp,
                rsn_desc: desc,
            })
        ) {
            continue;
        }
        const qty = reason.sub_qty || 0;
        if (isScrapSubTyp(reason.sub_typ)) {
            cdReasons.set(desc, (cdReasons.get(desc) || 0) + qty);
        } else if (isRejectSubTyp(reason.sub_typ)) {
            pjReasons.set(desc, (pjReasons.get(desc) || 0) + qty);
        }
    }

    return { ...row, cdReasons, pjReasons };
}

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
