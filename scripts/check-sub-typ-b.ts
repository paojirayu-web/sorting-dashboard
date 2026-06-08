import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getConnection } from '../src/lib/db';

const product = 'W/W CMLJ51/G0800(SDA)';
const mCp = 'P2';

async function main() {
    const pool = await getConnection();

    const subTypDist = await pool.request().query(`
        SELECT 
            RTRIM(LTRIM(ISNULL(sub_typ, ''))) AS sub_typ,
            COUNT(*) AS row_count,
            SUM(ISNULL(sub_qty, 0)) AS total_sub_qty
        FROM dbo.v_rpt_sort_1 WITH (NOLOCK)
        WHERE pt_desc1 = N'${product.replace(/'/g, "''")}'
            AND UPPER(RTRIM(LTRIM(m_cp))) = '${mCp}'
            AND rsn_desc IS NOT NULL AND RTRIM(LTRIM(rsn_desc)) != ''
            AND m_date >= '2025-01-01'
        GROUP BY RTRIM(LTRIM(ISNULL(sub_typ, '')))
        ORDER BY total_sub_qty DESC
    `);

    const scrapCompare = await pool.request().query(`
        WITH reason_lines AS (
            SELECT 
                m_doc, m_job, m_date, m_kiln,
                RTRIM(LTRIM(sub_typ)) AS sub_typ,
                RTRIM(LTRIM(rsn_desc)) AS rsn_desc,
                SUM(sub_qty) AS sub_qty
            FROM dbo.v_rpt_sort_1 WITH (NOLOCK)
            WHERE pt_desc1 = N'${product.replace(/'/g, "''")}'
                AND UPPER(RTRIM(LTRIM(m_cp))) = '${mCp}'
                AND m_date >= '2025-01-01'
                AND rsn_desc IS NOT NULL AND RTRIM(LTRIM(rsn_desc)) != ''
            GROUP BY m_doc, m_job, m_date, m_kiln, RTRIM(LTRIM(sub_typ)), RTRIM(LTRIM(rsn_desc))
        ),
        jobs AS (
            SELECT 
                m_doc, m_job, m_date, m_kiln,
                MAX(qtyscrp) AS qtyscrp,
                MAX(qtyrjct) AS qtyrjct
            FROM dbo.v_rpt_sort_1 WITH (NOLOCK)
            WHERE pt_desc1 = N'${product.replace(/'/g, "''")}'
                AND UPPER(RTRIM(LTRIM(m_cp))) = '${mCp}'
                AND m_date >= '2025-01-01'
            GROUP BY m_doc, m_job, m_date, m_kiln
        )
        SELECT
            (SELECT SUM(qtyscrp) FROM jobs) AS total_qtyscrp_jobs,
            (SELECT SUM(sub_qty) FROM reason_lines WHERE sub_typ IN ('C', 'D')) AS sum_sub_qty_C_D,
            (SELECT SUM(sub_qty) FROM reason_lines WHERE sub_typ = 'B') AS sum_sub_qty_B,
            (SELECT SUM(sub_qty) FROM reason_lines WHERE sub_typ = 'P' OR sub_typ = N'เจียร์') AS sum_sub_qty_P,
            (SELECT SUM(sub_qty) FROM reason_lines WHERE sub_typ NOT IN ('C', 'D', 'B', 'P') AND sub_typ != N'เจียร์' AND sub_typ != '') AS sum_sub_qty_other,
            (SELECT SUM(sub_qty) FROM reason_lines WHERE sub_typ = '' OR sub_typ IS NULL) AS sum_sub_qty_blank_typ
    `);

    const bReasons = await pool.request().query(`
        SELECT TOP 30
            RTRIM(LTRIM(rsn_desc)) AS rsn_desc,
            RTRIM(LTRIM(sub_typ)) AS sub_typ,
            SUM(sub_qty) AS total_qty,
            COUNT(*) AS line_count
        FROM dbo.v_rpt_sort_1 WITH (NOLOCK)
        WHERE pt_desc1 = N'${product.replace(/'/g, "''")}'
            AND UPPER(RTRIM(LTRIM(m_cp))) = '${mCp}'
            AND RTRIM(LTRIM(sub_typ)) = 'B'
            AND rsn_desc IS NOT NULL AND RTRIM(LTRIM(rsn_desc)) != ''
            AND m_date >= '2025-01-01'
        GROUP BY RTRIM(LTRIM(rsn_desc)), RTRIM(LTRIM(sub_typ))
        ORDER BY total_qty DESC
    `);

    const cDReasons = await pool.request().query(`
        SELECT TOP 15
            RTRIM(LTRIM(rsn_desc)) AS rsn_desc,
            RTRIM(LTRIM(sub_typ)) AS sub_typ,
            SUM(sub_qty) AS total_qty
        FROM dbo.v_rpt_sort_1 WITH (NOLOCK)
        WHERE pt_desc1 = N'${product.replace(/'/g, "''")}'
            AND UPPER(RTRIM(LTRIM(m_cp))) = '${mCp}'
            AND RTRIM(LTRIM(sub_typ)) IN ('C', 'D')
            AND m_date >= '2025-01-01'
        GROUP BY RTRIM(LTRIM(rsn_desc)), RTRIM(LTRIM(sub_typ))
        ORDER BY total_qty DESC
    `);

    console.log(JSON.stringify({
        product,
        m_cp: mCp,
        date_from: '2025-01-01',
        sub_typ_distribution: subTypDist.recordset,
        scrap_comparison: scrapCompare.recordset[0],
        top_B_reasons: bReasons.recordset,
        top_C_D_reasons: cDReasons.recordset,
    }, null, 2));
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
