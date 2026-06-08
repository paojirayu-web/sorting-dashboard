import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const product = searchParams.get('product');
        const queryStartDate = searchParams.get('startDate');
        const queryEndDate = searchParams.get('endDate');
        const mcpFilter = searchParams.get('m_cp');

        if (!product) {
            return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
        }

        const pool = await getConnection();
        const currentYear = new Date().getFullYear();

        const minAllowedYear = currentYear - 2;
        const minAllowedDate = `${minAllowedYear}-01-01`;
        const defaultStartDate = `${currentYear - 1}-01-01`;
        const startDate = queryStartDate || defaultStartDate;

        if (startDate < minAllowedDate) {
            return NextResponse.json({
                error: `Date range exceeded safety limit. Data is available from ${minAllowedDate} onwards.`
            }, { status: 400 });
        }

        const dateFilter = queryEndDate
            ? `AND m_date >= '${startDate}' AND m_date <= '${queryEndDate}'`
            : `AND m_date >= '${startDate}'`;

        const cpCondition = mcpFilter && mcpFilter !== 'ALL'
            ? `AND UPPER(RTRIM(LTRIM(m_cp))) = '${mcpFilter.toUpperCase().replace(/'/g, "''")}'`
            : '';

        // Query: distinct job log entries sorted by date desc
        const logResult = await pool.request().query(`
            SELECT
                CONVERT(varchar(10), m_date, 120) as m_date,
                m_doc,
                m_job,
                m_kiln,
                UPPER(RTRIM(LTRIM(m_cp))) as m_cp,
                MAX(qtyp) as qtyp,
                MAX(qtycomp) as qtycomp,
                MAX(qtyscrp) as qtyscrp,
                MAX(qtyrjct) as qtyrjct
            FROM dbo.v_rpt_sort_1
            WHERE pt_desc1 = N'${product}' ${dateFilter} ${cpCondition}
            GROUP BY m_date, m_doc, m_job, m_kiln, UPPER(RTRIM(LTRIM(m_cp)))
            ORDER BY m_date DESC, m_doc DESC
        `);

        // Query: distinct m_cp options for this product in the date range
        const cpOptionsResult = await pool.request().query(`
            SELECT DISTINCT UPPER(RTRIM(LTRIM(m_cp))) as m_cp
            FROM dbo.v_rpt_sort_1
            WHERE pt_desc1 = N'${product}' ${dateFilter}
            ORDER BY m_cp
        `);

        const cpOptions = cpOptionsResult.recordset.map((r: any) => r.m_cp).filter(Boolean);

        return NextResponse.json({
            log: logResult.recordset,
            cpOptions
        });
    } catch (error: any) {
        console.error('product-log API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
