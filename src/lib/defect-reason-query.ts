import { getConnection, sql } from '@/lib/db';
import { buildCategoryPartSql, buildSubTypSql, C1_SPECIAL_REASON_SQL_EXCLUDE, type DefectListMode } from '@/lib/defect-category-sql';
import type { DefectReasonItem } from '@/types/dashboard';

export type DefectTrendRecord = {
    month: string;
    m_cp: string;
    m_user: string;
    sub_typ: string;
    sub_qty: number;
};

export type DefectJobMetricRow = {
    month: string;
    m_cp: string;
    m_user: string;
    qtyp: number;
    qtyscrp: number;
    qtyrjct: number;
};

export type DefectProductMonthRow = {
    month: string;
    pt_desc1: string;
    pt_desc2: string;
    m_part: string;
    m_cp: string;
    m_user: string;
    qty: number;
};


export type DefectWareKilnMonthRow = {
    month: string;
    pt_desc1: string;
    pt_desc2: string;
    m_part: string;
    kiln: string;
    m_cp: string;
    m_user: string;
    qty: number;
};

export type DefectTrendPayload = {
    trend: DefectTrendRecord[];
    jobMetrics: DefectJobMetricRow[];
    products: DefectProductMonthRow[];
    wareKilns: DefectWareKilnMonthRow[];
};

export async function queryDefectReasonList(
    startDate: string,
    endDate: string,
    category: string,
    mode: DefectListMode,
): Promise<DefectReasonItem[]> {
    const pool = await getConnection();
    const categorySql = buildCategoryPartSql(category);
    const subTypSql = buildSubTypSql(mode);

    const result = await pool
        .request()
        .input('startDate', sql.Date, startDate)
        .input('endDate', sql.Date, endDate)
        .query(`
            SELECT
                RTRIM(LTRIM(rsn_desc)) AS rsn_desc,
                SUM(sub_qty) AS qty
            FROM dbo.v_rpt_sort_1 WITH (NOLOCK)
            WHERE m_date >= @startDate
                AND m_date < DATEADD(day, 1, @endDate)
                AND rsn_desc IS NOT NULL
                AND RTRIM(LTRIM(rsn_desc)) != ''
                AND ${categorySql}
                AND ${C1_SPECIAL_REASON_SQL_EXCLUDE}
                AND ${subTypSql}
            GROUP BY RTRIM(LTRIM(rsn_desc))
            HAVING SUM(sub_qty) > 0
            ORDER BY SUM(sub_qty) DESC
            OPTION (RECOMPILE)
        `);

    return (result.recordset as { rsn_desc: string; qty: number }[])
        .map((row) => {
            const label = row.rsn_desc.trim();
            return {
                value: label,
                label,
                searchText: label,
                qty: Number(row.qty) || 0,
            };
        });
}

async function queryDefectTrendRecords(
    pool: Awaited<ReturnType<typeof getConnection>>,
    startDate: string,
    endDate: string,
    categorySql: string,
    subTypSql: string,
    rsnDesc: string,
): Promise<DefectTrendRecord[]> {
    const result = await pool
        .request()
        .input('startDate', sql.Date, startDate)
        .input('endDate', sql.Date, endDate)
        .input('rsnDesc', sql.NVarChar, rsnDesc)
        .query(`
            SELECT
                LEFT(CONVERT(VARCHAR(10), CAST(m_date AS date), 120), 7) AS month,
                UPPER(RTRIM(LTRIM(m_cp))) AS m_cp,
                RTRIM(LTRIM(m_user)) AS m_user,
                RTRIM(LTRIM(sub_typ)) AS sub_typ,
                SUM(sub_qty) AS sub_qty
            FROM dbo.v_rpt_sort_1 WITH (NOLOCK)
            WHERE m_date >= @startDate
                AND m_date < DATEADD(day, 1, @endDate)
                AND RTRIM(LTRIM(rsn_desc)) = @rsnDesc
                AND ${categorySql}
                AND ${C1_SPECIAL_REASON_SQL_EXCLUDE}
                AND ${subTypSql}
            GROUP BY
                LEFT(CONVERT(VARCHAR(10), CAST(m_date AS date), 120), 7),
                UPPER(RTRIM(LTRIM(m_cp))),
                RTRIM(LTRIM(m_user)),
                RTRIM(LTRIM(sub_typ))
            HAVING SUM(sub_qty) > 0
            ORDER BY month
            OPTION (RECOMPILE)
        `);

    return (result.recordset as DefectTrendRecord[]).map((row) => ({
        month: row.month,
        m_cp: row.m_cp || '',
        m_user: row.m_user || '',
        sub_typ: row.sub_typ || '',
        sub_qty: Number(row.sub_qty) || 0,
    }));
}

