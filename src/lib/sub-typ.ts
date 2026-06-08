/** Grade B scrap lines (sub_typ B) count toward qtyscrp like C/D. */
export function isScrapSubTyp(subTyp: string | null | undefined): boolean {
    const trimmed = (subTyp || '').trim();
    const upper = trimmed.toUpperCase();
    return upper === 'C' || upper === 'D' || upper === 'B';
}

export function isRejectSubTyp(subTyp: string | null | undefined): boolean {
    const trimmed = (subTyp || '').trim();
    return trimmed.toUpperCase() === 'P' || trimmed === 'เจียร์';
}

export function isDefectReasonSubTyp(subTyp: string | null | undefined): boolean {
    return isScrapSubTyp(subTyp) || isRejectSubTyp(subTyp);
}

/** Map ERP sub_typ to scrap (C) or reject (P) bucket for stats APIs. */
export function mapSubTypToBucket(subTyp: string | null | undefined): 'C' | 'P' | null {
    if (isScrapSubTyp(subTyp)) return 'C';
    if (isRejectSubTyp(subTyp)) return 'P';
    return null;
}

/** SQL fragment: UPPER(RTRIM(LTRIM(sub_typ))) IN ('C', 'D', 'B') */
export const SCRAP_SUB_TYP_SQL_IN = "('C', 'D', 'B')";
