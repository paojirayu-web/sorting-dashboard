import { sql } from '@/lib/db';
import { CATEGORY_SQL_TOKEN, CATEGORY_SQL_V_TOKEN, buildSubTypSql, C1_SPECIAL_REASON_SQL_EXCLUDE, type DefectListMode } from '@/lib/defect-category-sql';
import { mergeSumByKeys, querySortSources } from '@/lib/sort-query';
import { bindIsoDate } from '@/lib/sql-params';
import { SORT_VIEW_TOKEN, sourcesForCategory, type SortSourceId } from '@/lib/sort-source';
import { buildUnitFilterSql, type UnitFilter } from '@/lib/unit-filter';
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
    /** Total process qty (qtyp) for this ware in the month — all jobs in scope */
    qtyproc: number;
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
    unitFilter: UnitFilter = 'ALL',
): Promise<DefectReasonItem[]> {
    const subTypSql = buildSubTypSql(mode);
    const unitSql = buildUnitFilterSql(unitFilter, category);
    const sources = sourcesForCategory(category);

    const result = await querySortSources<{ rsn_desc: string; qty: number }>(
        `
            SELECT
                RTRIM(LTRIM(rsn_desc)) AS rsn_desc,
                SUM(sub_qty) AS qty
            FROM ${SORT_VIEW_TOKEN} WITH (NOLOCK)
            WHERE m_date >= @startDate
                AND m_date < DATEADD(day, 1, @endDate)
                AND rsn_desc IS NOT NULL
                AND RTRIM(LTRIM(rsn_desc)) != ''
                AND ${CATEGORY_SQL_TOKEN}
                AND ${C1_SPECIAL_REASON_SQL_EXCLUDE}
                AND ${subTypSql}
                AND ${unitSql}
            GROUP BY RTRIM(LTRIM(rsn_desc))
            HAVING SUM(sub_qty) > 0
            ORDER BY SUM(sub_qty) DESC
        `,
        {
            sources,
            category,
            bind: (req) => {
                bindIsoDate(req, 'startDate', startDate);
                bindIsoDate(req, 'endDate', endDate);
            },
        },
    );

    return mergeSumByKeys(result.recordset, ['rsn_desc'], ['qty'])
        .map((row) => {
            const label = (row.rsn_desc || '').trim();
            return {
                value: label,
                label,
                searchText: label,
                qty: Number(row.qty) || 0,
            };
        })
        .filter((row) => row.value && row.qty > 0)
        .sort((a, b) => b.qty - a.qty);
}

async function queryDefectTrendRecords(
    sources: SortSourceId[],
    startDate: string,
    endDate: string,
    category: string,
    subTypSql: string,
    unitSql: string,
    rsnDesc: string,
): Promise<DefectTrendRecord[]> {
    const result = await querySortSources<DefectTrendRecord>(
        `
            SELECT
                LEFT(CONVERT(VARCHAR(10), CAST(m_date AS date), 120), 7) AS month,
                UPPER(RTRIM(LTRIM(m_cp))) AS m_cp,
                RTRIM(LTRIM(m_user)) AS m_user,
                RTRIM(LTRIM(sub_typ)) AS sub_typ,
                SUM(sub_qty) AS sub_qty
            FROM ${SORT_VIEW_TOKEN} WITH (NOLOCK)
            WHERE m_date >= @startDate
                AND m_date < DATEADD(day, 1, @endDate)
                AND RTRIM(LTRIM(rsn_desc)) = @rsnDesc
                AND ${CATEGORY_SQL_TOKEN}
                AND ${C1_SPECIAL_REASON_SQL_EXCLUDE}
                AND ${subTypSql}
                AND ${unitSql}
            GROUP BY
                LEFT(CONVERT(VARCHAR(10), CAST(m_date AS date), 120), 7),
                UPPER(RTRIM(LTRIM(m_cp))),
                RTRIM(LTRIM(m_user)),
                RTRIM(LTRIM(sub_typ))
            HAVING SUM(sub_qty) > 0
            ORDER BY month
        `,
        {
            sources,
            category,
            bind: (req) => {
                bindIsoDate(req, 'startDate', startDate);
                bindIsoDate(req, 'endDate', endDate);
                req.input('rsnDesc', sql.NVarChar, rsnDesc);
            },
        },
    );

    return mergeSumByKeys(result.recordset, ['month', 'm_cp', 'm_user', 'sub_typ'], ['sub_qty']).map((row) => ({
        month: row.month,
        m_cp: row.m_cp || '',
        m_user: row.m_user || '',
        sub_typ: row.sub_typ || '',
        sub_qty: Number(row.sub_qty) || 0,
    }));
}

