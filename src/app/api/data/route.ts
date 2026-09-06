import { NextResponse } from 'next/server';
import { C1_SPECIAL_REASON_SQL } from '@/lib/c1-special-reason';
import { buildProductFilter } from '@/lib/product-filter';
import { querySortSources } from '@/lib/sort-query';
import { isValidCategory, SORT_VIEW_TOKEN, sourcesForCategory, sourcesForProduct } from '@/lib/sort-source';
import { sqlNString } from '@/lib/sql-params';
import { buildUnitFilterSql, parseUnitFilterParam } from '@/lib/unit-filter';
import { normalizeDataRows } from '@/lib/utils';

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
    c1_special_qty?: number;
    _source?: string;
};

type ReasonRow = {
    m_date: string;
    m_kiln: string;
    m_doc: string;
    m_job: string;
    m_cp: string;
    sub_typ: string;
    rsn_desc: string;
    sub_qty: number;
};

function dateRangeSql(startDate: string, endDate: string): string {
    return `m_date >= '${startDate}' AND m_date < DATEADD(day, 1, '${endDate}')`;
}

function emptyReasonFields() {
    return { sub_typ: '', sub_qty: 0, rsn_desc: '' };
}

function hasJobReasonKeys(searchParams: URLSearchParams): boolean {
    return (
        searchParams.has('m_doc') &&
        searchParams.has('m_job') &&
        searchParams.has('m_date') &&
        searchParams.has('m_kiln') &&
        searchParams.has('m_cp')
    );
}

