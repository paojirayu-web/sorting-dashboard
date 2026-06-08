"use client";

import type { Theme, ThemeName } from '@/lib/themes';
import type { GroupedRow } from '@/types/dashboard';
import { DailyMonitorDesktopTable } from '@/components/dashboard/ResponsiveSortingLog';
import { formatDateDisplay } from '@/lib/utils';
import { UNIT_LABELS, type UnitFilter } from '@/lib/unit-filter';
import { LINE_EXPORT_ZOOM_DEFAULT } from '@/lib/line-export-config';

interface DailyDefectsPrintViewProps {
    rows: GroupedRow[];
    theme: Theme;
    currentTheme: ThemeName;
    date: string;
    unit: UnitFilter;
    /** เช่น "1/3" */
    partLabel?: string;
    rowRange?: { from: number; to: number; total: number };
}

export function DailyDefectsPrintView({
    rows,
    theme,
    currentTheme,
    date,
    unit,
    partLabel,
    rowRange,
}: DailyDefectsPrintViewProps) {
    const unitLabel = UNIT_LABELS[unit];
    const rangeText =
        rowRange && rowRange.total > 0
            ? `แถว ${rowRange.from}–${rowRange.to} จาก ${rowRange.total}`
            : `${rows.length} รายการ`;

    return (
        <div
            id="daily-defect-export-root"
            className={`${theme.pageBg} p-8`}
            style={{
                backgroundColor: '#0a0a0a',
                zoom: LINE_EXPORT_ZOOM_DEFAULT,
                width: 'max-content',
                minWidth: '100%',
            }}
        >
            <div className="mb-5">
                <h1 className={`text-3xl font-bold ${theme.textWhite}`}>Daily Defects Monitor</h1>
                <p className={`text-xl ${theme.textMuted}`}>
                    {unitLabel} · {formatDateDisplay(date)} · {rangeText}
                    {partLabel ? ` · ส่วน ${partLabel}` : ''}
                </p>
            </div>

            <div
                className={`${theme.cardBg} border ${theme.borderColor} rounded-3xl overflow-hidden shadow-xl`}
            >
                <div className="overflow-visible p-3">
                    <DailyMonitorDesktopTable
                        rows={rows}
                        theme={theme}
                        currentTheme={currentTheme}
                        isFullscreen={false}
                        density="line"
                        scrapColumnLabel="Top Defect(C)"
                        rejectColumnLabel="Top Defect(P)"
                    />
                </div>
            </div>
        </div>
    );
}
