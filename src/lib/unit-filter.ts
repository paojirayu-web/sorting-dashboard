import type { DataItem } from '@/types/dashboard';
import { isSomboonCpC } from '@/lib/c1-special-reason';
import { isGlazeDwCategory } from '@/lib/sort-source';

export type UnitFilter = 'ALL' | 'WW_WHITE' | 'WW_BLACK';

export const UNIT_LABELS: Record<UnitFilter, string> = {
    ALL: 'ALL',
    WW_WHITE: 'WW(white)',
    WW_BLACK: 'WW(black)',
};

export function parseUnitFilterParam(value: string | null | undefined): UnitFilter {
    if (value === 'WW_WHITE' || value === 'WW_BLACK') return value;
    return 'ALL';
}

export function buildUnitFilterSql(unitFilter: UnitFilter, category: string): string {
    const effective = getEffectiveUnitFilter(unitFilter, category);
    if (effective === 'WW_WHITE') return "RTRIM(LTRIM(ISNULL(unit, ''))) LIKE 'W5240%'";
    if (effective === 'WW_BLACK') return "RTRIM(LTRIM(ISNULL(unit, ''))) LIKE 'W5241%'";
    return '1=1';
}

export function getEffectiveUnitFilter(unitFilter: UnitFilter, category: string): UnitFilter {
    return isGlazeDwCategory(category) ? 'ALL' : unitFilter;
}

export function matchesUnitFilter(item: DataItem, unitFilter: UnitFilter, category: string): boolean {
    const effective = getEffectiveUnitFilter(unitFilter, category);
    if (effective === 'ALL') return true;
    if (effective === 'WW_WHITE') return (item.unit || '').startsWith('W5240');
    if (effective === 'WW_BLACK') return (item.unit || '').startsWith('W5241');
    return true;
}

export function matchesDefectUnit(unit: string, unitFilter: UnitFilter, category: string): boolean {
    const effective = getEffectiveUnitFilter(unitFilter, category);
    if (effective === 'ALL') return true;
    if (effective === 'WW_WHITE') return (unit || '').startsWith('W5240');
    if (effective === 'WW_BLACK') return (unit || '').startsWith('W5241');
    return true;
}

export function normalizeCp(cp: string): string {
    let value = cp || '';
    if (value === 'c') value = 'C';
    if (value === 'C(FRIT&BOM)' || value === 'Cs') value = 'C1';
    return value;
}

export function getDisplayCp(item: DataItem): string {
    return isSomboonCpC(item) ? 'C1' : normalizeCp(item.m_cp);
}

export function filterByCategory(data: DataItem[], category: string): DataItem[] {
    return data
        .map((item) => ({ ...item, m_cp: normalizeCp(item.m_cp) }))
        .filter((item) => {
            if (category === 'WW') return item._source !== 'sdb' && item.m_part.startsWith('142');
            if (category === 'DW') return item._source !== 'sdb' && item.m_part.startsWith('143');
            if (category === 'DW_ONGLAZE') return item._source === 'sdb';
            if (category === 'DW_ALL') {
                return item._source === 'sdb' || item.m_part.startsWith('143');
            }
            return true;
        });
}
