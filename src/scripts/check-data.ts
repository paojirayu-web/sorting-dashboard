import { getConnection } from '../lib/db';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkData() {
    console.log('Connecting to database...');
    console.log('Config:', {
        server: process.env.DB_SERVER,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
    });

    try {
        const pool = await getConnection();
        console.log('Fetching sample data from dbo.v_rpt_sort_1...');
        const result = await pool.request().query('SELECT TOP 2 * FROM dbo.v_rpt_sort_1');

        if (result.recordset.length === 0) {
            console.log('No data found in View dbo.v_rpt_sort_1');
        } else {
            console.log('Sample Data Structure:');
            console.dir(result.recordset[0], { depth: null });

            console.log('\nColumn Names:');
            console.log(Object.keys(result.recordset[0]));
        }

        await pool.close();
        process.exit(0);
    } catch (err: any) {
        console.error('Failed to fetch data:');
        console.error(JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
        process.exit(1);
    }
}

checkData();
