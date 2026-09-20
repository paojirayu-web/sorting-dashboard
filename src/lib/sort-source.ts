export type SortSourceId = 'kilndb' | 'sdb';

export type LineFamily = 'ALL' | 'WW' | 'DW';
export type WwTone = 'ALL' | 'WW_WHITE' | 'WW_BLACK';
export type DwKind = 'ALL' | 'INGLAZE' | 'ONGLAZE';

/** Wire value sent to APIs / client filters. */
export type CategoryValue = 'ALL' | 'WW' | 'DW' | 'DW_ONGLAZE' | 'DW_ALL';

export const LINE_FAMILY_OPTIONS: { value: LineFamily; label: string }[] = [
    { value: 'ALL', label: 'All' },
    { value: 'WW', label: 'WW' },
    { value: 'DW', label: 'DW' },
];

export const WW_TONE_OPTIONS: { value: WwTone; label: string }[] = [
    { value: 'ALL', label: 'All' },
    { value: 'WW_WHITE', label: 'White' },
    { value: 'WW_BLACK', label: 'Black' },
];

export const DW_KIND_OPTIONS: { value: DwKind; label: string }[] = [
    { value: 'ALL', label: 'All' },
    { value: 'INGLAZE', label: 'Inglaze' },
    { value: 'ONGLAZE', label: 'Onglaze' },
];

export const CATEGORY_VALUES: CategoryValue[] = ['ALL', 'WW', 'DW', 'DW_ONGLAZE', 'DW_ALL'];

export const KILNDB_VIEW = 'dbo.v_rpt_sort_1';
/** Remote WW/DW Inglaze view on Db_Sorting (same host as SDB, no linked-server hop). */
export const KILNDB_DIRECT_VIEW = 'dbo.v_rpt_sort';
export const SDB_VIEW = 'dbo.v_rpt_sort';
export const SORT_VIEW_TOKEN = '{{SORT_VIEW}}';

export const ONGLAZE_PRODUCT_PREFIX = 'OG:';
export const DW_INGLAZE_PRODUCT_PREFIX = 'DW:';

export function isValidCategory(value: string): value is CategoryValue {
    return (CATEGORY_VALUES as string[]).includes(value);
}

export function isGlazeDwCategory(category: string): boolean {
    return category === 'DW' || category === 'DW_ONGLAZE' || category === 'DW_ALL';
}

export function deriveCategory(family: LineFamily, dwKind: DwKind): CategoryValue {
    if (family === 'ALL') return 'ALL';
    if (family === 'WW') return 'WW';
    if (dwKind === 'ONGLAZE') return 'DW_ONGLAZE';
    if (dwKind === 'INGLAZE') return 'DW';
    return 'DW_ALL';
}

export function deriveUnitFilter(family: LineFamily, wwTone: WwTone): WwTone {
    return family === 'WW' ? wwTone : 'ALL';
}

export function getCategoryLabel(category: string): string {
    switch (category) {
        case 'ALL':
            return 'All';
        case 'WW':
            return 'WW';
        case 'DW':
            return 'DW Inglaze';
        case 'DW_ONGLAZE':
            return 'DW Onglaze';
        case 'DW_ALL':
            return 'DW';
        default:
            return category;
    }
}

export function getHierarchyLabel(family: LineFamily, wwTone: WwTone, dwKind: DwKind): string {
    if (family === 'ALL') return 'All';
    if (family === 'WW') {
        if (wwTone === 'WW_WHITE') return 'WW · White';
        if (wwTone === 'WW_BLACK') return 'WW · Black';
        return 'WW';
    }
    if (dwKind === 'INGLAZE') return 'DW · Inglaze';
    if (dwKind === 'ONGLAZE') return 'DW · Onglaze';
    return 'DW';
}

export function getDashboardSkin(family: LineFamily, wwTone: WwTone, dwKind: DwKind): string {
    if (family === 'WW') {
        if (wwTone === 'WW_BLACK') return 'ww-black';
        if (wwTone === 'WW_WHITE') return 'ww-white';
        return 'ww';
    }
    if (family === 'DW') {
        if (dwKind === 'ONGLAZE') return 'dw-onglaze';
        if (dwKind === 'INGLAZE') return 'dw-inglaze';
        return 'dw';
    }
    return 'all';
}

/** Per-row accent when All / mixed families share one table. */
export function getRowSkin(item: {
    _source?: string | null;
    m_part?: string | null;
    unit?: string | null;
}): string {
    if (item._source === 'sdb') return 'dw-onglaze';
    const part = String(item.m_part || '').trim();
    if (part.startsWith('143')) return 'dw-inglaze';
    const unit = String(item.unit || '');
    if (unit.startsWith('W5240')) return 'ww-white';
    if (unit.startsWith('W5241')) return 'ww-black';
    if (part.startsWith('142')) return 'ww';
    return 'all';
}

export type RowSkinPalette = { accent: string; text: string; soft: string };

