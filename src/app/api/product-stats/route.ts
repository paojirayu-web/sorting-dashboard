/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { isC1SpecialReason } from '@/lib/c1-special-reason';
import {
    ANALYSIS_AUTO_LOOKBACK_YEARS,
    queryProductDateRange,
} from '@/lib/analysis-date-range';
import { buildProductFilter } from '@/lib/product-filter';
import { querySortSources } from '@/lib/sort-query';
import { SORT_VIEW_TOKEN, sourcesForProduct } from '@/lib/sort-source';
import { mapSubTypToBucket } from '@/lib/sub-typ';
import { toFiniteNumber } from '@/lib/utils';
import { buildUnitFilterSql, parseUnitFilterParam } from '@/lib/unit-filter';

type SqlRow = Record<string, any>;

function computedCp(mCp: string, isRound1: boolean): string {
    const cp = (mCp || 'Unknown').trim();
    if (!isRound1) return cp;
    return cp === 'C' ? 'C1' : `${cp} (Round 1)`;
}

function emptyCpBucket() {
    return {
        metrics: {
            totalQtyp: 0,
            totalQtycomp: 0,
            totalScrap: 0,
            totalReject: 0,
            compRate: '0',
            scrapRate: '0',
            rejectRate: '0',
        },
        reasons: { C: [] as { rsn_desc: string; qty: number }[], P: [] as { rsn_desc: string; qty: number }[] },
    };
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const product = searchParams.get('product');
        const unitFilter = parseUnitFilterParam(searchParams.get('unit'));
        const unitSql = buildUnitFilterSql(unitFilter, 'WW');

        if (!product) {
            return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
        }

        const currentYear = new Date().getFullYear();
        const minAllowedYear = currentYear - 2;
        const minAllowedDate = `${minAllowedYear}-01-01`;

        let startDate = searchParams.get('startDate');
        let endDate = searchParams.get('endDate');
        let dateRange: { minDate: string; maxDate: string } | null = null;

        const t0 = Date.now();
        if (!startDate || !endDate) {
            const range = await queryProductDateRange(product, ANALYSIS_AUTO_LOOKBACK_YEARS, unitFilter);
            startDate = range.minDate;
            endDate = range.maxDate;
            dateRange = { minDate: range.minDate, maxDate: range.maxDate };
            console.info(`[product-stats] auto-range ${Date.now() - t0}ms ${startDate}..${endDate}`);
        } else {
            dateRange = { minDate: startDate, maxDate: endDate };
        }

        if (startDate < minAllowedDate) {
            return NextResponse.json({
                error: `Date range exceeded safety limit. Data is available from ${minAllowedDate} onwards.`,
            }, { status: 400 });
        }

        const dateFilter = `AND m_date >= '${startDate}' AND m_date < DATEADD(day, 1, '${endDate}')`;
        const productFilter = buildProductFilter(product);
        const sources = sourcesForProduct(product);

        const tSql = Date.now();
        const [jobsResult, reasonsResult] = await Promise.all([
            querySortSources<SqlRow>(
                `
                SELECT
                    CONVERT(varchar(10), CAST(m_date AS date), 120) AS m_date,
                    m_doc,
                    m_job,
                    m_kiln,
                    UPPER(RTRIM(LTRIM(m_cp))) AS m_cp,
                    MAX(CASE WHEN m_user LIKE 'somboon%' THEN 1 ELSE 0 END) AS is_round1,
                    MAX(qtyp) AS qtyp,
                    SUM(CASE WHEN UPPER(RTRIM(LTRIM(ISNULL(sub_typ, '')))) = 'A' THEN ISNULL(sub_qty, 0) ELSE 0 END) AS qty_grade_a,
                    MAX(qtycomp) AS qtycomp,
                    MAX(qtyscrp) AS qtyscrp,
                    MAX(qtyrjct) AS qtyrjct,
                    MAX(pt_desc1) AS pt_desc1,
                    MAX(pt_desc2) AS pt_desc2,
                    MAX(m_part) AS m_part
                FROM ${SORT_VIEW_TOKEN} WITH (NOLOCK)
                WHERE ${productFilter} AND ${unitSql} ${dateFilter}
                GROUP BY CAST(m_date AS date), m_doc, m_job, m_kiln, UPPER(RTRIM(LTRIM(m_cp)))
                OPTION (RECOMPILE)
            `,
                { sources, required: true },
            ),
            querySortSources<SqlRow>(
                `
                SELECT
                    CONVERT(varchar(10), CAST(m_date AS date), 120) AS m_date,
                    m_doc,
                    m_job,
                    m_kiln,
                    UPPER(RTRIM(LTRIM(m_cp))) AS m_cp,
                    RTRIM(LTRIM(sub_typ)) AS sub_typ,
                    RTRIM(LTRIM(rsn_desc)) AS rsn_desc,
                    SUM(sub_qty) AS sub_qty
                FROM ${SORT_VIEW_TOKEN} WITH (NOLOCK)
                WHERE ${productFilter} AND ${unitSql} ${dateFilter}
                    AND rsn_desc IS NOT NULL
                    AND RTRIM(LTRIM(rsn_desc)) != ''
                GROUP BY CAST(m_date AS date), m_doc, m_job, m_kiln, UPPER(RTRIM(LTRIM(m_cp))), RTRIM(LTRIM(sub_typ)), RTRIM(LTRIM(rsn_desc))
                OPTION (RECOMPILE)
            `,
                { sources },
            ),
        ]);
        console.info(
            `[product-stats] jobs+reasons ${Date.now() - tSql}ms jobs=${jobsResult.recordset.length} reasons=${reasonsResult.recordset.length}`,
        );

        const cpData: Record<string, any> = {};
        const cpReasonMaps: Record<string, { C: Map<string, number>; P: Map<string, number> }> = {};
        const jobRoundMap = new Map<string, number>();
        let pt_desc1 = '';
        let pt_desc2 = '';
        let m_part = '';

        jobsResult.recordset.forEach((row: SqlRow) => {
            const isRound1 = Number(row.is_round1) === 1;
            const cp = computedCp(row.m_cp, isRound1);
            const key = `${row.m_date}|${row.m_doc}|${row.m_job}|${row.m_kiln}|${row.m_cp}`;
            jobRoundMap.set(key, isRound1 ? 1 : 0);

            if (!cpData[cp]) {
                cpData[cp] = emptyCpBucket();
                cpReasonMaps[cp] = { C: new Map<string, number>(), P: new Map<string, number>() };
            }
            const qtyp = toFiniteNumber(row.qtyp) || toFiniteNumber(row.qty_grade_a);
            cpData[cp].metrics.totalQtyp += qtyp;
            cpData[cp].metrics.totalQtycomp += toFiniteNumber(row.qtycomp);
            cpData[cp].metrics.totalScrap += toFiniteNumber(row.qtyscrp);
            cpData[cp].metrics.totalReject += toFiniteNumber(row.qtyrjct);

            if (!pt_desc1 && row.pt_desc1) {
                pt_desc1 = row.pt_desc1;
                pt_desc2 = row.pt_desc2 || '';
                m_part = row.m_part || '';
            }
        });

        reasonsResult.recordset.forEach((row: SqlRow) => {
            const key = `${row.m_date}|${row.m_doc}|${row.m_job}|${row.m_kiln}|${row.m_cp}`;
            const isRound1Job = jobRoundMap.get(key) === 1;
            const currentCp = computedCp(row.m_cp, isRound1Job);
            if (!cpData[currentCp]) {
                cpData[currentCp] = emptyCpBucket();
                cpReasonMaps[currentCp] = { C: new Map<string, number>(), P: new Map<string, number>() };
            }

            const rsnDesc = (row.rsn_desc || '').trim();
            const qty = toFiniteNumber(row.sub_qty);
            const isRound1 = currentCp === 'C1' || currentCp.includes('(Round 1)');
            if (isRound1 && isC1SpecialReason(rsnDesc)) {
                cpData[currentCp].metrics.totalQtycomp += qty;
                return;
            }

            const mappedType = mapSubTypToBucket(row.sub_typ);
            if (!mappedType) return;
            const current = cpReasonMaps[currentCp][mappedType].get(rsnDesc) || 0;
            cpReasonMaps[currentCp][mappedType].set(rsnDesc, current + qty);
        });

        Object.keys(cpData).forEach((cp) => {
            const reasons = cpReasonMaps[cp] || { C: new Map<string, number>(), P: new Map<string, number>() };

            let cpScrap = 0;
            let cpReject = 0;
            reasons.C.forEach((qty: number) => { cpScrap += qty; });
            reasons.P.forEach((qty: number) => { cpReject += qty; });

            if (cpScrap > 0) cpData[cp].metrics.totalScrap = cpScrap;
            if (cpReject > 0) cpData[cp].metrics.totalReject = cpReject;

            const scrap = cpData[cp].metrics.totalScrap;
            const reject = cpData[cp].metrics.totalReject;
            const total = cpData[cp].metrics.totalQtyp || 1;
            cpData[cp].metrics.compRate = ((cpData[cp].metrics.totalQtycomp / total) * 100).toFixed(1);
            cpData[cp].metrics.scrapRate = ((scrap / total) * 100).toFixed(1);
            cpData[cp].metrics.rejectRate = ((reject / total) * 100).toFixed(1);

            cpData[cp].reasons = {
                C: Array.from(reasons.C.entries())
                    .map((item: any) => ({ rsn_desc: item[0], qty: item[1] as number }))
                    .sort((a: { qty: number }, b: { qty: number }) => b.qty - a.qty),
                P: Array.from(reasons.P.entries())
                    .map((item: any) => ({ rsn_desc: item[0], qty: item[1] as number }))
                    .sort((a: { qty: number }, b: { qty: number }) => b.qty - a.qty),
            };
        });

        const overallMetrics = {
            totalQtyp: 0,
            totalQtycomp: 0,
            totalScrap: 0,
            totalReject: 0,
            compRate: '0',
            scrapRate: '0',
            rejectRate: '0',
        };
        const overallReasons = { C: new Map<string, number>(), P: new Map<string, number>() };

        Object.keys(cpData).forEach((cp) => {
            const m = cpData[cp].metrics;
            overallMetrics.totalQtyp += m.totalQtyp;
            overallMetrics.totalQtycomp += m.totalQtycomp;
            overallMetrics.totalScrap += m.totalScrap;
            overallMetrics.totalReject += m.totalReject;

            ['C', 'P'].forEach((type) => {
                const typeMap = cpReasonMaps[cp] && cpReasonMaps[cp][type as 'C' | 'P'];
                if (typeMap) {
                    typeMap.forEach((qty: number, rsn: string) => {
                        overallReasons[type as 'C' | 'P'].set(rsn, (overallReasons[type as 'C' | 'P'].get(rsn) || 0) + qty);
                    });
                }
            });
        });

        const oTotal = overallMetrics.totalQtyp || 1;
        overallMetrics.compRate = ((overallMetrics.totalQtycomp / oTotal) * 100).toFixed(1);
        overallMetrics.scrapRate = ((overallMetrics.totalScrap / oTotal) * 100).toFixed(1);
        overallMetrics.rejectRate = ((overallMetrics.totalReject / oTotal) * 100).toFixed(1);

        const cpBreakdown = Object.entries(cpData).map(([cp, val]) => ({
            m_cp: cp,
            ...(val as any),
        })).sort((a, b) => {
            if (a.m_cp === 'C1') return -1;
            if (b.m_cp === 'C1') return 1;
            return a.m_cp.localeCompare(b.m_cp);
        });

        const grandTotalQty = cpBreakdown.reduce((sum, item) => sum + (item.metrics?.totalQtyp || 0), 0);
        const grandTotalComp = cpBreakdown.reduce((sum, item) => sum + (item.metrics?.totalQtycomp || 0), 0);
        const grandTotalReject = cpBreakdown.reduce((sum, item) => sum + (item.metrics?.totalReject || 0), 0);
        const grandTotalScrap = cpBreakdown.reduce((sum, item) => sum + (item.metrics?.totalScrap || 0), 0);

        const response = {
            dateRange,
            overall: {
                metrics: { ...overallMetrics },
                breakdown: {
                    C: Array.from(overallReasons.C.entries())
                        .map(([rsn_desc, qty]) => ({
                            rsn_desc,
                            qty,
                            percentage: qty > 0 ? ((qty / (overallMetrics.totalScrap || 1)) * 100).toFixed(1) : '0',
                        }))
                        .sort((a, b) => b.qty - a.qty)
                        .slice(0, 5),
                    P: Array.from(overallReasons.P.entries())
                        .map(([rsn_desc, qty]) => ({
                            rsn_desc,
                            qty,
                            percentage: qty > 0 ? ((qty / (overallMetrics.totalReject || 1)) * 100).toFixed(1) : '0',
                        }))
                        .sort((a, b) => b.qty - a.qty)
                        .slice(0, 5),
                },
            },
            cpBreakdown,
            totalStats: {
                totalQty: grandTotalQty,
                totalPctA: grandTotalQty > 0 ? (grandTotalComp / grandTotalQty) * 100 : 0,
                totalPctReject: grandTotalQty > 0 ? (grandTotalReject / grandTotalQty) * 100 : 0,
                totalPctScrap: grandTotalQty > 0 ? (grandTotalScrap / grandTotalQty) * 100 : 0,
                info: { pt_desc1, pt_desc2, m_part },
            },
        };

        console.info(`[product-stats] total ${Date.now() - t0}ms product=${product.slice(0, 40)}`);
        return NextResponse.json(response);
    } catch (error: any) {
        console.error('DEBUG FETCH ERROR:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
