import { getConnection } from '@/lib/db';
import type { DataItem } from '@/types/dashboard';
import { normalizeDataRows } from '@/lib/utils';

/** Fetch sorting rows for a single calendar day (inclusive). */
export async function fetchSortDataForDate(date: string): Promise<DataItem[]> {
    const pool = await getConnection();
    const query = `
        SELECT 
            m_date, m_kiln, m_doc, m_job, m_part, pt_desc1, pt_desc2, m_cp, 
            qtyp, qtycomp, qtyscrp, qtyrjct, 
            sub_typ, sub_qty, rsn_desc,
            unit, m_user
        FROM dbo.v_rpt_sort_1 WITH (NOLOCK)
        WHERE m_date >= '${date}' AND m_date < DATEADD(day, 1, '${date}')
        ORDER BY m_date DESC
        OPTION (RECOMPILE)
    `;
    const result = await pool.request().query(query);
    return normalizeDataRows(result.recordset as Record<string, unknown>[]);
}
