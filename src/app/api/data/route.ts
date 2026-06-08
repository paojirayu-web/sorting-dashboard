import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { buildProductFilter } from '@/lib/product-filter';

type JobRow = {
    m_date: string;
    m_kiln: string;
    m_doc: string;
    m_job: string;
    m_cp: string;
    m_part: string;
    pt_desc1: string;
    pt_desc2?: string;
    qtyp: number;
    qtycomp: number;
    qtyscrp: number;
    qtyrjct: number;
    unit: string;
    m_user: string;
};

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const dateParam = searchParams.get('date');

        const pool = await getConnection();

        const startDateParam = searchParams.get('startDate');
        const endDateParam = searchParams.get('endDate');
        const productParam = searchParams.get('product');

        if (startDateParam && endDateParam && productParam) {
            const productFilter = buildProductFilter(productParam);
            const [jobsResult, reasonsResult] = await Promise.all([
                pool.request().query(`
                    SELECT
                        CONVERT(varchar(10), CAST(m_date AS date), 120) AS m_date,
                        m_kiln,
                        m_doc,
                        m_job,
                        UPPER(RTRIM(LTRIM(m_cp))) AS m_cp,
                        MAX(m_part) AS m_part,
                        MAX(pt_desc1) AS pt_desc1,
                        MAX(pt_desc2) AS pt_desc2,
                        MAX(qtyp) AS qtyp,
                        MAX(qtycomp) AS qtycomp,
                        MAX(qtyscrp) AS qtyscrp,
                        MAX(qtyrjct) AS qtyrjct,
                        MAX(unit) AS unit,
                        MAX(m_user) AS m_user
                    FROM dbo.v_rpt_sort_1 WITH (NOLOCK)
                    WHERE m_date >= '${startDateParam}' AND m_date <= DATEADD(day, 1, '${endDateParam}')
                        AND ${productFilter}
                    GROUP BY CAST(m_date AS date), m_kiln, m_doc, m_job, UPPER(RTRIM(LTRIM(m_cp)))
                    OPTION (RECOMPILE)
                `),
                pool.request().query(`
                    SELECT
                        CONVERT(varchar(10), CAST(m_date AS date), 120) AS m_date,
                        m_kiln,
                        m_doc,
                        m_job,
                        UPPER(RTRIM(LTRIM(m_cp))) AS m_cp,
                        RTRIM(LTRIM(sub_typ)) AS sub_typ,
                        RTRIM(LTRIM(rsn_desc)) AS rsn_desc,
                        SUM(sub_qty) AS sub_qty
                    FROM dbo.v_rpt_sort_1 WITH (NOLOCK)
                    WHERE m_date >= '${startDateParam}' AND m_date <= DATEADD(day, 1, '${endDateParam}')
                        AND ${productFilter}
                        AND rsn_desc IS NOT NULL
                        AND RTRIM(LTRIM(rsn_desc)) != ''
                    GROUP BY CAST(m_date AS date), m_kiln, m_doc, m_job, UPPER(RTRIM(LTRIM(m_cp))), RTRIM(LTRIM(sub_typ)), RTRIM(LTRIM(rsn_desc))
                    OPTION (RECOMPILE)
                `),
            ]);

            const jobMap = new Map<string, JobRow>();
            for (const job of jobsResult.recordset) {
                const key = `${job.m_date}|${job.m_doc}|${job.m_job}|${job.m_kiln}|${job.m_cp}`;
                jobMap.set(key, job);
            }

            const rows = [];
            const jobsWithReasons = new Set<string>();
            for (const reason of reasonsResult.recordset) {
                const key = `${reason.m_date}|${reason.m_doc}|${reason.m_job}|${reason.m_kiln}|${reason.m_cp}`;
                const job = jobMap.get(key);
                if (!job) continue;
                jobsWithReasons.add(key);
                rows.push({
                    ...job,
                    sub_typ: reason.sub_typ || '',
                    sub_qty: reason.sub_qty || 0,
                    rsn_desc: reason.rsn_desc || '',
                });
            }

            for (const [key, job] of jobMap.entries()) {
                if (jobsWithReasons.has(key)) continue;
                rows.push({
                    ...job,
                    sub_typ: '',
                    sub_qty: 0,
                    rsn_desc: '',
                });
            }

            return NextResponse.json(rows);
        }

        let query = `
            SELECT 
                m_date, m_kiln, m_doc, m_job, m_part, pt_desc1, pt_desc2, m_cp, 
                qtyp, qtycomp, qtyscrp, qtyrjct, 
                sub_typ, sub_qty, rsn_desc,
                unit, m_user
            FROM dbo.v_rpt_sort_1 WITH (NOLOCK)
        `;

        const shouldOrderByDate = true;
        if (startDateParam && endDateParam) {
            query += ` WHERE m_date >= '${startDateParam}' AND m_date <= DATEADD(day, 1, '${endDateParam}') `;
        } else if (dateParam) {
            query += ` WHERE m_date >= DATEADD(day, -7, '${dateParam}') AND m_date < DATEADD(day, 1, '${dateParam}') `;
        } else {
            query += ` WHERE m_date >= DATEADD(day, -7, CAST(GETDATE() AS DATE)) `;
        }

        if (shouldOrderByDate) {
            query += ` ORDER BY m_date DESC `;
        }
        query += ` OPTION (RECOMPILE) `;

        const result = await pool.request().query(query);

        return NextResponse.json(result.recordset);
    } catch (err) {
        console.error('SQL error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