async function queryMonthlyJobMetrics(
    sources: SortSourceId[],
    startDate: string,
    endDate: string,
    category: string,
    unitSql: string,
): Promise<DefectJobMetricRow[]> {
    const result = await querySortSources<DefectJobMetricRow>(
        `
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
                FROM ${SORT_VIEW_TOKEN} WITH (NOLOCK)
                WHERE m_date >= @startDate
                    AND m_date < DATEADD(day, 1, @endDate)
                    AND ${CATEGORY_SQL_TOKEN}
                    AND ${unitSql}
                GROUP BY
                    CAST(m_date AS date),
                    m_doc,
                    m_job,
                    m_kiln,
                    UPPER(RTRIM(LTRIM(m_cp)))
            ) jobs
            GROUP BY month, m_cp, m_user
        `,
        {
            sources,
            category,
            bind: (req) => {
                bindIsoDate(req, 'startDate', startDate);
                bindIsoDate(req, 'endDate', endDate);
            },
        },
    );

    return mergeSumByKeys(result.recordset, ['month', 'm_cp', 'm_user'], ['qtyp', 'qtyscrp', 'qtyrjct']).map((row) => ({
        month: row.month,
        m_cp: row.m_cp || '',
        m_user: row.m_user || '',
        qtyp: Number(row.qtyp) || 0,
        qtyscrp: Number(row.qtyscrp) || 0,
        qtyrjct: Number(row.qtyrjct) || 0,
    }));
}

