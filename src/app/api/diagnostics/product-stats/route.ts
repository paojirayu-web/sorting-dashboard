/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { buildProductFilter } from '@/lib/product-filter';

type StepResult = {
    name: string;
    elapsedMs: number;
    rows?: number;
    error?: string;
};

async function measureStep<T>(name: string, fn: () => Promise<T>, getRows?: (result: T) => number): Promise<StepResult> {
    const started = Date.now();
    try {
        const result = await fn();
        return {
            name,
            elapsedMs: Date.now() - started,
            rows: getRows ? getRows(result) : undefined,
        };
    } catch (error) {
        return {
            name,
            elapsedMs: Date.now() - started,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const product = searchParams.get('product');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!product || !startDate || !endDate) {
        return NextResponse.json(
            { error: 'product, startDate, and endDate are required' },
            { status: 400 },
        );
    }

    const pool = await getConnection();
    const productFilter = buildProductFilter(product);
    const dateFilter = `AND m_date >= '${startDate}' AND m_date <= '${endDate}'`;
    const whereClause = `${productFilter} ${dateFilter}`;
    const steps: StepResult[] = [];

    steps.push(await measureStep(
        'sql_count_filtered_rows',
        () => pool.request().query(`
            SELECT COUNT_BIG(*) AS filteredRows
            FROM dbo.v_rpt_sort_1 WITH (NOLOCK)
            WHERE ${whereClause}
            OPTION (RECOMPILE)
        `),
        (result) => Number(result.recordset[0]?.filteredRows || 0),
    ));

    steps.push(await measureStep(
        'sql_count_grouped_jobs',
        () => pool.request().query(`
            SELECT COUNT_BIG(*) AS groupedJobs
            FROM (
                SELECT m_doc, m_job, CAST(m_date AS date) AS m_date, m_kiln, UPPER(RTRIM(LTRIM(m_cp))) AS m_cp
                FROM dbo.v_rpt_sort_1 WITH (NOLOCK)
                WHERE ${whereClause}
                GROUP BY m_doc, m_job, CAST(m_date AS date), m_kiln, UPPER(RTRIM(LTRIM(m_cp)))
            ) AS grouped
            OPTION (RECOMPILE)
        `),
        (result) => Number(result.recordset[0]?.groupedJobs || 0),
    ));

    steps.push(await measureStep(
        'sql_count_reason_rows',
        () => pool.request().query(`
            SELECT COUNT_BIG(*) AS reasonRows
            FROM dbo.v_rpt_sort_1 WITH (NOLOCK)
            WHERE ${whereClause}
                AND rsn_desc IS NOT NULL
                AND RTRIM(LTRIM(rsn_desc)) != ''
            OPTION (RECOMPILE)
        `),
        (result) => Number(result.recordset[0]?.reasonRows || 0),
    ));

    steps.push(await measureStep(
        'sql_metrics_aggregate',
        () => pool.request().query(`
            SELECT
                computed_cp AS m_cp,
                SUM(qtyp) AS totalQtyp,
                SUM(qtycomp) AS totalQtycomp,
                SUM(qtyscrp) AS totalScrap,
                SUM(qtyrjct) AS totalReject
            FROM (
                SELECT
                    m_doc, m_job, m_date, m_kiln,
                    CASE
                        WHEN MAX(CASE WHEN m_user LIKE 'somboon%' THEN 1 ELSE 0 END) = 1
                        THEN CASE
                            WHEN UPPER(RTRIM(LTRIM(m_cp))) = 'C' THEN 'C1'
                            ELSE UPPER(RTRIM(LTRIM(m_cp))) + ' (Round 1)'
                        END
                        ELSE UPPER(RTRIM(LTRIM(m_cp)))
                    END AS computed_cp,
                    MAX(qtyp) AS qtyp,
                    MAX(qtycomp) AS qtycomp,
                    MAX(qtyscrp) AS qtyscrp,
                    MAX(qtyrjct) AS qtyrjct
                FROM dbo.v_rpt_sort_1 WITH (NOLOCK)
                WHERE ${whereClause}
                GROUP BY m_doc, m_job, m_date, m_kiln, UPPER(RTRIM(LTRIM(m_cp)))
            ) AS unique_jobs
            GROUP BY computed_cp
            OPTION (RECOMPILE)
        `),
        (result) => result.recordset.length,
    ));

    steps.push(await measureStep(
        'sql_reasons_aggregate',
        () => pool.request().query(`
            SELECT computed_cp AS m_cp, sub_typ, rsn_desc, SUM(sub_qty) AS sub_qty
            FROM (
                SELECT
                    RTRIM(LTRIM(sub_typ)) AS sub_typ,
                    RTRIM(LTRIM(rsn_desc)) AS rsn_desc,
                    sub_qty,
                    CASE
                        WHEN MAX(CASE WHEN m_user LIKE 'somboon%' THEN 1 ELSE 0 END) OVER (PARTITION BY m_doc, m_job, m_date, m_kiln, UPPER(RTRIM(LTRIM(m_cp)))) = 1
                        THEN CASE
                            WHEN UPPER(RTRIM(LTRIM(m_cp))) = 'C' THEN 'C1'
                            ELSE UPPER(RTRIM(LTRIM(m_cp))) + ' (Round 1)'
                        END
                        ELSE UPPER(RTRIM(LTRIM(m_cp)))
                    END AS computed_cp
                FROM dbo.v_rpt_sort_1 WITH (NOLOCK)
                WHERE ${whereClause}
            ) AS t
            WHERE rsn_desc IS NOT NULL AND rsn_desc != ''
                AND (sub_typ IS NOT NULL OR computed_cp LIKE '%(Round 1)%' OR computed_cp = 'C1')
            GROUP BY computed_cp, sub_typ, rsn_desc
            OPTION (RECOMPILE)
        `),
        (result) => result.recordset.length,
    ));

    steps.push(await measureStep(
        'sql_info_lookup',
        () => pool.request().query(`
            SELECT TOP 1 pt_desc1, pt_desc2, m_part
            FROM dbo.v_rpt_sort_1 WITH (NOLOCK)
            WHERE ${productFilter}
            OPTION (RECOMPILE)
        `),
        (result) => result.recordset.length,
    ));

    let rawRows: any[] = [];
    steps.push(await measureStep(
        'sql_fetch_raw_columns',
        async () => {
            const result = await pool.request().query(`
                SELECT
                    m_doc, m_job, m_date, m_kiln,
                    m_cp, m_user,
                    qtyp, qtycomp, qtyscrp, qtyrjct,
                    sub_typ, sub_qty, rsn_desc,
                    pt_desc1, pt_desc2, m_part
                FROM dbo.v_rpt_sort_1 WITH (NOLOCK)
                WHERE ${whereClause}
                OPTION (RECOMPILE)
            `);
            rawRows = result.recordset;
            return result;
        },
        (result) => result.recordset.length,
    ));

    steps.push(await measureStep(
        'node_group_raw_rows',
        async () => {
            const groups = new Map<string, number>();
            for (const row of rawRows) {
                const dateKey = String(row.m_date).split('T')[0];
                const cp = String(row.m_cp || '').trim().toUpperCase();
                const key = `${row.m_doc}|${row.m_job}|${dateKey}|${row.m_kiln}|${cp}`;
                groups.set(key, (groups.get(key) || 0) + 1);
            }
            return groups;
        },
        (groups) => groups.size,
    ));

    return NextResponse.json({
        product,
        startDate,
        endDate,
        totalElapsedMs: steps.reduce((sum, step) => sum + step.elapsedMs, 0),
        steps,
    });
}