async function queryMonthlyJobMetrics(
    pool: Awaited<ReturnType<typeof getConnection>>,
    startDate: string,
    endDate: string,
    categorySql: string,
): Promise<DefectJobMetricRow[]> {
    const result = await pool
        .request()
        .input('startDate', sql.Date, startDate)
        .input('endDate', sql.Date, endDate)
        .query(`
            SELECT
                month,
                m_cp,
                m_user,
                SUM(job_qtyp) AS qtyp,
                SUM(job_scrap) AS qtyscrp,
                SUM(job_reject) AS qtyrjct
            FROM (
                SELECT
                    LEFT(CONVERT(VARCHAR(10), CAST(m_date AS date), 120), 7) AS month,
                    UPPER(RTRIM(LTRIM(m_cp))) AS m_cp,
                    MAX(m_user) AS m_user,
                    MAX(qtyp) AS job_qtyp,
                    MAX(qtyscrp) AS job_scrap,
                    MAX(qtyrjct) AS job_reject
                FROM dbo.v_rpt_sort_1 WITH (NOLOCK)
                WHERE m_date >= @startDate
                    AND m_date < DATEADD(day, 1, @endDate)
                    AND ${categorySql}
                GROUP BY
                    CAST(m_date AS date),
                    m_doc,
                    m_job,
                    m_kiln,
                    UPPER(RTRIM(LTRIM(m_cp)))
            ) jobs
            GROUP BY month, m_cp, m_user
            OPTION (RECOMPILE)
        `);

    return (result.recordset as DefectJobMetricRow[]).map((row) => ({
        month: row.month,
        m_cp: row.m_cp || '',
        m_user: row.m_user || '',
        qtyp: Number(row.qtyp) || 0,
        qtyscrp: Number(row.qtyscrp) || 0,
        qtyrjct: Number(row.qtyrjct) || 0,
    }));
}

async function queryDefectProductBreakdown(
    pool: Awaited<ReturnType<typeof getConnection>>,
    startDate: string,
    endDate: string,
    categorySql: string,
    subTypSql: string,
    rsnDesc: string,
): Promise<DefectProductMonthRow[]> {
    const result = await pool
        .request()
        .input('startDate', sql.Date, startDate)
        .input('endDate', sql.Date, endDate)
        .input('rsnDesc', sql.NVarChar, rsnDesc)
        .query(`
            SELECT
                LEFT(CONVERT(VARCHAR(10), CAST(m_date AS date), 120), 7) AS month,
                RTRIM(LTRIM(pt_desc1)) AS pt_desc1,
                RTRIM(LTRIM(ISNULL(pt_desc2, ''))) AS pt_desc2,
                MAX(m_part) AS m_part,
                UPPER(RTRIM(LTRIM(m_cp))) AS m_cp,
                RTRIM(LTRIM(m_user)) AS m_user,
                SUM(sub_qty) AS qty
            FROM dbo.v_rpt_sort_1 WITH (NOLOCK)
            WHERE m_date >= @startDate
                AND m_date < DATEADD(day, 1, @endDate)
                AND RTRIM(LTRIM(rsn_desc)) = @rsnDesc
                AND pt_desc1 IS NOT NULL
                AND RTRIM(LTRIM(pt_desc1)) != ''
                AND ${categorySql}
                AND ${C1_SPECIAL_REASON_SQL_EXCLUDE}
                AND ${subTypSql}
            GROUP BY
                LEFT(CONVERT(VARCHAR(10), CAST(m_date AS date), 120), 7),
                RTRIM(LTRIM(pt_desc1)),
                RTRIM(LTRIM(ISNULL(pt_desc2, ''))),
                UPPER(RTRIM(LTRIM(m_cp))),
                RTRIM(LTRIM(m_user))
            HAVING SUM(sub_qty) > 0
            OPTION (RECOMPILE)
        `);

    return (result.recordset as DefectProductMonthRow[]).map((row) => ({
        month: row.month,
        pt_desc1: row.pt_desc1 || '',
        pt_desc2: row.pt_desc2 || '',
        m_part: row.m_part || '',
        m_cp: row.m_cp || '',
        m_user: row.m_user || '',
        qty: Number(row.qty) || 0,
    }));
}

