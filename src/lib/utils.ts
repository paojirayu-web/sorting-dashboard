import type { DataItem } from '@/types/dashboard';

/** Coerce mssql numeric / string / Decimal-like values to a finite number. */
export function toFiniteNumber(value: unknown): number {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'bigint') return Number(value);
    if (typeof value === 'string') {
        const n = Number(value.replace(/,/g, '').trim());
        return Number.isFinite(n) ? n : 0;
    }
    if (value && typeof value === 'object' && 'valueOf' in value) {
        const n = Number((value as { valueOf: () => unknown }).valueOf());
        if (Number.isFinite(n)) return n;
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

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
        qtyp: toFiniteNumber(row.qtyp),
        qtycomp: toFiniteNumber(row.qtycomp),
        qtyscrp: toFiniteNumber(row.qtyscrp),
        qtyrjct: toFiniteNumber(row.qtyrjct),
        sub_typ: String(row.sub_typ ?? ''),
        sub_qty: toFiniteNumber(row.sub_qty),
        rsn_desc: String(row.rsn_desc ?? ''),
        unit: String(row.unit ?? ''),
        m_user: String(row.m_user ?? ''),
        c1_special_qty: row.c1_special_qty != null ? Number(row.c1_special_qty) || 0 : undefined,
        _source: row._source === 'sdb' ? 'sdb' : row._source === 'kilndb' ? 'kilndb' : undefined,
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
