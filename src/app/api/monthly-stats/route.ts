/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { isC1SpecialReason } from '@/lib/c1-special-reason';
import { buildProductFilter } from '@/lib/product-filter';
import { querySortSources } from '@/lib/sort-query';
import { SORT_VIEW_TOKEN, sourcesForProduct } from '@/lib/sort-source';
import { mapSubTypToBucket } from '@/lib/sub-typ';
import { buildUnitFilterSql, parseUnitFilterParam } from '@/lib/unit-filter';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const product = searchParams.get('product');
        const queryStartDate = searchParams.get('startDate');
        const queryEndDate = searchParams.get('endDate');
        const m_cp_filter = searchParams.get('m_cp');
        const unitSql = buildUnitFilterSql(parseUnitFilterParam(searchParams.get('unit')), 'WW');

        if (!product) {
            return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
        }

        // Debug Log
        console.log(`API /monthly-stats: Fetching for product '${product}'`);

        const currentYear = new Date().getFullYear();

        // Safety Limit: Max 3 Years Back
        const minAllowedYear = currentYear - 3;
        const minAllowedDate = `${minAllowedYear}-01-01`;

        // Default Logic: Previous Year Start to Present
        const defaultStartDate = `${currentYear - 1}-01-01`;
        const startDate = queryStartDate || defaultStartDate;

        if (startDate < minAllowedDate) {
            return NextResponse.json({
                error: `Date range exceeded safety limit. Data is available from ${minAllowedDate} onwards.`
            }, { status: 400 });
        }

        const dateFilter = queryEndDate
            ? `AND m_date >= '${startDate}' AND m_date < DATEADD(day, 1, '${queryEndDate}')`
            : `AND m_date >= '${startDate}'`;

        // Base Query with CP Computation Logic
        // We need to fetch raw data first to handle the complex CP logic properly in JavaScript or complex SQL
        // Given the volume might be high for a product over a year, let's try to do as much in SQL as possible.
        // The computed_cp logic is:
        /*
            CASE 
                WHEN MAX(CASE WHEN m_user LIKE 'somboon%' THEN 1 ELSE 0 END) = 1
                THEN CASE 
                    WHEN UPPER(RTRIM(LTRIM(m_cp))) = 'C' THEN 'C1'
                    ELSE UPPER(RTRIM(LTRIM(m_cp))) + ' (Round 1)'
                END
                ELSE UPPER(RTRIM(LTRIM(m_cp)))
            END as computed_cp
        */

        // However, since we are doing monthly aggregation, we can't easily join everything in one go without complex subqueries.
        // Let's first get the Data grouped by Month + computed_cp + m_kiln + m_job (to ensure unique job handling)

        // Actually, the requirement asks for monthly aggregate.
        // Let's use a CTE or subquery to normalize the data first.

        const productFilter = buildProductFilter(product);
        const sources = sourcesForProduct(product);

        const baseQuery = `
            SELECT
                LEFT(CONVERT(VARCHAR, m_date, 120), 7) as m_month,
                m_doc, m_job, m_date, m_kiln, pt_desc1,
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
            FROM ${SORT_VIEW_TOKEN}
            WHERE ${productFilter} AND ${unitSql} ${dateFilter}
            GROUP BY m_doc, m_job, m_date, m_kiln, UPPER(RTRIM(LTRIM(m_cp))), pt_desc1
        `;

        const [metricsResult, jobFlagsResult, reasonsResultFinal, kilnResult] = await Promise.all([
            querySortSources<Record<string, any>>(`
            SELECT 
                m_month,
                computed_cp,
                SUM(qtyp) as totalQtyp,
                SUM(qtycomp) as totalQtycomp,
                SUM(qtyscrp) as totalScrap,
                SUM(qtyrjct) as totalReject
            FROM (
                ${baseQuery}
            ) as distinct_jobs
            GROUP BY m_month, computed_cp
            ORDER BY m_month ASC
            OPTION (RECOMPILE)
        `, { sources, required: true }),
            querySortSources<Record<string, any>>(`
            SELECT 
                CONVERT(varchar(10), CAST(m_date AS date), 120) AS m_date,
                m_doc,
                m_job,
                m_kiln,
                UPPER(RTRIM(LTRIM(m_cp))) AS m_cp,
                MAX(CASE WHEN m_user LIKE 'somboon%' THEN 1 ELSE 0 END) AS is_round1
            FROM ${SORT_VIEW_TOKEN} WITH (NOLOCK)
            WHERE ${productFilter} AND ${unitSql} ${dateFilter}
            GROUP BY CAST(m_date AS date), m_doc, m_job, m_kiln, UPPER(RTRIM(LTRIM(m_cp)))
            OPTION (RECOMPILE)
        `, { sources }),
            querySortSources<Record<string, any>>(`
            SELECT 
                LEFT(CONVERT(VARCHAR, m_date, 120), 7) as m_month,
                CONVERT(varchar(10), CAST(m_date AS date), 120) AS m_date,
                m_doc,
                m_job,
                m_kiln,
                UPPER(RTRIM(LTRIM(m_cp))) AS m_cp,
                RTRIM(LTRIM(sub_typ)) as sub_typ, 
                RTRIM(LTRIM(rsn_desc)) as rsn_desc, 
                SUM(sub_qty) as sub_qty
            FROM ${SORT_VIEW_TOKEN} WITH (NOLOCK)
            WHERE ${productFilter} AND ${unitSql} ${dateFilter}
                AND rsn_desc IS NOT NULL
                AND RTRIM(LTRIM(rsn_desc)) != ''
            GROUP BY LEFT(CONVERT(VARCHAR, m_date, 120), 7), CAST(m_date AS date), m_doc, m_job, m_kiln, UPPER(RTRIM(LTRIM(m_cp))), RTRIM(LTRIM(sub_typ)), RTRIM(LTRIM(rsn_desc))
            OPTION (RECOMPILE)
        `, { sources }),
            querySortSources<Record<string, any>>(`
             SELECT 
                m_month,
                m_kiln,
                computed_cp,
                SUM(qtyp) as totalQtyp,
                SUM(qtycomp) as totalQtycomp,
                SUM(qtyscrp) as totalScrap,
                SUM(qtyrjct) as totalReject
            FROM (
                ${baseQuery}
            ) as distinct_jobs
            GROUP BY m_month, m_kiln, computed_cp
            OPTION (RECOMPILE)
        `, { sources }),
        ]);

        // Process Data in JS
        const monthlyData: Record<string, any> = {};
        const availableCPs = new Set<string>();

        // Init Monthly Buckets from Metrics
        metricsResult.recordset.forEach((row: any) => {
            const month = row.m_month;
            const cp = row.computed_cp || 'Unknown';
            availableCPs.add(cp);

            // Filter CP if requested
            if (m_cp_filter && m_cp_filter !== 'ALL' && cp !== m_cp_filter) return;

            if (!monthlyData[month]) {
                monthlyData[month] = {
                    month,
                    metrics: { totalQtyp: 0, totalQtycomp: 0, totalScrap: 0, totalReject: 0 },
                    reasons: { C: new Map<string, number>(), P: new Map<string, number>() },
                    kilns: new Map<string, any>() // Changed to store object instead of just number
                };
            }

            monthlyData[month].metrics.totalQtyp += row.totalQtyp || 0;
            monthlyData[month].metrics.totalQtycomp += row.totalQtycomp || 0;
            monthlyData[month].metrics.totalScrap += row.totalScrap || 0;
            monthlyData[month].metrics.totalReject += row.totalReject || 0;
        });

        const jobRoundMap = new Map<string, number>();
        jobFlagsResult.recordset.forEach((row: any) => {
            const key = `${row.m_date}|${row.m_doc}|${row.m_job}|${row.m_kiln}|${row.m_cp}`;
            jobRoundMap.set(key, Number(row.is_round1) || 0);
        });

        // Process Reasons
        reasonsResultFinal.recordset.forEach((row: any) => {
            const month = row.m_month;
            const key = `${row.m_date}|${row.m_doc}|${row.m_job}|${row.m_kiln}|${row.m_cp}`;
            const isRound1Job = jobRoundMap.get(key) === 1;
            const cp = isRound1Job
                ? (row.m_cp === 'C' ? 'C1' : `${row.m_cp} (Round 1)`)
                : (row.m_cp || 'Unknown');

            if (m_cp_filter && m_cp_filter !== 'ALL' && cp !== m_cp_filter) return;
            if (!monthlyData[month]) return; // Should exist from metrics or skip if no metrics? 
            // Ideally we iterate known months. If a month has reasons but no metrics (unlikely), we might miss it here.

            const rsnDesc = (row.rsn_desc || '').trim();
            const mappedType = mapSubTypToBucket(row.sub_typ);

            // Special Logic for Somboon Special Reasons (moved to qtycomp in previous logic, but here we just aggregate reasons)
            // If it was moved to qtycomp effectively, it shouldn't appear as scrap/reject. 
            // In product-stats, we did `isSpecialA` check.
            const isRound1 = cp === 'C1' || cp.includes('(Round 1)');
            if (isRound1 && isC1SpecialReason(rsnDesc)) {
                // It counts as Good (Comp) - already handled in metrics query via sum? 
                // Wait, baseQuery takes MAX(qtycomp). SQL doesn't know about special reason shift.
                // In product-stats, we MANUALLY shifted it.
                // Here we need to adjust metrics if we want to match exactly.
                monthlyData[month].metrics.totalQtycomp += row.sub_qty;
                // And we do NOT add to reasons list.
                return;
            }

            if (mappedType) {
                const currentFn = monthlyData[month].reasons[mappedType].get(rsnDesc) || 0;
                monthlyData[month].reasons[mappedType].set(rsnDesc, currentFn + row.sub_qty);
            }
        });

        // Process Kilns
        kilnResult.recordset.forEach((row: any) => {
            const month = row.m_month;
            const cp = row.computed_cp || 'Unknown';
            if (m_cp_filter && m_cp_filter !== 'ALL' && cp !== m_cp_filter) return;
            if (!monthlyData[month]) return;

            const kiln = row.m_kiln || 'Unknown';
            // Store comprehensive metrics for kiln
            if (!monthlyData[month].kilns.has(kiln)) {
                monthlyData[month].kilns.set(kiln, {
                    qtyp: 0,
                    qtycomp: 0,
                    qtyscrp: 0,
                    qtyrjct: 0
                });
            }
            const current = monthlyData[month].kilns.get(kiln);
            current.qtyp += row.totalQtyp || 0;
            current.qtycomp += row.totalQtycomp || 0;
            current.qtyscrp += row.totalScrap || 0;
            current.qtyrjct += row.totalReject || 0;
        });

        // Finalize Response
        const months = Object.values(monthlyData).map(m => {
            const total = m.metrics.totalQtyp || 1;

            // Recalculate rates
            const compRate = ((m.metrics.totalQtycomp / total) * 100).toFixed(1);
            const scrapRate = ((m.metrics.totalScrap / total) * 100).toFixed(1);
            const rejectRate = ((m.metrics.totalReject / total) * 100).toFixed(1);

            return {
                month: m.month,
                label: new Date(m.month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                metrics: {
                    ...m.metrics,
                    compRate,
                    scrapRate,
                    rejectRate
                },
                topScrap: Array.from(m.reasons.C.entries())
                    .map((entry: any) => ({ rsn_desc: entry[0], qty: entry[1] }))
                    .sort((a: any, b: any) => b.qty - a.qty)
                    .slice(0, 5),
                topReject: Array.from(m.reasons.P.entries())
                    .map((entry: any) => ({ rsn_desc: entry[0], qty: entry[1] }))
                    .sort((a: any, b: any) => b.qty - a.qty)
                    .slice(0, 5),
                kilns: Array.from(m.kilns.entries())
                    .map((entry: any) => ({ m_kiln: entry[0], ...(entry[1] as any) }))
                    .sort((a: any, b: any) => b.qtyp - a.qtyp)
            };
        }).sort((a, b) => a.month.localeCompare(b.month)); // Ascending month

        return NextResponse.json({
            months,
            cpOptions: Array.from(availableCPs).sort()
        });

    } catch (error: any) {
        console.error("DEBUG MONTHLY STATS ERROR:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
