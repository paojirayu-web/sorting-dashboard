import type { CPData, ReasonBreakdown } from '@/types/dashboard';

export function isPfiringCp(mCp: string): boolean {
    return /^P\d/i.test((mCp || '').trim());
}

export function isMergedPCard(mCp: string): boolean {
    return (mCp || '').startsWith('Combine (');
}

/** e.g. Combine (P1, P2) — uses display m_cp from each merged card. */
export function buildMergedPCardLabel(sourceMcps: string[]): string {
    return `Combine (${sourceMcps.join(', ')})`;
}

export function collectPfiringCps(cps: CPData[]): string[] {
    return cps.filter((cp) => isPfiringCp(cp.m_cp)).map((cp) => cp.m_cp);
}

/** Raw m_cp values for API / reason log filters. */
export function normalizeCpForApi(mCp: string): string {
    if (mCp === 'C1') return 'C';
    return mCp.replace(/ \(Round 1\)$/, '');
}

function mergeReasonLists(items: CPData[], type: 'C' | 'P'): ReasonBreakdown[] {
    const map = new Map<string, number>();
    for (const cp of items) {
        for (const r of cp.reasons[type]) {
            map.set(r.rsn_desc, (map.get(r.rsn_desc) || 0) + r.qty);
        }
    }
    return Array.from(map.entries())
        .map(([rsn_desc, qty]) => ({ rsn_desc, qty, percentage: '0' }))
        .sort((a, b) => b.qty - a.qty);
}

function sumMetrics(items: CPData[]) {
    return items.reduce(
        (acc, cp) => ({
            totalQtyp: acc.totalQtyp + (cp.metrics.totalQtyp || 0),
            totalQtycomp: acc.totalQtycomp + (cp.metrics.totalQtycomp || 0),
            totalScrap: acc.totalScrap + (cp.metrics.totalScrap || 0),
            totalReject: acc.totalReject + (cp.metrics.totalReject || 0),
        }),
        { totalQtyp: 0, totalQtycomp: 0, totalScrap: 0, totalReject: 0 },
    );
}

/**
 * Merge selected P firing CPs into one Combine (…) card.
 * combineSelection: m_cp values to merge (2+ required); empty or 1 = all cards separate.
 */
export function applyCpCardGrouping(cps: CPData[], combineSelection: string[]): CPData[] {
    const pItems = cps.filter((cp) => isPfiringCp(cp.m_cp));
    const allPCps = pItems.map((p) => p.m_cp);
    const toCombine = combineSelection.filter((m) => allPCps.includes(m));

    if (toCombine.length < 2) return cps;

    const combineSet = new Set(toCombine);
    const toMerge = pItems.filter((p) => combineSet.has(p.m_cp));
    const metrics = sumMetrics(toMerge);
    const total = metrics.totalQtyp || 1;

    const merged: CPData = {
        m_cp: buildMergedPCardLabel(toMerge.map((p) => p.m_cp)),
        mergedFromCp: toMerge.map((p) => normalizeCpForApi(p.m_cp)),
        metrics: {
            ...metrics,
            compRate: ((metrics.totalQtycomp / total) * 100).toFixed(1),
            scrapRate: ((metrics.totalScrap / total) * 100).toFixed(1),
            rejectRate: ((metrics.totalReject / total) * 100).toFixed(1),
        },
        reasons: {
            C: mergeReasonLists(toMerge, 'C'),
            P: mergeReasonLists(toMerge, 'P'),
        },
    };

    const result: CPData[] = [];
    for (const cp of cps) {
        if (!isPfiringCp(cp.m_cp)) {
            result.push(cp);
        } else if (!combineSet.has(cp.m_cp)) {
            result.push(cp);
        }
    }
    result.push(merged);
    return result;
}
