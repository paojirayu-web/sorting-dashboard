import { querySortSources } from '@/lib/sort-query';
import { bindIsoDate } from '@/lib/sql-params';
import { ONGLAZE_PRODUCT_PREFIX, SORT_VIEW_TOKEN } from '@/lib/sort-source';

/** Align with /api/product-stats (current year − 2). */
export const PRODUCT_LIST_LOOKBACK_YEARS = 2;

/** Name-list freshness: 2 hours. Search filters this list in the browser. */
export const PRODUCT_LIST_CACHE_SECONDS = 7200;

export type ProductListItem = {
    value: string;
    label: string;
    searchText: string;
    hasWhite?: boolean;
    hasBlack?: boolean;
};

type ProductListRow = {
    is143: number;
    pt_desc1: string;
    pt_desc2: string | null;
    hasWhite?: number | boolean;
    hasBlack?: number | boolean;
    _source?: 'kilndb' | 'sdb';
};

export function getProductListStartDate(): string {
    const year = new Date().getFullYear() - PRODUCT_LIST_LOOKBACK_YEARS;
    return `${year}-01-01`;
}

export async function queryProductListFromDb(
    startDate: string = getProductListStartDate(),
): Promise<ProductListItem[]> {
    const result = await querySortSources<ProductListRow>(
        `
            SELECT
                CASE WHEN m_part LIKE '143%' THEN 1 ELSE 0 END AS is143,
                pt_desc1,
                CASE WHEN m_part LIKE '143%' THEN pt_desc2 ELSE NULL END AS pt_desc2,
                MAX(CASE WHEN RTRIM(LTRIM(ISNULL(unit, ''))) LIKE 'W5240%' THEN 1 ELSE 0 END) AS hasWhite,
                MAX(CASE WHEN RTRIM(LTRIM(ISNULL(unit, ''))) LIKE 'W5241%' THEN 1 ELSE 0 END) AS hasBlack
            FROM ${SORT_VIEW_TOKEN} WITH (NOLOCK)
            WHERE m_date >= @startDate
            GROUP BY
                CASE WHEN m_part LIKE '143%' THEN 1 ELSE 0 END,
                pt_desc1,
                CASE WHEN m_part LIKE '143%' THEN pt_desc2 ELSE NULL END
        `,
        {
            bind: (req) => {
                bindIsoDate(req, 'startDate', startDate);
            },
        },
    );

    const seen = new Map<string, ProductListItem>();
    const flag = (value: unknown) => value === true || value === 1 || value === '1';
    const rowFlag = (row: ProductListRow, key: 'hasWhite' | 'hasBlack') => {
        const rec = row as Record<string, unknown>;
        return flag(rec[key] ?? rec[key.toLowerCase()]);
    };

    for (const row of result.recordset) {
        if (!row.pt_desc1) continue;
        const isOnglaze = row._source === 'sdb';
        const is143 = Boolean(row.is143) || isOnglaze;
        if (is143 && !row.pt_desc2 && !isOnglaze) continue;

        if (is143 || isOnglaze) {
            const desc1 = row.pt_desc1.trim();
            const desc2 = (row.pt_desc2 || '').trim();
            const value = isOnglaze
                ? desc2
                    ? `${ONGLAZE_PRODUCT_PREFIX}${desc2}|||${desc1}`
                    : `${ONGLAZE_PRODUCT_PREFIX}${desc1}`
                : `DW:${desc2}|||${desc1}`;
            if (seen.has(value)) continue;
            seen.set(value, {
                value,
                label: isOnglaze
                    ? desc2
                        ? `${desc1} (${desc2}) · DW Onglaze`
                        : `${desc1} · DW Onglaze`
                    : `${desc1} (${desc2})`,
                searchText: isOnglaze
                    ? `${desc1} ${desc2} onglaze sdb`
                    : `${desc1} ${desc2}`,
            });
            continue;
        }

        const desc1 = row.pt_desc1.trim();
        const existing = seen.get(desc1);
        const hasWhite = rowFlag(row, 'hasWhite');
        const hasBlack = rowFlag(row, 'hasBlack');
        if (existing) {
            existing.hasWhite = Boolean(existing.hasWhite || hasWhite);
            existing.hasBlack = Boolean(existing.hasBlack || hasBlack);
            continue;
        }
        seen.set(desc1, {
            value: desc1,
            label: desc1,
            searchText: desc1,
            hasWhite,
            hasBlack,
        });
    }

    const items = [...seen.values()];

    items.sort((a, b) => a.label.localeCompare(b.label));
    return items;
}
