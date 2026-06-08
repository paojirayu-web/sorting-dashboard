import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { buildProductFilter } from '@/lib/product-filter';
import { SCRAP_SUB_TYP_SQL_IN } from '@/lib/sub-typ';

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

        const selectedReasonDesc = rsnDesc.trim();

        const baseWhere = `${buildProductFilter(product)} ${dateFilter} ${cpFilter}`;

        let totalSubTypeFilter = '';
        if (subType === 'C') {
            totalSubTypeFilter = `AND UPPER(RTRIM(LTRIM(sub_typ))) IN ${SCRAP_SUB_TYP_SQL_IN}`;
        } else if (subType === 'P') {
            totalSubTypeFilter = `AND (UPPER(RTRIM(LTRIM(sub_typ))) = 'P' OR RTRIM(LTRIM(sub_typ)) = N'\u0E40\u0E08\u0E35\u0E22\u0E23\u0E4C')`;
        }

        // Read jobs once and all defect reasons once, then derive totals and selected reason in Node.js.
        const [jobsResult, defectReasonsResult] = await Promise.all([
            // Query 1: job-level totals + is_round1 flag
            pool.request().query(`
                SELECT
                    CONVERT(varchar(10), CAST(m_date AS date), 120) AS m_date,
                    m_doc, m_job, m_kiln,
                    UPPER(RTRIM(LTRIM(m_cp))) AS m_cp,
                    MAX(qtyp) AS qtyp,
                    MAX(CASE WHEN m_user LIKE 'somboon%' THEN 1 ELSE 0 END) AS is_round1
                FROM dbo.v_rpt_sort_1
                WHERE ${baseWhere}
                GROUP BY CAST(m_date AS date), m_doc, m_job, m_kiln, UPPER(RTRIM(LTRIM(m_cp)))
                OPTION (RECOMPILE)
            `),

            // Query 2: reason-level qty per job for the selected scrap/reject type
            pool.request().query(`
                SELECT
                    CONVERT(varchar(10), CAST(m_date AS date), 120) AS m_date,
                    m_doc, m_job, m_kiln,
                    UPPER(RTRIM(LTRIM(m_cp))) AS m_cp,
                    RTRIM(LTRIM(rsn_desc)) AS rsn_desc,
                    SUM(sub_qty) AS rsn_qty
                FROM dbo.v_rpt_sort_1
                WHERE ${baseWhere}
                    ${totalSubTypeFilter}
                    AND rsn_desc IS NOT NULL AND RTRIM(LTRIM(rsn_desc)) != ''
                GROUP BY CAST(m_date AS date), m_doc, m_job, m_kiln, UPPER(RTRIM(LTRIM(m_cp))), RTRIM(LTRIM(rsn_desc))
                OPTION (RECOMPILE)
            `),
        ]);

        // ─── JS: build job lookup map (key → { qtyp, is_round1 }) ───
        const jobMap = new Map<string, { qtyp: number; is_round1: number }>();
        for (const j of jobsResult.recordset) {
            const key = `${j.m_date}|${j.m_doc}|${j.m_job}|${j.m_kiln}|${j.m_cp}`;
            jobMap.set(key, { qtyp: j.qtyp || 0, is_round1: j.is_round1 });
        }

        // ─── JS: build total defect lookup map and selected reason rows ───
        const totalDefectMap = new Map<string, number>();
        const selectedReasonRows = [];
        for (const row of defectReasonsResult.recordset) {
            const key = `${row.m_date}|${row.m_doc}|${row.m_job}|${row.m_kiln}|${row.m_cp}`;
            const qty = row.rsn_qty || 0;
            totalDefectMap.set(key, (totalDefectMap.get(key) || 0) + qty);
            if ((row.rsn_desc || '').trim() === selectedReasonDesc) {
                selectedReasonRows.push(row);
            }
        }

        // ─── JS: join selected reason rows with job totals, apply is_round1 filter ───
        const wantRound1 = isRound1Param === '1' ? 1 : isRound1Param === '0' ? 0 : null;

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

        for (const r of selectedReasonRows) {
            const key = `${r.m_date}|${r.m_doc}|${r.m_job}|${r.m_kiln}|${r.m_cp}`;
            const job = jobMap.get(key);
            if (!job) continue;

            // Apply is_round1 filter
            if (wantRound1 !== null && job.is_round1 !== wantRound1) continue;

            const qtyp = job.qtyp;
            const pct = qtyp > 0 ? Math.round((r.rsn_qty / qtyp) * 1000) / 10 : 0;
            const total_defect_qty = totalDefectMap.get(key) || 0;

            log.push({
                m_date: r.m_date,
                m_doc: r.m_doc,
                m_job: r.m_job,
                m_kiln: r.m_kiln,
                m_cp: r.m_cp,
                qtyp,
                rsn_qty: r.rsn_qty,
                total_defect_qty,
                pct,
            });

            // Aggregate monthly defect qty and qtyp
            const month = r.m_date.substring(0, 7); // yyyy-MM
            monthlyDefect.set(month, (monthlyDefect.get(month) || 0) + r.rsn_qty);
            monthlyQtyp.set(month, (monthlyQtyp.get(month) || 0) + qtyp);
        }

        // ─── JS: aggregate total defect (all reasons) per month ───
        const monthlyTotalDefect = new Map<string, number>();
        const monthlyTotalQtyp = new Map<string, number>();
        const monthlyTotalJobKeys = new Set<string>();
        for (const r of defectReasonsResult.recordset) {
            const key = `${r.m_date}|${r.m_doc}|${r.m_job}|${r.m_kiln}|${r.m_cp}`;
            const job = jobMap.get(key);
            if (!job) continue;
            if (wantRound1 !== null && job.is_round1 !== wantRound1) continue;

            const month = r.m_date.substring(0, 7);
            monthlyTotalDefect.set(month, (monthlyTotalDefect.get(month) || 0) + (r.rsn_qty || 0));
            if (!monthlyTotalJobKeys.has(key)) {
                monthlyTotalJobKeys.add(key);
                monthlyTotalQtyp.set(month, (monthlyTotalQtyp.get(month) || 0) + job.qtyp);
            }
        }

        // Sort log by date desc
        log.sort((a, b) => b.m_date.localeCompare(a.m_date) || b.m_doc.localeCompare(a.m_doc));

        // Build monthly array
        const allMonths = new Set([...monthlyDefect.keys(), ...monthlyTotalDefect.keys()]);
        const monthly = Array.from(allMonths)
            .map(month => {
                const defectQty = monthlyDefect.get(month) || 0;
                const qtyp = monthlyQtyp.get(month) || 0;
                const pct = qtyp > 0 ? Math.round((defectQty / qtyp) * 1000) / 10 : 0;

                const totalDefectQty = monthlyTotalDefect.get(month) || 0;
                const totalQtyp2 = monthlyTotalQtyp.get(month) || 0;
                const totalPct = totalQtyp2 > 0 ? Math.round((totalDefectQty / totalQtyp2) * 1000) / 10 : 0;

                return { month, qty: defectQty, pct, totalPct };
            })
            .sort((a, b) => a.month.localeCompare(b.month));

        return NextResponse.json({ log, monthly });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('product-reason-log API error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