function escapeSqlLiteral(value: string): string {
    return (value || '').replace(/'/g, "''");
}

/** First/last calendar day for YYYY-MM */
function monthBounds(month: string): { start: string; end: string } {
    const [y, m] = month.split('-').map(Number);
    const mm = String(m).padStart(2, '0');
    const lastDay = new Date(y, m, 0).getDate();
    return {
        start: `${y}-${mm}-01`,
        end: `${y}-${mm}-${String(lastDay).padStart(2, '0')}`,
    };
}

/** Narrow scan to one month when requested; keeps results within the caller's date range. */
function resolveQueryDateRange(
    rangeStart: string,
    rangeEnd: string,
    month?: string,
): { queryStart: string; queryEnd: string; singleMonth: string | null } {
    if (!month) {
        return { queryStart: rangeStart, queryEnd: rangeEnd, singleMonth: null };
    }
    const bounds = monthBounds(month);
    return {
        queryStart: bounds.start < rangeStart ? rangeStart : bounds.start,
        queryEnd: bounds.end > rangeEnd ? rangeEnd : bounds.end,
        singleMonth: month,
    };
}

function bindQueryDateRange(
    request: sql.Request,
    queryStart: string,
    queryEnd: string,
): sql.Request {
    return bindIsoDate(bindIsoDate(request, 'queryStart', queryStart), 'queryEnd', queryEnd);
}

const QUERY_DATE_RANGE_SQL = 'm_date >= @queryStart AND m_date < DATEADD(day, 1, @queryEnd)';

function attachQtyprocToProducts(
    products: Omit<DefectProductMonthRow, 'qtyproc'>[],
    qtyprocByKey: Map<string, number>,
): DefectProductMonthRow[] {
    return products.map((row) => {
        const key = [row.month, row.pt_desc1, row.pt_desc2, row.m_cp, row.m_user].join('\0');
        return {
            ...row,
            qtyproc: qtyprocByKey.get(key) || 0,
        };
    });
}

async function queryBulkWareQtyproc(
    sources: SortSourceId[],
    startDate: string,
    endDate: string,
    category: string,
    unitSql: string,
    productsBase: Omit<DefectProductMonthRow, 'qtyproc'>[],
    month?: string,
): Promise<Map<string, number>> {
    const byKey = new Map<string, number>();
    const ptDesc1Set = [...new Set(productsBase.map((row) => row.pt_desc1).filter(Boolean))];
    if (ptDesc1Set.length === 0) return byKey;

    const { queryStart, queryEnd, singleMonth } = resolveQueryDateRange(startDate, endDate, month);
    const ptDesc1In = ptDesc1Set.map((value) => `N'${escapeSqlLiteral(value)}'`).join(', ');
    const unitFilter = unitSql.replace(/\bunit\b/g, 'v.unit');

    const monthSelect = singleMonth
        ? '@singleMonth AS month'
        : 'LEFT(CONVERT(VARCHAR(10), job_date, 120), 7) AS month';
    const monthOuterGroup = singleMonth ? '' : 'LEFT(CONVERT(VARCHAR(10), job_date, 120), 7),';

    const result = await querySortSources<{
        month: string;
        pt_desc1: string;
        pt_desc2: string;
        m_cp: string;
        m_user: string;
        qtyproc: number;
    }>(
        `
            SELECT
                ${monthSelect},
                pt_desc1,
                pt_desc2,
                m_cp,
                m_user,
                SUM(job_qtyp) AS qtyproc
            FROM (
                SELECT
                    CAST(v.m_date AS date) AS job_date,
                    MAX(RTRIM(LTRIM(v.pt_desc1))) AS pt_desc1,
                    MAX(RTRIM(LTRIM(ISNULL(v.pt_desc2, '')))) AS pt_desc2,
                    MAX(UPPER(RTRIM(LTRIM(v.m_cp)))) AS m_cp,
                    MAX(RTRIM(LTRIM(v.m_user))) AS m_user,
                    MAX(v.qtyp) AS job_qtyp
                FROM ${SORT_VIEW_TOKEN} v WITH (NOLOCK)
                WHERE v.m_date >= @queryStart
                    AND v.m_date < DATEADD(day, 1, @queryEnd)
                    AND v.pt_desc1 IS NOT NULL
                    AND RTRIM(LTRIM(v.pt_desc1)) != ''
                    AND RTRIM(LTRIM(v.pt_desc1)) IN (${ptDesc1In})
                    AND ${CATEGORY_SQL_V_TOKEN}
                    AND ${unitFilter}
                GROUP BY
                    CAST(v.m_date AS date),
                    v.m_doc,
                    v.m_job,
                    v.m_kiln
            ) jobs
            GROUP BY
                ${monthOuterGroup}
                pt_desc1,
                pt_desc2,
                m_cp,
                m_user
        `,
        {
            sources,
            category,
            bind: (req) => {
                bindQueryDateRange(req, queryStart, queryEnd);
                if (singleMonth) req.input('singleMonth', sql.NVarChar, singleMonth);
            },
        },
    );

    result.recordset.forEach((row) => {
        const key = [row.month, row.pt_desc1, row.pt_desc2, row.m_cp, row.m_user].join('\0');
        byKey.set(key, (byKey.get(key) || 0) + (Number(row.qtyproc) || 0));
    });

    return byKey;
}

async function queryDefectProductBreakdown(
    sources: SortSourceId[],
    startDate: string,
    endDate: string,
    category: string,
    subTypSql: string,
    unitSql: string,
    rsnDesc: string,
    month?: string,
): Promise<Omit<DefectProductMonthRow, 'qtyproc'>[]> {
    const { queryStart, queryEnd, singleMonth } = resolveQueryDateRange(startDate, endDate, month);
    const monthSelect = singleMonth
        ? '@singleMonth AS month'
        : 'LEFT(CONVERT(VARCHAR(10), CAST(m_date AS date), 120), 7) AS month';
    const monthGroupBy = singleMonth
        ? ''
        : 'LEFT(CONVERT(VARCHAR(10), CAST(m_date AS date), 120), 7),';

    const result = await querySortSources<Omit<DefectProductMonthRow, 'qtyproc'>>(
        `
            SELECT
                ${monthSelect},
                RTRIM(LTRIM(pt_desc1)) AS pt_desc1,
                RTRIM(LTRIM(ISNULL(pt_desc2, ''))) AS pt_desc2,
                MAX(m_part) AS m_part,
                UPPER(RTRIM(LTRIM(m_cp))) AS m_cp,
                RTRIM(LTRIM(m_user)) AS m_user,
                SUM(sub_qty) AS qty
            FROM ${SORT_VIEW_TOKEN} WITH (NOLOCK)
            WHERE ${QUERY_DATE_RANGE_SQL}
                AND RTRIM(LTRIM(rsn_desc)) = @rsnDesc
                AND pt_desc1 IS NOT NULL
                AND RTRIM(LTRIM(pt_desc1)) != ''
                AND ${CATEGORY_SQL_TOKEN}
                AND ${C1_SPECIAL_REASON_SQL_EXCLUDE}
                AND ${subTypSql}
                AND ${unitSql}
            GROUP BY
                ${monthGroupBy}
                RTRIM(LTRIM(pt_desc1)),
                RTRIM(LTRIM(ISNULL(pt_desc2, ''))),
                UPPER(RTRIM(LTRIM(m_cp))),
                RTRIM(LTRIM(m_user))
            HAVING SUM(sub_qty) > 0
        `,
        {
            sources,
            category,
            bind: (req) => {
                bindQueryDateRange(req, queryStart, queryEnd).input('rsnDesc', sql.NVarChar, rsnDesc);
                if (singleMonth) req.input('singleMonth', sql.NVarChar, singleMonth);
            },
        },
    );

    return mergeSumByKeys(
        result.recordset.map((row) => ({
            month: row.month,
            pt_desc1: row.pt_desc1 || '',
            pt_desc2: row.pt_desc2 || '',
            m_part: row.m_part || '',
            m_cp: row.m_cp || '',
            m_user: row.m_user || '',
            qty: Number(row.qty) || 0,
        })),
        ['month', 'pt_desc1', 'pt_desc2', 'm_cp', 'm_user'],
        ['qty'],
    );
}

export type DefectTrendChartPayload = Pick<DefectTrendPayload, 'trend' | 'jobMetrics'>;
export type DefectBreakdownPayload = Pick<DefectTrendPayload, 'products'>;

export async function queryDefectWareKilnsForWare(
    startDate: string,
    endDate: string,
    category: string,
    rsnDesc: string,
    mode: DefectListMode,
    unitFilter: UnitFilter,
    month: string,
    ptDesc1: string,
    ptDesc2: string,
): Promise<DefectWareKilnMonthRow[]> {
    const subTypSql = buildSubTypSql(mode);
    const unitSql = buildUnitFilterSql(unitFilter, category);
    const sources = sourcesForCategory(category);
    const { queryStart, queryEnd } = resolveQueryDateRange(startDate, endDate, month);
    const ptDesc2Trimmed = (ptDesc2 || '').trim();
    const ptDesc2Sql = ptDesc2Trimmed
        ? `AND RTRIM(LTRIM(ISNULL(pt_desc2, ''))) = @ptDesc2`
        : '';

    const result = await querySortSources<{ kiln: string; m_cp: string; m_user: string; qty: number }>(
        `
            SELECT
                RTRIM(LTRIM(ISNULL(m_kiln, ''))) AS kiln,
                UPPER(RTRIM(LTRIM(m_cp))) AS m_cp,
                RTRIM(LTRIM(m_user)) AS m_user,
                SUM(sub_qty) AS qty
            FROM ${SORT_VIEW_TOKEN} WITH (NOLOCK)
            WHERE ${QUERY_DATE_RANGE_SQL}
                AND RTRIM(LTRIM(rsn_desc)) = @rsnDesc
                AND RTRIM(LTRIM(pt_desc1)) = @ptDesc1
                ${ptDesc2Sql}
                AND ${CATEGORY_SQL_TOKEN}
                AND ${C1_SPECIAL_REASON_SQL_EXCLUDE}
                AND ${subTypSql}
                AND ${unitSql}
            GROUP BY
                RTRIM(LTRIM(ISNULL(m_kiln, ''))),
                UPPER(RTRIM(LTRIM(m_cp))),
                RTRIM(LTRIM(m_user))
            HAVING SUM(sub_qty) > 0
        `,
        {
            sources,
            category,
            bind: (req) => {
                bindQueryDateRange(req, queryStart, queryEnd)
                    .input('rsnDesc', sql.NVarChar, rsnDesc)
                    .input('ptDesc1', sql.NVarChar, ptDesc1);
                if (ptDesc2Trimmed) req.input('ptDesc2', sql.NVarChar, ptDesc2Trimmed);
            },
        },
    );

    return mergeSumByKeys(result.recordset, ['kiln', 'm_cp', 'm_user'], ['qty']).map((row) => ({
        month,
        pt_desc1: ptDesc1,
        pt_desc2: ptDesc2Trimmed,
        m_part: '',
        kiln: (row.kiln || '').trim() || '-',
        m_cp: row.m_cp || '',
        m_user: row.m_user || '',
        qty: Number(row.qty) || 0,
    }));
}

/** Job output metrics — independent of rsn_desc; safe to cache per date/category/unit scope. */
export async function queryDefectJobMetrics(
    startDate: string,
    endDate: string,
    category: string,
    unitFilter: UnitFilter = 'ALL',
): Promise<DefectJobMetricRow[]> {
    const unitSql = buildUnitFilterSql(unitFilter, category);
    return queryMonthlyJobMetrics(sourcesForCategory(category), startDate, endDate, category, unitSql);
}

export async function queryDefectTrendOnly(
    startDate: string,
    endDate: string,
    category: string,
    rsnDesc: string,
    mode: DefectListMode,
    unitFilter: UnitFilter = 'ALL',
): Promise<Pick<DefectTrendChartPayload, 'trend'>> {
    const sources = sourcesForCategory(category);
    const subTypSql = buildSubTypSql(mode);
    const unitSql = buildUnitFilterSql(unitFilter, category);
    const trend = await queryDefectTrendRecords(
        sources,
        startDate,
        endDate,
        category,
        subTypSql,
        unitSql,
        rsnDesc,
    );
    return { trend };
}

export async function queryDefectTrendChartPayload(
    startDate: string,
    endDate: string,
    category: string,
    rsnDesc: string,
    mode: DefectListMode,
    unitFilter: UnitFilter = 'ALL',
): Promise<DefectTrendChartPayload> {
    const [trendPayload, jobMetrics] = await Promise.all([
        queryDefectTrendOnly(startDate, endDate, category, rsnDesc, mode, unitFilter),
        queryDefectJobMetrics(startDate, endDate, category, unitFilter),
    ]);
    return { trend: trendPayload.trend, jobMetrics };
}

export async function queryDefectBreakdownForMonth(
    startDate: string,
    endDate: string,
    category: string,
    rsnDesc: string,
    mode: DefectListMode,
    unitFilter: UnitFilter,
    month: string,
): Promise<DefectBreakdownPayload> {
    const sources = sourcesForCategory(category);
    const subTypSql = buildSubTypSql(mode);
    const unitSql = buildUnitFilterSql(unitFilter, category);
    const bench = process.env.NODE_ENV === 'development';

    const t0 = bench ? performance.now() : 0;
    const productsBase = await queryDefectProductBreakdown(
        sources,
        startDate,
        endDate,
        category,
        subTypSql,
        unitSql,
        rsnDesc,
        month,
    );
    const t1 = bench ? performance.now() : 0;

    const qtyprocByKey = await queryBulkWareQtyproc(
        sources,
        startDate,
        endDate,
        category,
        unitSql,
        productsBase,
        month,
    );
    const t2 = bench ? performance.now() : 0;

    if (bench) {
        const ptCount = new Set(productsBase.map((r) => r.pt_desc1)).size;
        console.log(
            `[breakdown-bench] month=${month} unit=${unitFilter} rsn=${rsnDesc.slice(0, 20)} ` +
                `products=${Math.round(t1 - t0)}ms qtyproc=${Math.round(t2 - t1)}ms ` +
                `rows=${productsBase.length} pt_desc1=${ptCount}`,
        );
    }

    return {
        products: attachQtyprocToProducts(productsBase, qtyprocByKey),
    };
}

/** @deprecated Use queryDefectBreakdownForMonth — full-range breakdown is too slow for production. */
export async function queryDefectBreakdownPayload(
    startDate: string,
    endDate: string,
    category: string,
    rsnDesc: string,
    mode: DefectListMode,
    unitFilter: UnitFilter = 'ALL',
): Promise<DefectBreakdownPayload> {
    const sources = sourcesForCategory(category);
    const subTypSql = buildSubTypSql(mode);
    const unitSql = buildUnitFilterSql(unitFilter, category);

    const productsBase = await queryDefectProductBreakdown(
        sources,
        startDate,
        endDate,
        category,
        subTypSql,
        unitSql,
        rsnDesc,
    );

    const qtyprocByKey = await queryBulkWareQtyproc(
        sources,
        startDate,
        endDate,
        category,
        unitSql,
        productsBase,
    );

    return {
        products: attachQtyprocToProducts(productsBase, qtyprocByKey),
    };
}

export async function queryDefectTrendPayload(
    startDate: string,
    endDate: string,
    category: string,
    rsnDesc: string,
    mode: DefectListMode,
    unitFilter: UnitFilter = 'ALL',
): Promise<DefectTrendPayload> {
    const [chart, breakdown] = await Promise.all([
        queryDefectTrendChartPayload(startDate, endDate, category, rsnDesc, mode, unitFilter),
        Promise.resolve({ products: [] as DefectTrendPayload['products'] }),
    ]);

    return { ...chart, products: breakdown.products, wareKilns: [] };
}

/** @deprecated Use queryDefectTrendPayload */
export async function queryDefectTrend(
    startDate: string,
    endDate: string,
    category: string,
    rsnDesc: string,
    mode: DefectListMode,
    unitFilter: UnitFilter = 'ALL',
): Promise<DefectTrendRecord[]> {
    const payload = await queryDefectTrendPayload(startDate, endDate, category, rsnDesc, mode, unitFilter);
    return payload.trend;
}