function matchBlankable(column: string, value: string, upper = false): string {
    const trimmed = value.trim();
    const lhs = upper
        ? `UPPER(RTRIM(LTRIM(ISNULL(${column}, ''))))`
        : `RTRIM(LTRIM(ISNULL(${column}, '')))`;
    return `${lhs} = ${sqlNString(upper ? trimmed.toUpperCase() : trimmed)}`;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const dateParam = searchParams.get('date');
        const startDateParam = searchParams.get('startDate');
        const endDateParam = searchParams.get('endDate');
        const productParam = searchParams.get('product');
        const jobsOnly = searchParams.get('jobsOnly') === '1';
        const mDoc = searchParams.get('m_doc');
        const mJob = searchParams.get('m_job');
        const mDate = searchParams.get('m_date');
        const mKiln = searchParams.get('m_kiln');
        const mCp = searchParams.get('m_cp');
        const unitSql = buildUnitFilterSql(parseUnitFilterParam(searchParams.get('unit')), 'WW');
        const categoryParam = searchParams.get('category') || 'ALL';
        const category = isValidCategory(categoryParam) ? categoryParam : 'ALL';

        if (startDateParam && endDateParam && productParam) {
            const productFilter = buildProductFilter(productParam);
            const sources = sourcesForProduct(productParam);
            const dateSql = dateRangeSql(startDateParam, endDateParam);

            if (hasJobReasonKeys(searchParams) || searchParams.get('jobReasons') === '1') {
                const t0 = Date.now();
                const reasonsResult = await querySortSources<ReasonRow>(
                    `
                    SELECT
                        CONVERT(varchar(10), CAST(m_date AS date), 120) AS m_date,
                        m_kiln,
                        m_doc,
                        m_job,
                        UPPER(RTRIM(LTRIM(m_cp))) AS m_cp,
                        RTRIM(LTRIM(sub_typ)) AS sub_typ,
                        RTRIM(LTRIM(rsn_desc)) AS rsn_desc,
                        SUM(sub_qty) AS sub_qty
                    FROM ${SORT_VIEW_TOKEN} WITH (NOLOCK)
                    WHERE ${dateSql}
                        AND ${productFilter} AND ${unitSql}
                        AND CONVERT(varchar(10), CAST(m_date AS date), 120) = ${sqlNString((mDate || '').trim())}
                        AND ${matchBlankable('m_doc', mDoc || '')}
                        AND ${matchBlankable('m_job', mJob || '')}
                        AND ${matchBlankable('m_kiln', mKiln || '')}
                        AND ${matchBlankable('m_cp', mCp || '', true)}
                        AND rsn_desc IS NOT NULL
                        AND RTRIM(LTRIM(rsn_desc)) != ''
                    GROUP BY CAST(m_date AS date), m_kiln, m_doc, m_job, UPPER(RTRIM(LTRIM(m_cp))), RTRIM(LTRIM(sub_typ)), RTRIM(LTRIM(rsn_desc))
                    OPTION (RECOMPILE)
                    `,
                    { sources },
                );
                console.info(`[data] job-reasons ${Date.now() - t0}ms rows=${reasonsResult.recordset.length}`);
                return NextResponse.json(reasonsResult.recordset);
            }

            if (jobsOnly) {
                const t0 = Date.now();
                const jobsResult = await querySortSources<JobRow>(
                    `
                    SELECT
                        CONVERT(varchar(10), CAST(m_date AS date), 120) AS m_date,
                        m_kiln,
                        m_doc,
                        m_job,
                        UPPER(RTRIM(LTRIM(m_cp))) AS m_cp,
                        MAX(m_part) AS m_part,
                        MAX(pt_desc1) AS pt_desc1,
                        MAX(pt_desc2) AS pt_desc2,
                        CASE
                            WHEN MAX(qtyp) > 0 THEN MAX(qtyp)
                            ELSE SUM(CASE WHEN UPPER(RTRIM(LTRIM(ISNULL(sub_typ, '')))) = 'A' THEN ISNULL(sub_qty, 0) ELSE 0 END)
                        END AS qtyp,
                        MAX(qtycomp) AS qtycomp,
                        MAX(qtyscrp) AS qtyscrp,
                        MAX(qtyrjct) AS qtyrjct,
                        MAX(unit) AS unit,
                        COALESCE(
                            MAX(CASE WHEN LOWER(RTRIM(LTRIM(m_user))) LIKE 'somboon%' THEN RTRIM(LTRIM(m_user)) END),
                            MAX(m_user)
                        ) AS m_user,
                        SUM(CASE WHEN ${C1_SPECIAL_REASON_SQL} THEN ISNULL(sub_qty, 0) ELSE 0 END) AS c1_special_qty
                    FROM ${SORT_VIEW_TOKEN} WITH (NOLOCK)
                    WHERE ${dateSql}
                        AND ${productFilter} AND ${unitSql}
                    GROUP BY CAST(m_date AS date), m_kiln, m_doc, m_job, UPPER(RTRIM(LTRIM(m_cp)))
                    OPTION (RECOMPILE)
                    `,
                    { sources, required: true },
                );
                console.info(`[data] jobsOnly ${Date.now() - t0}ms rows=${jobsResult.recordset.length}`);
                return NextResponse.json(
                    jobsResult.recordset.map((job) => ({
                        ...job,
                        ...emptyReasonFields(),
                        c1_special_qty: Number(job.c1_special_qty) || 0,
                    })),
                );
            }

            const [jobsResult, reasonsResult] = await Promise.all([
                querySortSources<JobRow>(
                    `
                    SELECT
                        CONVERT(varchar(10), CAST(m_date AS date), 120) AS m_date,
                        m_kiln,
                        m_doc,
                        m_job,
                        UPPER(RTRIM(LTRIM(m_cp))) AS m_cp,
                        MAX(m_part) AS m_part,
                        MAX(pt_desc1) AS pt_desc1,
                        MAX(pt_desc2) AS pt_desc2,
                        CASE
                            WHEN MAX(qtyp) > 0 THEN MAX(qtyp)
                            ELSE SUM(CASE WHEN UPPER(RTRIM(LTRIM(ISNULL(sub_typ, '')))) = 'A' THEN ISNULL(sub_qty, 0) ELSE 0 END)
                        END AS qtyp,
                        MAX(qtycomp) AS qtycomp,
                        MAX(qtyscrp) AS qtyscrp,
                        MAX(qtyrjct) AS qtyrjct,
                        MAX(unit) AS unit,
                        MAX(m_user) AS m_user
                    FROM ${SORT_VIEW_TOKEN} WITH (NOLOCK)
                    WHERE ${dateSql}
                        AND ${productFilter} AND ${unitSql}
                    GROUP BY CAST(m_date AS date), m_kiln, m_doc, m_job, UPPER(RTRIM(LTRIM(m_cp)))
                    OPTION (RECOMPILE)
                    `,
                    { sources, required: true },
                ),
                querySortSources<ReasonRow>(
                    `
                    SELECT
                        CONVERT(varchar(10), CAST(m_date AS date), 120) AS m_date,
                        m_kiln,
                        m_doc,
                        m_job,
                        UPPER(RTRIM(LTRIM(m_cp))) AS m_cp,
                        RTRIM(LTRIM(sub_typ)) AS sub_typ,
                        RTRIM(LTRIM(rsn_desc)) AS rsn_desc,
                        SUM(sub_qty) AS sub_qty
                    FROM ${SORT_VIEW_TOKEN} WITH (NOLOCK)
                    WHERE ${dateSql}
                        AND ${productFilter} AND ${unitSql}
                        AND rsn_desc IS NOT NULL
                        AND RTRIM(LTRIM(rsn_desc)) != ''
                    GROUP BY CAST(m_date AS date), m_kiln, m_doc, m_job, UPPER(RTRIM(LTRIM(m_cp))), RTRIM(LTRIM(sub_typ)), RTRIM(LTRIM(rsn_desc))
                    OPTION (RECOMPILE)
                    `,
                    { sources },
                ),
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
                    ...emptyReasonFields(),
                });
            }

            return NextResponse.json(rows);
        }

        let query = `
            SELECT 
                CONVERT(varchar(10), CAST(m_date AS date), 120) AS m_date,
                m_kiln, m_doc, m_job, m_part, pt_desc1, pt_desc2, m_cp, 
                qtyp, qtycomp, qtyscrp, qtyrjct, 
                sub_typ, sub_qty, rsn_desc,
                unit, m_user
            FROM ${SORT_VIEW_TOKEN} WITH (NOLOCK)
        `;

        if (startDateParam && endDateParam) {
            query += ` WHERE ${dateRangeSql(startDateParam, endDateParam)} `;
        } else if (dateParam) {
            query += ` WHERE m_date >= DATEADD(day, -7, '${dateParam}') AND m_date < DATEADD(day, 1, '${dateParam}') `;
        } else {
            query += ` WHERE m_date >= DATEADD(day, -7, CAST(GETDATE() AS DATE)) `;
        }

        query += ` ORDER BY m_date DESC  OPTION (RECOMPILE) `;

        const result = await querySortSources<Record<string, unknown>>(query, {
            sources: sourcesForCategory(category),
            required: category === 'DW_ONGLAZE',
        });
        return NextResponse.json(normalizeDataRows(result.recordset));
    } catch (err) {
        console.error('SQL error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
