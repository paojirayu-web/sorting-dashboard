"use client";

import type { Theme, ThemeName } from '@/lib/themes';
import type { GroupedRow } from '@/types/dashboard';
import { formatProductDescription, formatDateDisplay } from '@/lib/utils';
import { SortingLogCard } from './SortingLogCard';
import { computeSortingLogTotals, getSortingLogMetrics } from './sorting-log-utils';

export type SortingLogVariant = 'standard' | 'daily-monitor';

export interface ResponsiveSortingLogProps {
    rows: GroupedRow[];
    theme: Theme;
    currentTheme: ThemeName;
    onRowClick?: (row: GroupedRow) => void;
    emptyMessage?: string;
    /** Activity log shows job|part; daily monitor shows doc only */
    showJobPart?: boolean;
    scrapColumnLabel?: string;
    rejectColumnLabel?: string;
    scrapCardLabel?: string;
    rejectCardLabel?: string;
    /** Desktop table layout preset */
    variant?: SortingLogVariant;
    /** Daily monitor fullscreen — larger typography on desktop */
    isFullscreen?: boolean;
    className?: string;
    scrollClassName?: string;
    /** Hide Top Scrap / Top Reject columns (metrics-only table) */
    showDefectColumns?: boolean;
    /** Footer row with sum of all visible rows */
    showTotalsRow?: boolean;
}

