/**
 * Builds the SQL WHERE condition for filtering by product.
 * Products with a "DW:" prefix target kilndb 143 (DW Inglaze).
 * Products with an "OG:" prefix target Db_Sorting_SDB (DW Onglaze).
 * All other products target kilndb 142 (WW).
 */
export function buildProductFilter(product: string): string {
    if (product.startsWith('OG:')) {
        const rest = product.slice(3);
        const sepIdx = rest.indexOf('|||');
        if (sepIdx !== -1) {
            const pt_desc2 = rest.slice(0, sepIdx).replace(/'/g, "''");
            const pt_desc1 = rest.slice(sepIdx + 3).replace(/'/g, "''");
            return `pt_desc2 = N'${pt_desc2}' AND pt_desc1 = N'${pt_desc1}'`;
        }
        const pt_desc1 = rest.replace(/'/g, "''");
        return `pt_desc1 = N'${pt_desc1}'`;
    }
    if (product.startsWith('DW:')) {
        const rest = product.slice(3);
        const sepIdx = rest.indexOf('|||');
        if (sepIdx !== -1) {
            // New format: "DW:${desc2}|||${desc1}" — filter by both desc1 and desc2
            const pt_desc2 = rest.slice(0, sepIdx).replace(/'/g, "''");
            const pt_desc1 = rest.slice(sepIdx + 3).replace(/'/g, "''");
            return `pt_desc2 = N'${pt_desc2}' AND pt_desc1 = N'${pt_desc1}' AND m_part LIKE '143%'`;
        }
        // Legacy format: "DW:${desc2}" — filter by desc2 only
        const pt_desc2 = rest.replace(/'/g, "''");
        return `pt_desc2 = N'${pt_desc2}' AND m_part LIKE '143%'`;
    }
    const pt_desc1 = product.replace(/'/g, "''");
    return `pt_desc1 = N'${pt_desc1}'`;
}
