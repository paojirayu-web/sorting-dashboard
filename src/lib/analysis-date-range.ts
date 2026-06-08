import { getConnection, sql } from '@/lib/db';
import { buildProductFilter } from '@/lib/product-filter';
import { PRODUCT_LIST_LOOKBACK_YEARS } from '@/lib/product-list';

/** Shared PA + MA auto-range (matches product-stats / product list). */
export const ANALYSIS_AUTO_LOOKBACK_YEARS = PRODUCT_LIST_LOOKBACK_YEARS;

/** Monthly-stats API allows one extra year for manual ranges. */
export const MONTHLY_STATS_LOOKBACK_YEARS = 3;

export function getAnalysisLookbackStartDate(
    years: number = ANALYSIS_AUTO_LOOKBACK_YEARS,
): string {
    return `${new Date().getFullYear() - years}-01-01`;
}

export function getTodayDateString(): string {
    return new Date().toISOString().split('T')[0];
}

export type ProductDateRange = {
    minDate: string;
    maxDate: string;
    lookbackStart: string;
    lookbackEnd: string;
    hasData: boolean;
};

/**
 * If every calendar year from first→last has data, show only the latest 2-year
 * window (maxYear−1 … maxYear). If a year in between is missing (e.g. 2024 & 2026
 * but not 2025), show the full min→max span.
 */
export function resolveAutoDisplayDateRange(
    minDate: string,
    maxDate: string,
    yearsWithData: number[],
): { minDate: string; maxDate: string } {
    if (!minDate || !maxDate || yearsWithData.length === 0) {
        return { minDate, maxDate };
    }

    const years = [...yearsWithData].sort((a, b) => a - b);
    const minYear = years[0];
    const maxYear = years[years.length - 1];
    const isContiguousSpan = years.length === maxYear - minYear + 1;

    if (isContiguousSpan && years.length > 1) {
        const clipStart = `${maxYear - 1}-01-01`;
        const displayMin = clipStart > minDate ? clipStart : minDate;
        return {
            minDate: displayMin,
            maxDate,
        };
    }

    return { minDate, maxDate };
}

export async function queryProductDateRange(
    product: string,
    lookbackYears: number = ANALYSIS_AUTO_LOOKBACK_YEARS,
): Promise<ProductDateRange> {
    const lookbackStart = getAnalysisLookbackStartDate(lookbackYears);
    const lookbackEnd = getTodayDateString();
    const pool = await getConnection();
    const productFilter = buildProductFilter(product);

    const [boundsResult, yearsResult] = await Promise.all([
        pool
            .request()
            .input('lookbackStart', sql.Date, lookbackStart)
            .input('lookbackEnd', sql.Date, lookbackEnd)
            .query(`
                SELECT
                    CONVERT(varchar(10), MIN(CAST(m_date AS date)), 120) AS minDate,
                    CONVERT(varchar(10), MAX(CAST(m_date AS date)), 120) AS maxDate
                FROM dbo.v_rpt_sort_1 WITH (NOLOCK)
                WHERE ${productFilter}
                    AND m_date >= @lookbackStart
                    AND m_date < DATEADD(day, 1, @lookbackEnd)
            `),
        pool
            .request()
            .input('lookbackStart', sql.Date, lookbackStart)
            .input('lookbackEnd', sql.Date, lookbackEnd)
            .query(`
                SELECT DISTINCT YEAR(CAST(m_date AS date)) AS dataYear
                FROM dbo.v_rpt_sort_1 WITH (NOLOCK)
                WHERE ${productFilter}
                    AND m_date >= @lookbackStart
                    AND m_date < DATEADD(day, 1, @lookbackEnd)
                ORDER BY dataYear
            `),
    ]);

    const row = boundsResult.recordset[0] as { minDate: string | null; maxDate: string | null };
    const rawMin = row?.minDate?.trim() || '';
    const rawMax = row?.maxDate?.trim() || '';
    const hasData = Boolean(rawMin && rawMax);

    if (!hasData) {
        return {
            minDate: lookbackStart,
            maxDate: lookbackEnd,
            lookbackStart,
            lookbackEnd,
            hasData: false,
        };
    }

    const boundedMin = rawMin < lookbackStart ? lookbackStart : rawMin;
    const boundedMax = rawMax > lookbackEnd ? lookbackEnd : rawMax;
    const yearsWithData = (yearsResult.recordset as { dataYear: number }[]).map(
        (r) => r.dataYear,
    );

    const { minDate, maxDate } = resolveAutoDisplayDateRange(
        boundedMin,
        boundedMax,
        yearsWithData,
    );

    return {
        minDate,
        maxDate: maxDate >= minDate ? maxDate : minDate,
        lookbackStart,
        lookbackEnd,
        hasData: true,
    };
}
