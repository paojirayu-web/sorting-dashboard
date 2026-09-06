/** Exact rsn_desc values treated as C1 special (qty → comp, not reject). */
const C1_SPECIAL_REASON_EXACT = ['P พ่นฟริต', 'P ปั่นปากวางบอม'] as const;

/** SQL predicate on rsn_desc for C1 special reasons (view has Thai text). */
export const C1_SPECIAL_REASON_SQL = `(
    RTRIM(LTRIM(ISNULL(rsn_desc, ''))) IN (N'P พ่นฟริต', N'P ปั่นปากวางบอม')
    OR RTRIM(LTRIM(ISNULL(rsn_desc, ''))) LIKE N'ต้องนำไปพ่น%'
    OR RTRIM(LTRIM(ISNULL(rsn_desc, ''))) LIKE N'ซ่อมขอบปั่นปาก%'
)`;

export function isSomboonCpC(item: { m_user?: string; m_cp?: string }): boolean {
    return (
        (item.m_user || '').toLowerCase().startsWith('somboon') &&
        (item.m_cp || '').trim().toUpperCase() === 'C'
    );
}

/** somboon + CP=C row with a reason that shifts sub_qty from reject to comp. */
export function isC1SpecialReason(rsnDesc: string | null | undefined): boolean {
    const desc = (rsnDesc || '').trim();
    if (!desc) return false;

    if (C1_SPECIAL_REASON_EXACT.some((exact) => desc === exact)) {
        return true;
    }

    return desc.startsWith('ต้องนำไปพ่น') || desc.startsWith('ซ่อมขอบปั่นปาก');
}

export function isC1SpecialReasonForRecord(item: {
    m_user?: string;
    m_cp?: string;
    rsn_desc?: string | null;
}): boolean {
    return isSomboonCpC(item) && isC1SpecialReason(item.rsn_desc);
}
