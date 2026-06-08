/**
 * Builds the SQL WHERE condition for filtering by product.
 * Products with a "DW:" prefix target 143 series (filtered by pt_desc2 and m_part LIKE '143%').
 * All other products target 142 series (filtered by pt_desc1).
 */
export function buildProductFilter(product: string): string {
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
