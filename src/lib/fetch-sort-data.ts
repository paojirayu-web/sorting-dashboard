import type { DataItem } from '@/types/dashboard';
import { querySortSources } from '@/lib/sort-query';
import { SORT_VIEW_TOKEN, sourcesForCategory } from '@/lib/sort-source';
import { normalizeDataRows } from '@/lib/utils';

/** Fetch sorting rows for a single calendar day (inclusive). */
export async function fetchSortDataForDate(
    date: string,
    category = 'ALL',
): Promise<DataItem[]> {
    const result = await querySortSources<Record<string, unknown>>(
        `
        SELECT 
            m_date, m_kiln, m_doc, m_job, m_part, pt_desc1, pt_desc2, m_cp, 
            qtyp, qtycomp, qtyscrp, qtyrjct, 
            sub_typ, sub_qty, rsn_desc,
            unit, m_user
        FROM ${SORT_VIEW_TOKEN} WITH (NOLOCK)
        WHERE m_date >= '${date}' AND m_date < DATEADD(day, 1, '${date}')
        ORDER BY m_date DESC
        OPTION (RECOMPILE)
        `,
        { sources: sourcesForCategory(category) },
    );
    return normalizeDataRows(result.recordset);
}
