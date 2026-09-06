"use client";

import { getKilnBadgeStyle, getRowSkinPalette } from '@/lib/sort-source';

type SkinItem = {
    m_kiln?: string | null;
    _source?: string | null;
    m_part?: string | null;
    unit?: string | null;
};

export function KilnBadge({
    item,
    isLight = false,
    className = 'inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold border',
}: {
    item: SkinItem;
    isLight?: boolean;
    className?: string;
}) {
    return (
        <span className={className} style={getKilnBadgeStyle(item, isLight)}>
            {item.m_kiln}
        </span>
    );
}

export function KilnName({
    item,
    isLight = false,
    className = 'font-bold',
}: {
    item: SkinItem;
    isLight?: boolean;
    className?: string;
}) {
    const { text } = getRowSkinPalette(item, isLight);
    return (
        <span className={className} style={{ color: text }}>
            {item.m_kiln}
        </span>
    );
}
