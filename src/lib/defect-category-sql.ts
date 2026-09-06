import type { SortSourceId } from '@/lib/sort-source';

export const CATEGORY_SQL_TOKEN = '{{CATEGORY_SQL}}';
export const CATEGORY_SQL_V_TOKEN = '{{CATEGORY_SQL_V}}';

/** SQL fragment for WW / DW Inglaze / DW Onglaze / DW All / ALL on m_part (source-aware). */
export function buildCategoryPartSql(
    category: string,
    source: SortSourceId = 'kilndb',
    column = 'm_part',
): string {
    if (category === 'WW') return `${column} LIKE '142%'`;
    if (category === 'DW') return source === 'sdb' ? '1=0' : `${column} LIKE '143%'`;
    if (category === 'DW_ONGLAZE') return source === 'sdb' ? '1=1' : '1=0';
    if (category === 'DW_ALL') return source === 'sdb' ? '1=1' : `${column} LIKE '143%'`;
    return '1=1';
}

export function injectCategorySql(sqlText: string, category: string, source: SortSourceId): string {
    return sqlText
        .split(CATEGORY_SQL_V_TOKEN).join(buildCategoryPartSql(category, source, 'v.m_part'))
        .split(CATEGORY_SQL_TOKEN).join(buildCategoryPartSql(category, source, 'm_part'));
}

/** Exclude somboon C1 special reasons that shift qty to comp. */
export const C1_SPECIAL_REASON_SQL_EXCLUDE = `
    NOT (
        LOWER(RTRIM(LTRIM(m_user))) LIKE 'somboon%'
        AND UPPER(RTRIM(LTRIM(m_cp))) = 'C'
        AND (
            RTRIM(LTRIM(rsn_desc)) IN (N'P พ่นฟริต', N'P ปั่นปากวางบอม')
            OR RTRIM(LTRIM(rsn_desc)) LIKE N'ต้องนำไปพ่น%'
            OR RTRIM(LTRIM(rsn_desc)) LIKE N'ซ่อมขอบปั่นปาก%'
        )
    )
`;

export type DefectListMode = 'scrap' | 'reject';

export function buildSubTypSql(mode: DefectListMode): string {
    if (mode === 'scrap') {
        return "UPPER(RTRIM(LTRIM(sub_typ))) IN ('C', 'D', 'B')";
    }
    return "(UPPER(RTRIM(LTRIM(sub_typ))) = 'P' OR RTRIM(LTRIM(sub_typ)) = N'เจียร์')";
}
