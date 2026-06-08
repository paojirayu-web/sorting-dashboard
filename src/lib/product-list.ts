import { getConnection, sql } from '@/lib/db';

/** Align with /api/product-stats (current year − 2). */
export const PRODUCT_LIST_LOOKBACK_YEARS = 2;

export const PRODUCT_LIST_CACHE_SECONDS = 3600;

export type ProductListItem = {
    value: string;
    label: string;
    searchText: string;
};

export function getProductListStartDate(): string {
    const year = new Date().getFullYear() - PRODUCT_LIST_LOOKBACK_YEARS;
    return `${year}-01-01`;
}

export async function queryProductListFromDb(
    startDate: string = getProductListStartDate(),
): Promise<ProductListItem[]> {
    const pool = await getConnection();

    const result = await pool
        .request()
        .input('startDate', sql.Date, startDate)
        .query(`
            SELECT
                CASE WHEN m_part LIKE '143%' THEN 1 ELSE 0 END AS is143,
                pt_desc1,
                CASE WHEN m_part LIKE '143%' THEN pt_desc2 ELSE NULL END AS pt_desc2
            FROM dbo.v_rpt_sort_1 WITH (NOLOCK)
            WHERE m_date >= @startDate
            GROUP BY
                CASE WHEN m_part LIKE '143%' THEN 1 ELSE 0 END,
                pt_desc1,
                CASE WHEN m_part LIKE '143%' THEN pt_desc2 ELSE NULL END
        `);

    const seen = new Set<string>();
    const items: ProductListItem[] = [];

    for (const row of result.recordset as {
        is143: number;
        pt_desc1: string;
        pt_desc2: string | null;
    }[]) {
        if (!row.pt_desc1) continue;
        if (row.is143 && !row.pt_desc2) continue;

        if (row.is143) {
            const desc1 = row.pt_desc1.trim();
            const desc2 = (row.pt_desc2 || '').trim();
            const value = `DW:${desc2}|||${desc1}`;
            if (seen.has(value)) continue;
            seen.add(value);
            items.push({
                value,
                label: `${desc1} (${desc2})`,
                searchText: `${desc1} ${desc2}`,
            });
            continue;
        }

        const desc1 = row.pt_desc1.trim();
        if (seen.has(desc1)) continue;
        seen.add(desc1);
        items.push({
            value: desc1,
            label: desc1,
            searchText: desc1,
        });
    }

    items.sort((a, b) => a.label.localeCompare(b.label));
    return items;
}