const ROW_SKIN_PALETTE: Record<string, RowSkinPalette> = {
    all: { accent: '#3b82f6', text: '#60a5fa', soft: 'rgba(59, 130, 246, 0.22)' },
    ww: { accent: '#0284c7', text: '#38bdf8', soft: 'rgba(2, 132, 199, 0.24)' },
    'ww-white': { accent: '#0d9488', text: '#5eead4', soft: 'rgba(13, 148, 136, 0.28)' },
    'ww-black': { accent: '#db2777', text: '#f9a8d4', soft: 'rgba(219, 39, 119, 0.28)' },
    dw: { accent: '#ea580c', text: '#fb923c', soft: 'rgba(234, 88, 12, 0.24)' },
    'dw-inglaze': { accent: '#d97706', text: '#fbbf24', soft: 'rgba(217, 119, 6, 0.28)' },
    'dw-onglaze': { accent: '#9333ea', text: '#c084fc', soft: 'rgba(147, 51, 234, 0.28)' },
};

const ROW_SKIN_PALETTE_LIGHT: Record<string, RowSkinPalette> = {
    all: { accent: '#2563eb', text: '#1d4ed8', soft: 'rgba(37, 99, 235, 0.14)' },
    ww: { accent: '#0369a1', text: '#0369a1', soft: 'rgba(3, 105, 161, 0.14)' },
    'ww-white': { accent: '#0f766e', text: '#0f766e', soft: 'rgba(15, 118, 110, 0.16)' },
    'ww-black': { accent: '#9d174d', text: '#9d174d', soft: 'rgba(157, 23, 77, 0.14)' },
    dw: { accent: '#c2410c', text: '#c2410c', soft: 'rgba(194, 65, 12, 0.14)' },
    'dw-inglaze': { accent: '#b45309', text: '#b45309', soft: 'rgba(180, 83, 9, 0.16)' },
    'dw-onglaze': { accent: '#7e22ce', text: '#7e22ce', soft: 'rgba(126, 34, 206, 0.14)' },
};

export function getRowSkinPalette(item: {
    _source?: string | null;
    m_part?: string | null;
    unit?: string | null;
}, isLight = false): RowSkinPalette {
    const skin = getRowSkin(item);
    const table = isLight ? ROW_SKIN_PALETTE_LIGHT : ROW_SKIN_PALETTE;
    return table[skin] || table.all;
}

export function isDwCodeware(item: {
    _source?: string | null;
    m_part?: string | null;
    pt_desc1?: string | null;
}): boolean {
    if (item._source === 'sdb') return true;
    return String(item.m_part || '').startsWith('143') || String(item.pt_desc1 || '').startsWith('143');
}

/** DW desc1 uses the family color (Inglaze amber / Onglaze purple). Desc2 stays the default title color. */
export function dwDesc1Color(
    item: {
        _source?: string | null;
        m_part?: string | null;
        unit?: string | null;
        pt_desc1?: string | null;
    },
    isLight = false,
): string | undefined {
    if (!isDwCodeware(item)) return undefined;
    return getRowSkinPalette(item, isLight).text;
}

export function getKilnBadgeStyle(item: {
    _source?: string | null;
    m_part?: string | null;
    unit?: string | null;
}, isLight = false): { backgroundColor: string; color: string; borderColor: string } {
    const c = getRowSkinPalette(item, isLight);
    return {
        backgroundColor: c.soft,
        color: c.text,
        borderColor: c.accent,
    };
}

export function sourcesForCategory(category: string): SortSourceId[] {
    if (category === 'DW_ONGLAZE') return ['sdb'];
    if (category === 'WW' || category === 'DW') return ['kilndb'];
    return ['kilndb', 'sdb'];
}

export function sourcesForProduct(product: string): SortSourceId[] {
    return product.startsWith(ONGLAZE_PRODUCT_PREFIX) ? ['sdb'] : ['kilndb'];
}

/** Match a PA/MA product id against the selected category (WW White/Black share names; unit is separate). */
export function productMatchesCategory(product: string, category: string): boolean {
    const isOnglaze = product.startsWith(ONGLAZE_PRODUCT_PREFIX);
    const isDwInglaze = product.startsWith(DW_INGLAZE_PRODUCT_PREFIX);
    if (category === 'WW') return !isOnglaze && !isDwInglaze;
    if (category === 'DW') return isDwInglaze;
    if (category === 'DW_ONGLAZE') return isOnglaze;
    if (category === 'DW_ALL') return isDwInglaze || isOnglaze;
    return true;
}

function isTruthyFlag(value: unknown): boolean {
    return value === true || value === 1 || value === '1';
}

export function productListHasWwUnitFlags(
    products: { hasWhite?: unknown; hasBlack?: unknown }[],
): boolean {
    return products.some((item) => isTruthyFlag(item.hasWhite) || isTruthyFlag(item.hasBlack));
}

/** Search-box filter: WW White/Black use unit flags from the product list. */
export function productMatchesSearch(
    item: { value: string; hasWhite?: unknown; hasBlack?: unknown } | undefined,
    category: string,
    wwTone: WwTone = 'ALL',
): boolean {
    if (!item?.value) return false;
    if (!productMatchesCategory(item.value, category)) return false;
    if (category !== 'WW' || wwTone === 'ALL') return true;
    if (wwTone === 'WW_WHITE') return isTruthyFlag(item.hasWhite);
    if (wwTone === 'WW_BLACK') return isTruthyFlag(item.hasBlack);
    return true;
}

export function viewForSource(source: SortSourceId): string {
    return source === 'sdb' ? SDB_VIEW : KILNDB_VIEW;
}
