import { NextResponse } from 'next/server';
import { querySortSources } from '@/lib/sort-query';
import { SORT_VIEW_TOKEN, sourcesForProduct } from '@/lib/sort-source';

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

        const sources = sourcesForProduct(product);
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

        const [logResult, cpOptionsResult] = await Promise.all([
            querySortSources<Record<string, unknown>>(`
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
            FROM ${SORT_VIEW_TOKEN}
            WHERE pt_desc1 = N'${product}' ${dateFilter} ${cpCondition}
            GROUP BY m_date, m_doc, m_job, m_kiln, UPPER(RTRIM(LTRIM(m_cp)))
            ORDER BY m_date DESC, m_doc DESC
        `, { sources, required: true }),
            querySortSources<{ m_cp: string }>(`
            SELECT DISTINCT UPPER(RTRIM(LTRIM(m_cp))) as m_cp
            FROM ${SORT_VIEW_TOKEN}
            WHERE pt_desc1 = N'${product}' ${dateFilter}
            ORDER BY m_cp
        `, { sources }),
        ]);

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
