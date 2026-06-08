import type { DataItem } from '@/types/dashboard';

/** Normalize m_date from SQL (Date object) or string to YYYY-MM-DD */
export function normalizeMDate(value: unknown): string {
    if (value == null || value === '') return '';
    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) return '';
        const y = value.getFullYear();
        const m = String(value.getMonth() + 1).padStart(2, '0');
        const d = String(value.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    const s = String(value).trim();
    if (!s) return '';
    return s.split('T')[0].split(' ')[0];
}

/** Normalize raw SQL row so m_date is always a string (for server-side APIs). */
export function normalizeDataItem(row: Record<string, unknown>): DataItem {
    return {
        ...(row as unknown as DataItem),
        m_date: normalizeMDate(row.m_date),
        m_kiln: String(row.m_kiln ?? ''),
        m_doc: String(row.m_doc ?? ''),
        m_job: String(row.m_job ?? ''),
        m_part: String(row.m_part ?? ''),
        pt_desc1: String(row.pt_desc1 ?? ''),
        pt_desc2: row.pt_desc2 != null ? String(row.pt_desc2) : undefined,
        m_cp: String(row.m_cp ?? ''),
        qtyp: Number(row.qtyp) || 0,
        qtycomp: Number(row.qtycomp) || 0,
        qtyscrp: Number(row.qtyscrp) || 0,
        qtyrjct: Number(row.qtyrjct) || 0,
        sub_typ: String(row.sub_typ ?? ''),
        sub_qty: Number(row.sub_qty) || 0,
        rsn_desc: String(row.rsn_desc ?? ''),
        unit: String(row.unit ?? ''),
        m_user: String(row.m_user ?? ''),
    };
}

export function normalizeDataRows(rows: Record<string, unknown>[]): DataItem[] {
    return rows.map(normalizeDataItem);
}

/** Format product description (strip D/W, W/W prefixes and extra spaces) */
export const formatProductDescription = (desc: string) => {
    if (!desc) return "";
    return desc
        .replace(/D\/W/g, "")
        .replace(/W\/W/g, "")
        .replace(/\s+/g, " ")
        .trim();
};

/** Format date from YYYY-MM-DD to DD-MM-YYYY */
export const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const clean = dateStr.split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return clean;
};

/** Format date for chart labels (DD/MM) */
export const formatDateShort = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    return dateStr;
};
