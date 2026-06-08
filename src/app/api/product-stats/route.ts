/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { isC1SpecialReason } from '@/lib/c1-special-reason';
import { buildProductFilter } from '@/lib/product-filter';
import { mapSubTypToBucket } from '@/lib/sub-typ';

type SqlRow = Record<string, any>;

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const product = searchParams.get('product');
        const queryStartDate = searchParams.get('startDate');
        const queryEndDate = searchParams.get('endDate');

        if (!product) {
            return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
        }

        const pool = await getConnection();
        const currentYear = new Date().getFullYear();

        // Safety Limit: Max 3 Years Back (Current Year - 2)
        const minAllowedYear = currentYear - 2;
        const minAllowedDate = `${minAllowedYear}-01-01`;

        // Default Logic: Previous Year Start to Present
        const defaultStartDate = `${currentYear - 1}-01-01`;
        const startDate = queryStartDate || defaultStartDate;

        // Validate Date Range
        if (startDate < minAllowedDate) {
            return NextResponse.json({
                error: `Date range exceeded safety limit. Data is available from ${minAllowedDate} onwards.`
            }, { status: 400 });
        }

        const dateFilter = queryEndDate
            ? `AND m_date >= '${startDate}' AND m_date <= '${queryEndDate}'`
            : `AND m_date >= '${startDate}'`;

        const productFilter = buildProductFilter(product);

        // Keep the expensive round-flag window out of the reason aggregation. For some 2026 ranges
        // SQL Server chose a very slow plan for the windowed reason query.
        const [metricsResult, jobFlagsResult, reasonsResult, infoResult] = await Promise.all([
            pool.request().query(`
                SELECT
                    computed_cp as m_cp,
                    SUM(qtyp) as totalQtyp,
                    SUM(qtycomp) as totalQtycomp,
                    SUM(qtyscrp) as totalScrap,
                    SUM(qtyrjct) as totalReject
                FROM (
                    SELECT
                        m_doc, m_job, m_date, m_kiln,
                        CASE
                            WHEN MAX(CASE WHEN m_user LIKE 'somboon%' THEN 1 ELSE 0 END) = 1
                            THEN CASE
                                WHEN UPPER(RTRIM(LTRIM(m_cp))) = 'C' THEN 'C1'
                                ELSE UPPER(RTRIM(LTRIM(m_cp))) + ' (Round 1)'
                            END
                            ELSE UPPER(RTRIM(LTRIM(m_cp)))
                        END as computed_cp,
                        MAX(qtyp) as qtyp,
                        MAX(qtycomp) as qtycomp,
                        MAX(qtyscrp) as qtyscrp,
                        MAX(qtyrjct) as qtyrjct
                    FROM dbo.v_rpt_sort_1 WITH (NOLOCK)
                    WHERE ${productFilter} ${dateFilter}
                    GROUP BY m_doc, m_job, m_date, m_kiln, UPPER(RTRIM(LTRIM(m_cp)))
                ) as unique_jobs
                GROUP BY computed_cp
                OPTION (RECOMPILE)
            `),
            pool.request().query(`
                SELECT
                    CONVERT(varchar(10), CAST(m_date AS date), 120) AS m_date,
                    m_doc,
                    m_job,
                    m_kiln,
                    UPPER(RTRIM(LTRIM(m_cp))) AS m_cp,
                    MAX(CASE WHEN m_user LIKE 'somboon%' THEN 1 ELSE 0 END) AS is_round1
                FROM dbo.v_rpt_sort_1 WITH (NOLOCK)
                WHERE ${productFilter} ${dateFilter}
                GROUP BY CAST(m_date AS date), m_doc, m_job, m_kiln, UPPER(RTRIM(LTRIM(m_cp)))
                OPTION (RECOMPILE)
            `),
            pool.request().query(`
                SELECT
                    CONVERT(varchar(10), CAST(m_date AS date), 120) AS m_date,
                    m_doc,
                    m_job,
                    m_kiln,
                    UPPER(RTRIM(LTRIM(m_cp))) AS m_cp,
                    RTRIM(LTRIM(sub_typ)) AS sub_typ,
                    RTRIM(LTRIM(rsn_desc)) AS rsn_desc,
                    SUM(sub_qty) AS sub_qty
                FROM dbo.v_rpt_sort_1 WITH (NOLOCK)
                WHERE ${productFilter} ${dateFilter}
                    AND rsn_desc IS NOT NULL
                    AND RTRIM(LTRIM(rsn_desc)) != ''
                GROUP BY CAST(m_date AS date), m_doc, m_job, m_kiln, UPPER(RTRIM(LTRIM(m_cp))), RTRIM(LTRIM(sub_typ)), RTRIM(LTRIM(rsn_desc))
                OPTION (RECOMPILE)
            `),
            pool.request().query(`
                SELECT TOP 1 pt_desc1, pt_desc2, m_part
                FROM dbo.v_rpt_sort_1 WITH (NOLOCK)
                WHERE ${productFilter}
                OPTION (RECOMPILE)
            `),
        ]);

        const cpData: Record<string, any> = {};
        const cpReasonMaps: Record<string, { C: Map<string, number>; P: Map<string, number> }> = {};

        metricsResult.recordset.forEach((row: SqlRow) => {
            const cp = (row.m_cp || 'Unknown').trim();
            cpData[cp] = {
                metrics: {
                    totalQtyp: row.totalQtyp || 0,
                    totalQtycomp: row.totalQtycomp || 0,
                    totalScrap: row.totalScrap || 0,
                    totalReject: row.totalReject || 0,
                    compRate: "0",
                    scrapRate: "0",
                    rejectRate: "0"
                },
                reasons: { C: [], P: [] }
            };
            cpReasonMaps[cp] = { C: new Map<string, number>(), P: new Map<string, number>() };
        });

        const jobRoundMap = new Map<string, number>();
        jobFlagsResult.recordset.forEach((row: SqlRow) => {
            const key = `${row.m_date}|${row.m_doc}|${row.m_job}|${row.m_kiln}|${row.m_cp}`;
            jobRoundMap.set(key, Number(row.is_round1) || 0);
        });

        reasonsResult.recordset.forEach((row: SqlRow) => {
            const key = `${row.m_date}|${row.m_doc}|${row.m_job}|${row.m_kiln}|${row.m_cp}`;
            const isRound1Job = jobRoundMap.get(key) === 1;
            const currentCp = isRound1Job
                ? (row.m_cp === 'C' ? 'C1' : `${row.m_cp} (Round 1)`)
                : row.m_cp;
            if (!cpData[currentCp]) {
                cpData[currentCp] = {
                    metrics: {
                        totalQtyp: 0,
                        totalQtycomp: 0,
                        totalScrap: 0,
                        totalReject: 0,
                        compRate: "0",
                        scrapRate: "0",
                        rejectRate: "0"
                    },
                    reasons: { C: [], P: [] }
                };
                cpReasonMaps[currentCp] = { C: new Map<string, number>(), P: new Map<string, number>() };
            }

            const rsnDesc = (row.rsn_desc || '').trim();
            const qty = Number(row.sub_qty) || 0;
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

        // 5. Finalize CP metrics and reason lists
        Object.keys(cpData).forEach(cp => {
            const reasons = cpReasonMaps[cp] || { C: new Map<string, number>(), P: new Map<string, number>() };

            let cpScrap = 0;
            let cpReject = 0;
            reasons.C.forEach((qty: number) => cpScrap += qty);
            reasons.P.forEach((qty: number) => cpReject += qty);

            cpData[cp].metrics.totalScrap = cpScrap;
            cpData[cp].metrics.totalReject = cpReject;

            const total = cpData[cp].metrics.totalQtyp || 1;
            cpData[cp].metrics.compRate = ((cpData[cp].metrics.totalQtycomp / total) * 100).toFixed(1);
            cpData[cp].metrics.scrapRate = ((cpScrap / total) * 100).toFixed(1);
            cpData[cp].metrics.rejectRate = ((cpReject / total) * 100).toFixed(1);

            cpData[cp].reasons = {
                C: Array.from(reasons.C.entries())
                    .map((item: any) => ({ rsn_desc: item[0], qty: item[1] as number }))
                    .sort((a, b) => b.qty - a.qty),
                P: Array.from(reasons.P.entries())
                    .map((item: any) => ({ rsn_desc: item[0], qty: item[1] as number }))
                    .sort((a, b) => b.qty - a.qty),
            };
        });

        // 6. Calculate Overall Metrics & aggregated Reasons
        const overallMetrics = {
            totalQtyp: 0,
            totalQtycomp: 0,
            totalScrap: 0,
            totalReject: 0,
            compRate: "0",
            scrapRate: "0",
            rejectRate: "0"
        };
        const overallReasons = { C: new Map<string, number>(), P: new Map<string, number>() };

        Object.keys(cpData).forEach(cp => {
            const m = cpData[cp].metrics;
            overallMetrics.totalQtyp += m.totalQtyp;
            overallMetrics.totalQtycomp += m.totalQtycomp;
            overallMetrics.totalScrap += m.totalScrap;
            overallMetrics.totalReject += m.totalReject;

            ['C', 'P'].forEach(type => {
                const typeMap = (cpReasonMaps[cp] && cpReasonMaps[cp][type as 'C' | 'P']);
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

        // 7. Build cpBreakdown array
        const cpBreakdown = Object.entries(cpData).map(([cp, val]) => ({
            m_cp: cp,
            ...(val as any)
        })).sort((a, b) => {
            if (a.m_cp === 'C1') return -1;
            if (b.m_cp === 'C1') return 1;
            return a.m_cp.localeCompare(b.m_cp);
        });

        // 8. Calculate Grand Totals across all CPs
        const grandTotalQty = cpBreakdown.reduce((sum, item) => sum + (item.metrics?.totalQtyp || 0), 0);
        const grandTotalComp = cpBreakdown.reduce((sum, item) => sum + (item.metrics?.totalQtycomp || 0), 0);
        const grandTotalReject = cpBreakdown.reduce((sum, item) => sum + (item.metrics?.totalReject || 0), 0);
        const grandTotalScrap = cpBreakdown.reduce((sum, item) => sum + (item.metrics?.totalScrap || 0), 0);

        const firstRow = infoResult.recordset[0] || {};
        const pt_desc1 = firstRow.pt_desc1 || "";
        const pt_desc2 = firstRow.pt_desc2 || "";
        const m_part = firstRow.m_part || "";

        const totalStats = {
            totalQty: grandTotalQty,
            totalPctA: grandTotalQty > 0 ? (grandTotalComp / grandTotalQty) * 100 : 0,
            totalPctReject: grandTotalQty > 0 ? (grandTotalReject / grandTotalQty) * 100 : 0,
            totalPctScrap: grandTotalQty > 0 ? (grandTotalScrap / grandTotalQty) * 100 : 0,
            info: { pt_desc1, pt_desc2, m_part }
        };

        // 9. Build final response
        const response = {
            overall: {
                metrics: {
                    ...overallMetrics,
                },
                breakdown: {
                    C: Array.from(overallReasons.C.entries())
                        .map(([rsn_desc, qty]) => ({
                            rsn_desc,
                            qty,
                            percentage: qty > 0 ? (qty / (overallMetrics.totalScrap || 1) * 100).toFixed(1) : "0"
                        }))
                        .sort((a, b) => b.qty - a.qty)
                        .slice(0, 5),
                    P: Array.from(overallReasons.P.entries())
                        .map(([rsn_desc, qty]) => ({
                            rsn_desc,
                            qty,
                            percentage: qty > 0 ? (qty / (overallMetrics.totalReject || 1) * 100).toFixed(1) : "0"
                        }))
                        .sort((a, b) => b.qty - a.qty)
                        .slice(0, 5)
                }
            },
            cpBreakdown,
            totalStats
        };

        return NextResponse.json(response);
    } catch (error: any) {
        console.error("DEBUG FETCH ERROR:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