async function queryDefectWareKilnBreakdown(
    pool: Awaited<ReturnType<typeof getConnection>>,
    startDate: string,
    endDate: string,
    categorySql: string,
    subTypSql: string,
    rsnDesc: string,
): Promise<DefectWareKilnMonthRow[]> {
    const result = await pool
        .request()
        .input('startDate', sql.Date, startDate)
        .input('endDate', sql.Date, endDate)
        .input('rsnDesc', sql.NVarChar, rsnDesc)
        .query(`
            SELECT
                LEFT(CONVERT(VARCHAR(10), CAST(m_date AS date), 120), 7) AS month,
                RTRIM(LTRIM(pt_desc1)) AS pt_desc1,
                RTRIM(LTRIM(ISNULL(pt_desc2, ''))) AS pt_desc2,
                MAX(m_part) AS m_part,
                RTRIM(LTRIM(ISNULL(m_kiln, ''))) AS kiln,
                UPPER(RTRIM(LTRIM(m_cp))) AS m_cp,
                RTRIM(LTRIM(m_user)) AS m_user,
                SUM(sub_qty) AS qty
            FROM dbo.v_rpt_sort_1 WITH (NOLOCK)
            WHERE m_date >= @startDate
                AND m_date < DATEADD(day, 1, @endDate)
                AND RTRIM(LTRIM(rsn_desc)) = @rsnDesc
                AND pt_desc1 IS NOT NULL
                AND RTRIM(LTRIM(pt_desc1)) != ''
                AND ${categorySql}
                AND ${C1_SPECIAL_REASON_SQL_EXCLUDE}
                AND ${subTypSql}
            GROUP BY
                LEFT(CONVERT(VARCHAR(10), CAST(m_date AS date), 120), 7),
                RTRIM(LTRIM(pt_desc1)),
                RTRIM(LTRIM(ISNULL(pt_desc2, ''))),
                RTRIM(LTRIM(ISNULL(m_kiln, ''))),
                UPPER(RTRIM(LTRIM(m_cp))),
                RTRIM(LTRIM(m_user))
            HAVING SUM(sub_qty) > 0
            OPTION (RECOMPILE)
        `);

    return (result.recordset as DefectWareKilnMonthRow[]).map((row) => ({
        month: row.month,
        pt_desc1: row.pt_desc1 || '',
        pt_desc2: row.pt_desc2 || '',
        m_part: row.m_part || '',
        kiln: (row.kiln || '').trim() || '-',
        m_cp: row.m_cp || '',
        m_user: row.m_user || '',
        qty: Number(row.qty) || 0,
    }));
}

export async function queryDefectTrendPayload(
    startDate: string,
    endDate: string,
    category: string,
    rsnDesc: string,
    mode: DefectListMode,
): Promise<DefectTrendPayload> {
    const pool = await getConnection();
    const categorySql = buildCategoryPartSql(category);
    const subTypSql = buildSubTypSql(mode);

    const [trend, jobMetrics, products, wareKilns] = await Promise.all([
        queryDefectTrendRecords(pool, startDate, endDate, categorySql, subTypSql, rsnDesc),
        queryMonthlyJobMetrics(pool, startDate, endDate, categorySql),
        queryDefectProductBreakdown(pool, startDate, endDate, categorySql, subTypSql, rsnDesc),
        queryDefectWareKilnBreakdown(pool, startDate, endDate, categorySql, subTypSql, rsnDesc),
    ]);

    return { trend, jobMetrics, products, wareKilns };
}

/** @deprecated Use queryDefectTrendPayload */
export async function queryDefectTrend(
    startDate: string,
    endDate: string,
    category: string,
    rsnDesc: string,
    mode: DefectListMode,
): Promise<DefectTrendRecord[]> {
    const payload = await queryDefectTrendPayload(startDate, endDate, category, rsnDesc, mode);
    return payload.trend;
}
