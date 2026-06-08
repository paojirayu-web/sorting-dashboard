import { getConnection } from './src/lib/db';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function debugReason() {
    try {
        console.log('Searching for rows with rsn_desc LIKE %Jmmd72%...');
        console.log('Using DB_SERVER:', process.env.DB_SERVER);

        const pool = await getConnection();
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
        console.error('Error Details:');
        console.error(JSON.stringify(err, null, 2));
        if (err.originalError) {
            console.error('Original Error:', err.originalError);
        }
    } finally {
        process.exit();
    }
}

debugReason();
