import { getConnection } from './src/lib/db.js';

async function debugReason() {
    try {
        const pool = await getConnection();
        console.log('Searching for rows with rsn_desc LIKE %Jmmd72%...');
        const result = await pool.request().query(`
            SELECT TOP 20 
                m_date, m_CP, pt_desc1, sub_typ, rsn_desc, sub_qty 
            FROM dbo.v_rpt_sort_1 
            WHERE rsn_desc LIKE N'%Jmmd72%'
            ORDER BY m_date DESC
        `);

        console.table(result.recordset);

        console.log('\nCounting by sub_typ for Jmmd72:');
        const counts = await pool.request().query(`
            SELECT sub_typ, COUNT(*) as count, SUM(sub_qty) as total_qty
            FROM dbo.v_rpt_sort_1 
            WHERE rsn_desc LIKE N'%Jmmd72%'
            GROUP BY sub_typ
        `);
        console.table(counts.recordset);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

debugReason();
