import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import * as fs from 'fs';
import * as path from 'path';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const product = searchParams.get('product') || 'W/W JBSB77,JBSC09/T0040(VB)';

        const pool = await getConnection();
        const debugResults: Record<string, unknown> = {};

        // 1) Computed CP test - EXACT same logic as route.ts Query 2
        const r1 = await pool.request().query(`
            SELECT computed_cp, sub_typ, rsn_desc, SUM(sub_qty) as total_qty
            FROM (
                SELECT 
                    RTRIM(LTRIM(sub_typ)) as sub_typ, 
                    RTRIM(LTRIM(rsn_desc)) as rsn_desc, 
                    sub_qty,
                    CASE 
                        WHEN MAX(qtycomp) OVER (PARTITION BY m_doc, m_job, m_date, m_kiln, RTRIM(LTRIM(m_cp))) = 0 
                             AND MAX(CASE WHEN rsn_desc LIKE N'%ต้องนำไปพ่น%' OR rsn_desc LIKE N'%ปั่นปาก%' THEN 1 ELSE 0 END) OVER (PARTITION BY m_doc, m_job, m_date, m_kiln, RTRIM(LTRIM(m_cp))) = 1
                        THEN RTRIM(LTRIM(m_cp)) + ' (Round 1)'
                        ELSE RTRIM(LTRIM(m_cp))
                    END as computed_cp
                FROM dbo.v_rpt_sort_1
                WHERE pt_desc1 = N'${product}' AND m_date >= '2025-01-01'
            ) as t
            WHERE rsn_desc IS NOT NULL AND rsn_desc != ''
                AND (sub_typ IS NOT NULL OR rsn_desc LIKE N'%ต้องนำไปพ่น%' OR rsn_desc LIKE N'%ปั่นปาก%')
            GROUP BY computed_cp, sub_typ, rsn_desc
            ORDER BY computed_cp, total_qty DESC
        `);
        debugResults['computed_reasons'] = r1.recordset;

        // 2) Computed CP for Metrics - EXACT same logic as route.ts Query 1
        const r2 = await pool.request().query(`
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
                        WHEN MAX(qtycomp) = 0 AND MAX(CASE WHEN rsn_desc LIKE N'%ต้องนำไปพ่น%' OR rsn_desc LIKE N'%ปั่นปาก%' THEN 1 ELSE 0 END) = 1
                        THEN RTRIM(LTRIM(m_cp)) + ' (Round 1)'
                        ELSE RTRIM(LTRIM(m_cp))
                    END as computed_cp,
                    MAX(qtyp) as qtyp,
                    MAX(qtycomp) as qtycomp,
                    MAX(qtyscrp) as qtyscrp,
                    MAX(qtyrjct) as qtyrjct
                FROM dbo.v_rpt_sort_1
                WHERE pt_desc1 = N'${product}' AND m_date >= '2025-01-01'
                GROUP BY m_doc, m_job, m_date, m_kiln, RTRIM(LTRIM(m_cp))
            ) as unique_jobs
            GROUP BY computed_cp
        `);
        debugResults['computed_metrics'] = r2.recordset;

        // 3) Count Round 1 reasons only
        const round1Reasons = r1.recordset.filter((r: Record<string, string>) => r.computed_cp && r.computed_cp.includes('Round 1'));

        // Write to file
        const outPath = path.join(process.cwd(), 'debug_output.json');
        fs.writeFileSync(outPath, JSON.stringify(debugResults, null, 2), 'utf-8');

        return NextResponse.json({
            message: `Debug written to ${outPath}`,
            product_used: product,
            total_computed_reasons: r1.recordset.length,
            round1_reasons: round1Reasons,
            computed_metrics: r2.recordset
        });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
