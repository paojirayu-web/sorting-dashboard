import { NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { buildProductFilter } from '@/lib/product-filter';
import { SCRAP_SUB_TYP_SQL_IN } from '@/lib/sub-typ';

/**
 * Reason-log load path (kept intentionally light):
 * - 1 query: job rows that have the clicked rsn_desc (conditional aggregates)
 * - 1 query: monthly totals for all scrap/reject of that subtype (~dozens of rows)
 *
 * Why it got slow recently:
 * - Auto date-range now always applies the full PA window (~1–2 years) before fetch
 * - A prior rewrite scanned v_rpt_sort_1 many times via stacked CTEs
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const product = searchParams.get('product');
        const queryStartDate = searchParams.get('startDate');
        const queryEndDate = searchParams.get('endDate');
        const rsnDesc = searchParams.get('rsn_desc');
        const subType = searchParams.get('sub_type');
        const mCp = searchParams.get('m_cp');
        const combinedP = searchParams.get('combined_p') === '1';
        const combinedPCpsParam = searchParams.get('combined_p_cps');
        const isRound1Param = searchParams.get('is_round1');

        if (!product || !rsnDesc) {
            return NextResponse.json({ error: 'product and rsn_desc are required' }, { status: 400 });
        }

        const pool = await getConnection();
        const currentYear = new Date().getFullYear();
        const minAllowedDate = `${currentYear - 2}-01-01`;
        const defaultStartDate = `${currentYear - 1}-01-01`;
        const startDate = queryStartDate || defaultStartDate;

        if (startDate < minAllowedDate) {
            return NextResponse.json({ error: 'Date range exceeded safety limit.' }, { status: 400 });
        }

        const selectedReasonDesc = rsnDesc.trim();
        const productFilter = buildProductFilter(product);

        // Match product-stats date predicate style for stable SQL plans.
        const dateFilter = queryEndDate
            ? `AND m_date >= '${startDate}' AND m_date <= '${queryEndDate}'`
            : `AND m_date >= '${startDate}'`;

        let cpFilter = '';
        if (combinedPCpsParam) {
            const cps = combinedPCpsParam
                .split(',')
                .map((s) => s.trim().toUpperCase().replace(/'/g, "''"))
                .filter(Boolean);
            if (cps.length > 0) {
                cpFilter = `AND UPPER(RTRIM(LTRIM(m_cp))) IN (${cps.map((c) => `'${c}'`).join(', ')})`;
            }
        } else if (combinedP) {
            cpFilter = `AND UPPER(RTRIM(LTRIM(m_cp))) LIKE 'P[0-9]%'`;
        } else if (mCp) {
            cpFilter = `AND UPPER(RTRIM(LTRIM(m_cp))) = '${mCp.toUpperCase().replace(/'/g, "''")}'`;
        }

        let subtypePred = '1 = 1';
        if (subType === 'C') {
            subtypePred = `UPPER(RTRIM(LTRIM(sub_typ))) IN ${SCRAP_SUB_TYP_SQL_IN}`;
        } else if (subType === 'P') {
            subtypePred = `(UPPER(RTRIM(LTRIM(sub_typ))) = 'P' OR RTRIM(LTRIM(sub_typ)) = N'\u0E40\u0E08\u0E35\u0E22\u0E23\u0E4C')`;
        }

        const baseWhere = `${productFilter} ${dateFilter} ${cpFilter}`;
        const wantRound1 = isRound1Param === '1' ? 1 : isRound1Param === '0' ? 0 : null;

        const [logResult, monthlyTotalResult] = await Promise.all([
            pool.request().input('rsnDesc', sql.NVarChar(255), selectedReasonDesc).query(`
                SELECT
                    CONVERT(varchar(10), CAST(m_date AS date), 120) AS m_date,
                    m_doc,
                    m_job,
                    m_kiln,
                    UPPER(RTRIM(LTRIM(m_cp))) AS m_cp,
                    MAX(qtyp) AS qtyp,
                    MAX(CASE WHEN m_user LIKE 'somboon%' THEN 1 ELSE 0 END) AS is_round1,
                    SUM(CASE
                        WHEN ${subtypePred} AND RTRIM(LTRIM(rsn_desc)) = @rsnDesc
                        THEN sub_qty ELSE 0
                    END) AS rsn_qty,
                    SUM(CASE
                        WHEN ${subtypePred}
                            AND rsn_desc IS NOT NULL
                            AND RTRIM(LTRIM(rsn_desc)) != ''
                        THEN sub_qty ELSE 0
                    END) AS total_defect_qty
                FROM dbo.v_rpt_sort_1 WITH (NOLOCK)
                WHERE ${baseWhere}
                GROUP BY CAST(m_date AS date), m_doc, m_job, m_kiln, UPPER(RTRIM(LTRIM(m_cp)))
                HAVING SUM(CASE
                    WHEN ${subtypePred} AND RTRIM(LTRIM(rsn_desc)) = @rsnDesc
                    THEN sub_qty ELSE 0
                END) > 0
                OPTION (RECOMPILE)
            `),

            pool.request().query(`
                SELECT
                    CONVERT(varchar(7), m_date, 120) AS month,
                    SUM(sub_qty) AS total_defect_qty,
                    SUM(qtyp) AS total_qtyp
                FROM (
                    SELECT
                        CAST(m_date AS date) AS m_date,
                        m_doc, m_job, m_kiln,
                        UPPER(RTRIM(LTRIM(m_cp))) AS m_cp,
                        MAX(qtyp) AS qtyp,
                        SUM(CASE
                            WHEN ${subtypePred}
                                AND rsn_desc IS NOT NULL
                                AND RTRIM(LTRIM(rsn_desc)) != ''
                            THEN sub_qty ELSE 0
                        END) AS sub_qty,
                        MAX(CASE WHEN m_user LIKE 'somboon%' THEN 1 ELSE 0 END) AS is_round1
                    FROM dbo.v_rpt_sort_1 WITH (NOLOCK)
                    WHERE ${baseWhere}
                    GROUP BY CAST(m_date AS date), m_doc, m_job, m_kiln, UPPER(RTRIM(LTRIM(m_cp)))
                    HAVING SUM(CASE
                        WHEN ${subtypePred}
                            AND rsn_desc IS NOT NULL
                            AND RTRIM(LTRIM(rsn_desc)) != ''
                        THEN sub_qty ELSE 0
                    END) > 0
                ) job_defects
                ${wantRound1 === null ? '' : `WHERE is_round1 = ${wantRound1}`}
                GROUP BY CONVERT(varchar(7), m_date, 120)
                OPTION (RECOMPILE)
            `),
        ]);

        const log: {
            m_date: string;
            m_doc: string;
            m_job: string;
            m_kiln: string;
            m_cp: string;
            qtyp: number;
            rsn_qty: number;
            total_defect_qty: number;
            pct: number;
        }[] = [];
        const monthlyDefect = new Map<string, number>();
        const monthlyQtyp = new Map<string, number>();

        for (const r of logResult.recordset) {
            if (wantRound1 !== null && r.is_round1 !== wantRound1) continue;

            const qtyp = r.qtyp || 0;
            const rsn_qty = r.rsn_qty || 0;
            log.push({
                m_date: r.m_date,
                m_doc: r.m_doc,
                m_job: r.m_job,
                m_kiln: r.m_kiln,
                m_cp: r.m_cp,
                qtyp,
                rsn_qty,
                total_defect_qty: r.total_defect_qty || 0,
                pct: qtyp > 0 ? Math.round((rsn_qty / qtyp) * 1000) / 10 : 0,
            });

            const month = String(r.m_date).substring(0, 7);
            monthlyDefect.set(month, (monthlyDefect.get(month) || 0) + rsn_qty);
            monthlyQtyp.set(month, (monthlyQtyp.get(month) || 0) + qtyp);
        }

        log.sort((a, b) => b.m_date.localeCompare(a.m_date) || String(b.m_doc).localeCompare(String(a.m_doc)));

        const monthlyTotalMap = new Map<string, { totalDefectQty: number; totalQtyp: number }>();
        for (const row of monthlyTotalResult.recordset) {
            monthlyTotalMap.set(row.month, {
                totalDefectQty: Number(row.total_defect_qty) || 0,
                totalQtyp: Number(row.total_qtyp) || 0,
            });
        }

        const allMonths = new Set([...monthlyDefect.keys(), ...monthlyTotalMap.keys()]);
        const monthly = Array.from(allMonths)
            .map((month) => {
                const defectQty = monthlyDefect.get(month) || 0;
                const qtyp = monthlyQtyp.get(month) || 0;
                const totals = monthlyTotalMap.get(month);
                const totalDefectQty = totals?.totalDefectQty || 0;
                const totalQtyp = totals?.totalQtyp || 0;
                return {
                    month,
                    qty: defectQty,
                    pct: qtyp > 0 ? Math.round((defectQty / qtyp) * 1000) / 10 : 0,
                    totalPct: totalQtyp > 0 ? Math.round((totalDefectQty / totalQtyp) * 1000) / 10 : 0,
                };
            })
            .sort((a, b) => a.month.localeCompare(b.month));

        return NextResponse.json({ log, monthly });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('product-reason-log API error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
