import { isC1SpecialReasonForRecord, isSomboonCpC } from '@/lib/c1-special-reason';
import { matchesSelectedProduct } from '@/lib/product-sorting-log';
import { normalizeMDate } from '@/lib/utils';
import type { CPData, DataItem, Metrics } from '@/types/dashboard';

function emptyMetrics(): Metrics {
    return {
        totalQtyp: 0,
        totalQtycomp: 0,
        totalScrap: 0,
        totalReject: 0,
        compRate: '0',
        scrapRate: '0',
        rejectRate: '0',
    };
}

function finalizeMetrics(m: Metrics): Metrics {
    const q = m.totalQtyp || 0;
    return {
        ...m,
        compRate: q > 0 ? ((m.totalQtycomp / q) * 100).toFixed(1) : '0',
        scrapRate: q > 0 ? ((m.totalScrap / q) * 100).toFixed(1) : '0',
        rejectRate: q > 0 ? ((m.totalReject / q) * 100).toFixed(1) : '0',
    };
}

/**
 * Build CP breakdown from raw sorting rows (client-side), optionally limited to exact dates.
 * Used by Product Analysis Table tab when capsule dates are selected.
 */
export function buildCpBreakdownFromRaw(
    raw: DataItem[],
    selectedProduct: string,
    startDate: string,
    endDate: string,
    exactDates?: string[] | null,
): CPData[] {
    const allowExact =
        exactDates && exactDates.length > 0 ? new Set(exactDates) : null;

    const jobs = new Map<
        string,
        { cp: string; qtyp: number; qtycomp: number; qtyscrp: number; qtyrjct: number }
    >();
    const specialAdj = new Map<string, number>();

    for (const item of raw) {
        if (!matchesSelectedProduct(item, selectedProduct)) continue;
        const d = normalizeMDate(item.m_date);
        if (!d) continue;
        if (allowExact) {
            if (!allowExact.has(d)) continue;
        } else {
            if (d < startDate || d > endDate) continue;
        }

        const displayCp = isSomboonCpC(item) ? 'C1' : (item.m_cp || '').trim().toUpperCase() || 'Unknown';
        const key = `${d}|${item.m_doc}|${item.m_job}|${item.m_kiln}|${displayCp}`;

        if (!jobs.has(key)) {
            jobs.set(key, {
                cp: displayCp,
                qtyp: item.qtyp || 0,
                qtycomp: item.qtycomp || 0,
                qtyscrp: item.qtyscrp || 0,
                qtyrjct: item.qtyrjct || 0,
            });
            if (isSomboonCpC(item) && item.c1_special_qty) {
                specialAdj.set(key, (specialAdj.get(key) || 0) + item.c1_special_qty);
            }
        }

        if (isC1SpecialReasonForRecord(item)) {
            specialAdj.set(key, (specialAdj.get(key) || 0) + (item.sub_qty || 0));
        }
    }

    specialAdj.forEach((adj, key) => {
        const job = jobs.get(key);
        if (!job) return;
        job.qtycomp += adj;
        job.qtyrjct = Math.max(0, job.qtyrjct - adj);
    });

    const byCp = new Map<string, Metrics>();
    jobs.forEach((job) => {
        const m = byCp.get(job.cp) || emptyMetrics();
        m.totalQtyp += job.qtyp;
        m.totalQtycomp += job.qtycomp;
        m.totalScrap += job.qtyscrp;
        m.totalReject += job.qtyrjct;
        byCp.set(job.cp, m);
    });

    return [...byCp.entries()].map(([m_cp, metrics]) => ({
        m_cp,
        metrics: finalizeMetrics(metrics),
        reasons: { C: [], P: [] },
    }));
}