export function ResponsiveSortingLog({
    rows,
    theme,
    currentTheme,
    onRowClick,
    emptyMessage = 'No records found',
    showJobPart = true,
    scrapColumnLabel = 'Top Scrap',
    rejectColumnLabel = 'Top Reject',
    scrapCardLabel,
    rejectCardLabel,
    variant = 'standard',
    isFullscreen = false,
    className = '',
    scrollClassName = '',
    showDefectColumns = true,
    showTotalsRow = false,
}: ResponsiveSortingLogProps) {
    const scrapCard = scrapCardLabel ?? scrapColumnLabel;
    const rejectCard = rejectCardLabel ?? rejectColumnLabel;
    const isDaily = variant === 'daily-monitor';

    if (rows.length === 0) {
        return (
            <div className={`py-12 sm:py-20 text-center ${theme.textMuted} text-sm px-4 ${className}`}>
                {emptyMessage}
            </div>
        );
    }

    const desktopScroll = isDaily
        ? 'overflow-auto flex-1 min-h-0 p-1'
        : scrollClassName || 'overflow-auto max-h-[min(600px,70vh)] pb-2';

    const totals = showTotalsRow && rows.length > 0 ? computeSortingLogTotals(rows) : null;

    return (
        <div className={`flex flex-col flex-1 min-h-0 h-full ${className}`}>
            {totals && (
                <div className={`lg:hidden mb-2 mx-2 sm:mx-3 p-3 rounded-xl border ${theme.borderColor} ${theme.inputBg}`}>
                    <p className={`text-[10px] font-bold uppercase ${theme.textMuted} mb-2`}>Total (filtered)</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                        <div><span className={theme.textMuted}>Process</span><p className={`font-bold ${theme.textWhite}`}>{totals.qtyp.toLocaleString()}</p></div>
                        <div><span className="text-green-600">Good</span><p className="font-bold text-green-500">{totals.qtycomp.toLocaleString()} ({totals.compRate.toFixed(0)}%)</p></div>
                        <div><span className="text-red-600">Scrap</span><p className="font-bold text-red-500">{totals.totalScrap.toLocaleString()} ({totals.scrapRate.toFixed(0)}%)</p></div>
                        <div><span className="text-orange-600">Reject</span><p className="font-bold text-orange-400">{totals.totalReject.toLocaleString()} ({totals.rejectRate.toFixed(0)}%)</p></div>
                    </div>
                </div>
            )}
            {/* Phone & tablet: cards */}
            <div className={`lg:hidden flex-1 min-h-0 overflow-y-auto space-y-2 p-2 sm:p-3 ${scrollClassName}`}>
                {rows.map((item, idx) => (
                    <SortingLogCard
                        key={`${item.m_doc}-${item.m_job}-${idx}`}
                        item={item}
                        theme={theme}
                        currentTheme={currentTheme}
                        onClick={onRowClick ? () => onRowClick(item) : undefined}
                        showJobPart={showJobPart}
                        scrapLabel={scrapCard}
                        rejectLabel={rejectCard}
                        showDefectColumns={showDefectColumns}
                    />
                ))}
            </div>

            {/* Desktop (lg+): original table layout */}
            <div className="hidden lg:flex lg:flex-col flex-1 min-h-0 overflow-hidden">
                <div className={`table-scroll-x ${desktopScroll}`}>
                    {isDaily ? (
                        <DailyMonitorDesktopTable
                            rows={rows}
                            theme={theme}
                            currentTheme={currentTheme}
                            onRowClick={onRowClick}
                            isFullscreen={isFullscreen}
                            scrapColumnLabel={scrapColumnLabel}
                            rejectColumnLabel={rejectColumnLabel}
                            showDefectColumns={showDefectColumns}
                            showTotalsRow={showTotalsRow}
                        />
                    ) : (
                        <StandardDesktopTable
                            rows={rows}
                            theme={theme}
                            currentTheme={currentTheme}
                            onRowClick={onRowClick}
                            showJobPart={showJobPart}
                            scrapColumnLabel={scrapColumnLabel}
                            rejectColumnLabel={rejectColumnLabel}
                            showDefectColumns={showDefectColumns}
                            showTotalsRow={showTotalsRow}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

export type DailyMonitorTableDensity = 'compact' | 'comfortable' | 'line';

function dailyMonitorDensityClasses(density: DailyMonitorTableDensity) {
    if (density === 'line') {
        return {
            thSize: 'text-lg',
            descSize: 'text-xl',
            subSize: 'text-base',
            kilnBadge: 'text-sm',
            kilnCp: 'text-base',
            valSize: 'text-xl',
            pctSize: 'text-base',
            defectSize: 'text-base',
            defectTruncate: 'max-w-[240px]',
            descCol: 'w-[260px] min-w-[260px]',
            kilnCol: 'w-[150px] min-w-[150px]',
            kilnSticky: 'left-[260px]',
            cellPad: 'px-5 py-4',
            metricPad: 'px-3 py-4',
            minTable: 'min-w-[920px]',
        };
    }
    if (density === 'comfortable') {
        return {
            thSize: 'text-sm',
            descSize: 'text-base',
            subSize: 'text-sm',
            kilnBadge: 'text-xs',
            kilnCp: 'text-sm',
            valSize: 'text-base',
            pctSize: 'text-sm',
            defectSize: 'text-sm',
            defectTruncate: 'max-w-[120px]',
            descCol: 'w-[180px] min-w-[180px]',
            kilnCol: 'w-[110px] min-w-[110px]',
            kilnSticky: 'left-[180px]',
            cellPad: 'px-4 py-3',
            metricPad: 'px-2 py-3',
            minTable: 'min-w-[600px]',
        };
    }
    return {
        thSize: 'text-[10px]',
        descSize: 'text-[11px]',
        subSize: 'text-[9px]',
        kilnBadge: 'text-[9px]',
        kilnCp: 'text-[10px]',
        valSize: 'text-[11px]',
        pctSize: 'text-[9px]',
        defectSize: 'text-[9px]',
        defectTruncate: 'max-w-[60px]',
        descCol: 'w-[180px] min-w-[180px]',
        kilnCol: 'w-[110px] min-w-[110px]',
        kilnSticky: 'left-[180px]',
        cellPad: 'px-4 py-3',
        metricPad: 'px-2 py-3',
        minTable: 'min-w-[600px]',
    };
}

export function DailyMonitorDesktopTable({
    rows,
    theme,
    currentTheme,
    onRowClick,
    isFullscreen,
    density: densityProp,
    scrapColumnLabel,
    rejectColumnLabel,
    showDefectColumns = true,
    showTotalsRow = false,
}: {
    rows: GroupedRow[];
    theme: Theme;
    currentTheme: ThemeName;
    onRowClick?: (row: GroupedRow) => void;
    isFullscreen: boolean;
    /** โหมด line = ตัวอักษรใหญ่สำหรับจับภาพส่ง LINE */
    density?: DailyMonitorTableDensity;
    scrapColumnLabel: string;
    rejectColumnLabel: string;
    showDefectColumns?: boolean;
    showTotalsRow?: boolean;
}) {
    const density: DailyMonitorTableDensity =
        densityProp ?? (isFullscreen ? 'comfortable' : 'compact');
    const d = dailyMonitorDensityClasses(density);
    const bgSticky = currentTheme === 'dark' ? 'bg-[#141414]' : 'bg-white';
    const bgRow = currentTheme === 'dark' ? 'bg-[#141414] group-hover:bg-[#1a1a1a]' : 'bg-white group-hover:bg-gray-50';

    return (
        <table className={`w-full text-left border-collapse ${d.minTable}`}>
            <thead className="sticky top-0 z-30">
                <tr className={`${theme.cardBg} border-b ${theme.borderColor}`}>
                    <th className={`sticky left-0 z-40 ${bgSticky} ${d.descCol} ${d.cellPad} ${d.thSize} font-bold uppercase tracking-wider ${theme.textMuted} shadow-[1px_0_0_0_rgba(255,255,255,0.05)]`}>Description</th>
                    <th className={`sticky ${d.kilnSticky} z-40 ${bgSticky} ${d.kilnCol} ${d.cellPad} ${d.thSize} font-bold uppercase tracking-wider ${theme.textMuted} shadow-[1px_0_0_0_rgba(255,255,255,0.05)]`}>Kiln/CP/Date</th>
                    <th className={`${d.metricPad} ${d.thSize} font-bold uppercase tracking-wider ${theme.textMuted} text-right whitespace-nowrap`}>Process</th>
                    <th className={`${d.metricPad} ${d.thSize} font-bold uppercase tracking-wider ${theme.textMuted} text-right text-green-500 whitespace-nowrap`}>Good</th>
                    <th className={`${d.metricPad} ${d.thSize} font-bold uppercase tracking-wider ${theme.textMuted} text-right text-red-500 whitespace-nowrap`}>Scrap</th>
                    <th className={`${d.metricPad} ${d.thSize} font-bold uppercase tracking-wider ${theme.textMuted} text-right text-orange-400 whitespace-nowrap`}>Reject</th>
                    {showDefectColumns && (
                        <>
                            <th className={`${d.cellPad} ${d.thSize} font-bold uppercase tracking-wider ${theme.textMuted} min-w-[140px]`}>{scrapColumnLabel}</th>
                            <th className={`${d.cellPad} ${d.thSize} font-bold uppercase tracking-wider ${theme.textMuted} min-w-[140px]`}>{rejectColumnLabel}</th>
                        </>
                    )}
                </tr>
            </thead>
            <tbody className={theme.tableDivide}>
                {rows.map((item, idx) => {
                    const { compRate, scrapRate, rejectRate, cdTop2, pjTop2 } = getSortingLogMetrics(item);
                    const isDw = (item.pt_desc1 || '').startsWith('143') || (item.m_part || '').startsWith('143');
                    const descSize = d.descSize;
                    const subSize = d.subSize;
                    const kilnBadge = d.kilnBadge;
                    const kilnCp = d.kilnCp;
                    const valSize = d.valSize;
                    const pctSize = d.pctSize;
                    const defectSize = d.defectSize;
                    const defectTruncate = d.defectTruncate;

                    return (
                        <tr
                            key={idx}
                            onClick={onRowClick ? () => onRowClick(item) : undefined}
                            className={`${theme.tableRowHover} transition-colors group cursor-pointer`}
                        >
                            <td className={`sticky left-0 z-20 ${bgRow} transition-colors ${d.cellPad} border-r ${theme.borderColor}`}>
                                <div className={`${descSize} font-bold ${theme.textWhite} whitespace-normal`} title={item.pt_desc1}>
                                    {formatProductDescription(item.pt_desc1)}
                                </div>
                                {isDw && item.pt_desc2 && (
                                    <div className={`${density === 'line' ? 'text-base' : isFullscreen ? 'text-sm' : 'text-[9px]'} ${currentTheme === 'dark' ? 'text-orange-400' : 'text-orange-600'} whitespace-normal font-medium`} title={item.pt_desc2}>
                                        {item.pt_desc2}
                                    </div>
                                )}
                                <div className={`${subSize} ${theme.textMuted}`}>{item.m_doc}</div>
                            </td>
                            <td className={`sticky ${d.kilnSticky} z-20 ${bgRow} transition-colors ${d.cellPad} border-r ${theme.borderColor}`}>
                                <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-1">
                                        <span className={`px-1.5 py-0.5 rounded ${kilnBadge} font-bold ${theme.badgeBg} ${theme.accentText} border ${theme.badgeBorder}`}>{item.m_kiln}</span>
                                        <span className={`${kilnCp} ${theme.textSecondary}`}>{item.m_cp}</span>
                                    </div>
                                    <span className={`${subSize} ${theme.textMuted}`}>{formatDateDisplay(item.m_date)}</span>
                                </div>
                            </td>
                            <td className={`${d.metricPad} text-right`}>
                                <span className={`${valSize} font-bold ${theme.textSecondary}`}>{item.qtyp.toLocaleString()}</span>
                            </td>
                            <td className={`${d.metricPad} text-right`}>
                                <div className="flex flex-col items-end">
                                    <span className={`${valSize} font-bold text-green-500`}>{item.qtycomp.toLocaleString()}</span>
                                    <span className={`${pctSize} text-green-500/80`}>{compRate.toFixed(0)}%</span>
                                </div>
                            </td>
                            <td className={`${d.metricPad} text-right`}>
                                <div className="flex flex-col items-end">
                                    <span className={`${valSize} font-bold text-red-500`}>{item.totalScrap.toLocaleString()}</span>
                                    <span className={`${pctSize} text-red-500/80`}>{scrapRate.toFixed(0)}%</span>
                                </div>
                            </td>
                            <td className={`${d.metricPad} text-right`}>
                                <div className="flex flex-col items-end">
                                    <span className={`${valSize} font-bold text-orange-400`}>{item.totalReject.toLocaleString()}</span>
                                    <span className={`${pctSize} text-orange-400/80`}>{rejectRate.toFixed(0)}%</span>
                                </div>
                            </td>
                            {showDefectColumns && (
                                <>
                                    <td className={d.cellPad}>
                                        <div className="flex flex-col gap-1">
                                            {cdTop2.length > 0 ? cdTop2.map(([r, q], i) => (
                                                <div key={i} className={`flex items-center justify-between gap-2 ${defectSize}`}>
                                                    <span className={`${theme.textSecondary} truncate ${defectTruncate}`} title={r}>{r}</span>
                                                    <span className="font-bold text-red-400 whitespace-nowrap">
                                                        {q} <span className="text-red-500/80">({(item.qtyp > 0 ? (q / item.qtyp) * 100 : 0).toFixed(0)}%)</span>
                                                    </span>
                                                </div>
                                            )) : <span className={`${defectSize} ${theme.textMuted}`}>-</span>}
                                        </div>
                                    </td>
                                    <td className={d.cellPad}>
                                        <div className="flex flex-col gap-1">
                                            {pjTop2.length > 0 ? pjTop2.map(([r, q], i) => (
                                                <div key={i} className={`flex items-center justify-between gap-2 ${defectSize}`}>
                                                    <span className={`${theme.textSecondary} truncate ${defectTruncate}`} title={r}>{r}</span>
                                                    <span className="font-bold text-yellow-600 whitespace-nowrap">
                                                        {q} <span className="text-yellow-500/80">({(item.qtyp > 0 ? (q / item.qtyp) * 100 : 0).toFixed(0)}%)</span>
                                                    </span>
                                                </div>
                                            )) : <span className={`${defectSize} ${theme.textMuted}`}>-</span>}
                                        </div>
                                    </td>
                                </>
                            )}
                        </tr>
                    );
                })}
                {showTotalsRow && rows.length > 0 && (
                    <SortingLogTotalsRow
                        rows={rows}
                        theme={theme}
                        currentTheme={currentTheme}
                        showDefectColumns={showDefectColumns}
                        stickyDescClass={`sticky left-0 z-20 ${bgRow} ${d.cellPad} border-r ${theme.borderColor}`}
                        stickyKilnClass={`sticky ${d.kilnSticky} z-20 ${bgRow} ${d.cellPad} border-r ${theme.borderColor}`}
                        metricPad={d.metricPad}
                        cellPad={d.cellPad}
                    />
                )}
            </tbody>
        </table>
    );
}

function StandardDesktopTable({
    rows,
    theme,
    currentTheme,
    onRowClick,
    showJobPart,
    scrapColumnLabel,
    rejectColumnLabel,
    showDefectColumns = true,
    showTotalsRow = false,
}: {
    rows: GroupedRow[];
    theme: Theme;
    currentTheme: ThemeName;
    onRowClick?: (row: GroupedRow) => void;
    showJobPart: boolean;
    scrapColumnLabel: string;
    rejectColumnLabel: string;
    showDefectColumns?: boolean;
    showTotalsRow?: boolean;
}) {
    const bgSticky = currentTheme === 'dark' ? 'bg-[#141414]' : 'bg-white';
    const bgRow = currentTheme === 'dark' ? 'bg-[#141414] group-hover:bg-[#1a1a1a]' : 'bg-white group-hover:bg-gray-50';

    return (
        <table className={`w-full text-left border-collapse ${showDefectColumns ? 'min-w-[640px]' : 'min-w-[520px]'}`}>
            <thead className="sticky top-0 z-30">
                <tr className={`border-b ${theme.borderColor} ${bgSticky}`}>
                    <th className={`sticky left-0 z-40 ${bgSticky} w-[200px] min-w-[200px] px-6 py-5 text-xs font-bold uppercase tracking-wider ${theme.textMuted} shadow-[1px_0_0_0_rgba(255,255,255,0.05)]`}>Description</th>
                    <th className={`sticky left-[200px] z-40 ${bgSticky} w-[150px] min-w-[150px] px-6 py-5 text-xs font-bold uppercase tracking-wider ${theme.textMuted} shadow-[1px_0_0_0_rgba(255,255,255,0.05)]`}>Kiln / CP</th>
                    <th className={`px-4 py-5 text-xs font-bold uppercase tracking-wider ${theme.textMuted} text-right whitespace-nowrap`}>Process</th>
                    <th className={`px-4 py-5 text-xs font-bold uppercase tracking-wider ${theme.textMuted} text-right whitespace-nowrap`}>Completed</th>
                    <th className={`px-4 py-5 text-xs font-bold uppercase tracking-wider ${theme.textMuted} text-right whitespace-nowrap`}>Scrap</th>
                    <th className={`px-4 py-5 text-xs font-bold uppercase tracking-wider ${theme.textMuted} text-right whitespace-nowrap`}>Reject</th>
                    {showDefectColumns && (
                        <>
                            <th className={`px-6 py-5 text-xs font-bold uppercase tracking-wider ${theme.textMuted} min-w-[150px]`}>{scrapColumnLabel}</th>
                            <th className={`px-6 py-5 text-xs font-bold uppercase tracking-wider ${theme.textMuted} min-w-[150px]`}>{rejectColumnLabel}</th>
                        </>
                    )}
                </tr>
            </thead>
            <tbody className={theme.tableDivide}>
                {rows.map((item, idx) => {
                    const { compRate, scrapRate, rejectRate, cdTop2, pjTop2 } = getSortingLogMetrics(item);
                    const isDw = (item.pt_desc1 || '').startsWith('143') || (item.m_part || '').startsWith('143');

                    return (
                        <tr
                            key={idx}
                            onClick={onRowClick ? () => onRowClick(item) : undefined}
                            className={`${theme.tableRowHover} transition-colors group cursor-pointer`}
                        >
                            <td className={`sticky left-0 z-20 ${bgRow} transition-colors px-6 py-4 border-r ${theme.borderColor}`}>
                                <div className={`text-xs ${theme.textSecondary} whitespace-normal font-bold`} title={item.pt_desc1}>
                                    {formatProductDescription(item.pt_desc1)}
                                </div>
                                {isDw && item.pt_desc2 && (
                                    <div className={`text-[10px] ${currentTheme === 'dark' ? 'text-orange-400' : 'text-orange-600'} whitespace-normal font-medium`} title={item.pt_desc2}>
                                        {item.pt_desc2}
                                    </div>
                                )}
                                {showJobPart && (
                                    <div className={`text-[10px] ${theme.textMuted} mt-0.5`}>{item.m_job} | {item.m_part}</div>
                                )}
                            </td>
                            <td className={`sticky left-[200px] z-20 ${bgRow} transition-colors px-6 py-4 border-r ${theme.borderColor}`}>
                                <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${theme.badgeBg} ${theme.accentText} border ${theme.badgeBorder}`}>{item.m_kiln}</span>
                                        <span className={`text-xs ${theme.textSecondary}`}>{item.m_cp}</span>
                                    </div>
                                    <span className={`text-[10px] ${theme.textMuted}`}>{formatDateDisplay(item.m_date)}</span>
                                </div>
                            </td>
                            <td className="px-4 py-4 text-right font-medium text-sm">{item.qtyp.toLocaleString()}</td>
                            <td className="px-4 py-4 text-right">
                                <div className="flex flex-col items-end">
                                    <span className="font-bold text-sm text-green-500">{item.qtycomp.toLocaleString()}</span>
                                    <span className="text-[10px] font-bold text-green-500">{compRate.toFixed(1)}%</span>
                                </div>
                            </td>
                            <td className="px-4 py-4 text-right">
                                <div className="flex flex-col items-end">
                                    <span className="font-bold text-red-500 text-sm">{item.totalScrap.toLocaleString()}</span>
                                    <span className="text-[10px] font-bold text-red-500">{scrapRate.toFixed(1)}%</span>
                                </div>
                            </td>
                            <td className="px-4 py-4 text-right">
                                <div className="flex flex-col items-end">
                                    <span className="font-bold text-orange-400 text-sm">{item.totalReject.toLocaleString()}</span>
                                    <span className="text-[10px] font-bold text-orange-400">{rejectRate.toFixed(1)}%</span>
                                </div>
                            </td>
                            {showDefectColumns && (
                                <>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            {cdTop2.length > 0 ? cdTop2.map(([reason, qty], i) => (
                                                <div key={i} className="flex items-center justify-between gap-4 text-[10px]">
                                                    <span className={`${theme.textSecondary} truncate max-w-[100px]`}>{reason}</span>
                                                    <span className="font-bold text-red-400 whitespace-nowrap">
                                                        {qty.toLocaleString()} <span className="text-red-500/80">({(item.qtyp > 0 ? (qty / item.qtyp) * 100 : 0).toFixed(0)}%)</span>
                                                    </span>
                                                </div>
                                            )) : <span className={`text-[10px] ${theme.textMuted}`}>-</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            {pjTop2.length > 0 ? pjTop2.map(([reason, qty], i) => (
                                                <div key={i} className="flex items-center justify-between gap-4 text-[10px]">
                                                    <span className={`${theme.textSecondary} truncate max-w-[100px]`}>{reason}</span>
                                                    <span className="font-bold text-yellow-600 whitespace-nowrap">
                                                        {qty.toLocaleString()} <span className="text-yellow-500/80">({(item.qtyp > 0 ? (qty / item.qtyp) * 100 : 0).toFixed(0)}%)</span>
                                                    </span>
                                                </div>
                                            )) : <span className={`text-[10px] ${theme.textMuted}`}>-</span>}
                                        </div>
                                    </td>
                                </>
                            )}
                        </tr>
                    );
                })}
                {showTotalsRow && rows.length > 0 && (
                    <SortingLogTotalsRow
                        rows={rows}
                        theme={theme}
                        currentTheme={currentTheme}
                        showDefectColumns={showDefectColumns}
                        stickyDescClass={`sticky left-0 z-20 ${bgRow} px-6 py-4 border-r ${theme.borderColor} font-bold`}
                        stickyKilnClass={`sticky left-[200px] z-20 ${bgRow} px-6 py-4 border-r ${theme.borderColor}`}
                        metricPad="px-4 py-4"
                        cellPad="px-6 py-4"
                    />
                )}
            </tbody>
        </table>
    );
}

function SortingLogTotalsRow({
    rows,
    theme,
    currentTheme,
    showDefectColumns,
    stickyDescClass,
    stickyKilnClass,
    metricPad,
    cellPad,
}: {
    rows: GroupedRow[];
    theme: Theme;
    currentTheme: ThemeName;
    showDefectColumns: boolean;
    stickyDescClass: string;
    stickyKilnClass: string;
    metricPad: string;
    cellPad: string;
}) {
    const t = computeSortingLogTotals(rows);
    const totalBg = currentTheme === 'dark' ? 'bg-zinc-800/90' : 'bg-gray-100';

    return (
        <tr className={`border-t-2 ${theme.borderColor} ${totalBg} font-bold`}>
            <td className={stickyDescClass}>
                <span className={`text-sm ${theme.textWhite}`}>Total</span>
            </td>
            <td className={stickyKilnClass} />
            <td className={`${metricPad} text-right text-sm ${theme.textPrimary}`}>{t.qtyp.toLocaleString()}</td>
            <td className={`${metricPad} text-right`}>
                <div className="flex flex-col items-end">
                    <span className="text-sm text-green-500">{t.qtycomp.toLocaleString()}</span>
                    <span className="text-[10px] text-green-500">{t.compRate.toFixed(1)}%</span>
                </div>
            </td>
            <td className={`${metricPad} text-right`}>
                <div className="flex flex-col items-end">
                    <span className="text-sm text-red-500">{t.totalScrap.toLocaleString()}</span>
                    <span className="text-[10px] text-red-500">{t.scrapRate.toFixed(1)}%</span>
                </div>
            </td>
            <td className={`${metricPad} text-right`}>
                <div className="flex flex-col items-end">
                    <span className="text-sm text-orange-400">{t.totalReject.toLocaleString()}</span>
                    <span className="text-[10px] text-orange-400">{t.rejectRate.toFixed(1)}%</span>
                </div>
            </td>
            {showDefectColumns && (
                <>
                    <td className={cellPad} />
                    <td className={cellPad} />
                </>
            )}
        </tr>
    );
}
