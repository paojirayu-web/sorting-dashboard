'use client';

import type { Theme, ThemeName } from '@/lib/themes';
import type { GroupedRow } from '@/types/dashboard';
import { formatProductDescription, formatDateDisplay } from '@/lib/utils';
import { computeSortingLogTotals } from './sorting-log-utils';
import { KilnBadge, KilnName } from './KilnBadge';
import { dwDesc1Color, isDwCodeware } from '@/lib/sort-source';

interface QtyGradeSortingLogProps {
    rows: GroupedRow[];
    theme: Theme;
    currentTheme: ThemeName;
    loading?: boolean;
    emptyMessage?: string;
    onRowClick?: (row: GroupedRow) => void;
    isFullscreen?: boolean;
}

export function QtyGradeSortingLog({
    rows,
    theme,
    currentTheme,
    loading = false,
    emptyMessage = 'No sorting activity for this product and filters.',
    onRowClick,
    isFullscreen = false,
}: QtyGradeSortingLogProps) {
    const isDark = currentTheme === 'dark';
    const bgSticky = isDark ? 'bg-[#141414]' : 'bg-white';
    const bgRow = isDark ? 'bg-[#141414] group-hover:bg-[#1a1a1a]' : 'bg-white group-hover:bg-gray-50';
    const totalBg = isDark ? 'bg-zinc-800' : 'bg-gray-100';
    const gridBorder = isDark ? 'border-zinc-600' : 'border-gray-300';
    const headerSub = isDark ? 'text-gray-200' : 'text-gray-900';
    const gradeGoodHeader = isDark
        ? 'bg-green-600/25 text-green-300'
        : 'bg-green-100 text-green-900';
    const gradeScrapHeader = isDark
        ? 'bg-red-500/20 text-red-300'
        : 'bg-red-100 text-red-900';
    const gradeRejectHeader = isDark
        ? 'bg-amber-500/25 text-amber-200'
        : 'bg-amber-100 text-amber-900';
    const cellBorder = `border ${gridBorder}`;
    const stickyCell = (left: string, z: string, bg: string, extra = '') =>
        `sticky ${left} ${z} ${bg} ${cellBorder} shadow-[1px_0_0_0_rgba(128,128,128,0.15)] ${extra}`;
    const metricCell = `${cellBorder} px-2 py-1.5 text-right text-sm whitespace-nowrap`;
    const totals = rows.length > 0 ? computeSortingLogTotals(rows) : null;

    if (loading) {
        return (
            <div className={`py-16 text-center ${theme.textMuted} text-sm animate-pulse`}>
                Loading sorting log...
            </div>
        );
    }

    if (rows.length === 0) {
        return (
            <div className={`py-12 text-center ${theme.textMuted} text-sm px-4`}>
                {emptyMessage}
            </div>
        );
    }

    const mobileScrollClass = isFullscreen
        ? 'flex-1 min-h-0 overflow-y-auto'
        : 'overflow-y-auto max-h-[min(600px,70vh)]';
    const desktopScrollClass = isFullscreen
        ? 'flex-1 min-h-0 overflow-auto'
        : 'overflow-auto max-h-[min(600px,70vh)]';

    return (
        <div className={`flex flex-col ${isFullscreen ? 'flex-1 min-h-0 h-full' : ''}`}>
            {totals && (
                <div className={`lg:hidden mx-2 sm:mx-3 mt-2 mb-2 p-3 rounded-xl border ${theme.borderColor} ${totalBg}`}>
                    <p className={`text-[10px] font-bold uppercase ${theme.textMuted} mb-2`}>Total</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                        <div>
                            <span className={theme.textMuted}>Process</span>
                            <p className={`font-bold ${theme.textWhite}`}>{totals.qtyp.toLocaleString()}</p>
                        </div>
                        <div>
                            <span className="text-green-600">Good</span>
                            <p className="font-bold text-green-500">
                                {totals.qtycomp.toLocaleString()} ({totals.compRate.toFixed(0)}%)
                            </p>
                        </div>
                        <div>
                            <span className="text-red-600">Scrap</span>
                            <p className="font-bold text-red-500">
                                {totals.totalScrap.toLocaleString()} ({totals.scrapRate.toFixed(0)}%)
                            </p>
                        </div>
                        <div>
                            <span className="text-orange-600">Reject</span>
                            <p className="font-bold text-orange-400">
                                {totals.totalReject.toLocaleString()} ({totals.rejectRate.toFixed(0)}%)
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className={`lg:hidden ${mobileScrollClass} space-y-1 p-2 sm:p-3`}>
                {rows.map((item, idx) => {
                    const compRate = item.qtyp > 0 ? (item.qtycomp / item.qtyp) * 100 : 0;
                    const scrapRate = item.qtyp > 0 ? (item.totalScrap / item.qtyp) * 100 : 0;
                    const rejectRate = item.qtyp > 0 ? (item.totalReject / item.qtyp) * 100 : 0;
                    const desc1Color = dwDesc1Color(item, !isDark);
                    const isDw = isDwCodeware(item);
                    return (
                        <div
                            key={`${item.m_doc}-${item.m_job}-${idx}`}
                            onClick={onRowClick ? () => onRowClick(item) : undefined}
                            className={`p-2 rounded-lg border ${theme.borderColor} ${theme.cardBg} ${onRowClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
                        >
                            <p
                                className={`text-sm font-bold ${desc1Color ? '' : theme.textWhite}`}
                                style={desc1Color ? { color: desc1Color } : undefined}
                            >
                                {formatProductDescription(item.pt_desc1)}
                            </p>
                            {isDw && item.pt_desc2 && (
                                <p className={`text-[10px] font-medium ${theme.textWhite}`}>{item.pt_desc2}</p>
                            )}
                            <p className={`text-[10px] ${theme.textMuted} mt-0.5`}>
                                {formatDateDisplay(item.m_date)} · {item.m_cp} ·{' '}
                                <KilnName item={item} isLight={!isDark} className="font-bold" />
                            </p>
                            <div className="grid grid-cols-4 gap-1 mt-1 text-center text-[10px]">
                                <div>
                                    <span className={theme.textMuted}>Proc</span>
                                    <p className={`font-bold ${theme.textWhite}`}>{item.qtyp.toLocaleString()}</p>
                                </div>
                                <div>
                                    <span className="text-green-600">Good</span>
                                    <p className="font-bold text-green-500">
                                        {item.qtycomp.toLocaleString()} ({compRate.toFixed(0)}%)
                                    </p>
                                </div>
                                <div>
                                    <span className="text-red-600">Scrap</span>
                                    <p className="font-bold text-red-500">
                                        {item.totalScrap.toLocaleString()} ({scrapRate.toFixed(0)}%)
                                    </p>
                                </div>
                                <div>
                                    <span className="text-orange-600">Rej</span>
                                    <p className="font-bold text-orange-400">
                                        {item.totalReject.toLocaleString()} ({rejectRate.toFixed(0)}%)
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div
                className={`hidden lg:block table-scroll-x min-w-0 rounded-xl border ${gridBorder} ${desktopScrollClass}`}
            >
                <table className="w-full text-left border-collapse min-w-[920px]">
                    <thead className={`sticky top-0 z-30 ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
                        <tr>
                            <th
                                rowSpan={2}
                                className={stickyCell('left-0', 'z-40', bgSticky, 'w-[200px] min-w-[200px] px-4 py-2 text-xs font-bold uppercase tracking-wider text-left ' + headerSub)}
                            >
                                Description
                            </th>
                            <th
                                rowSpan={2}
                                className={stickyCell('left-[200px]', 'z-40', bgSticky, 'w-[100px] min-w-[100px] px-3 py-2 text-xs font-bold uppercase tracking-wider text-left ' + headerSub)}
                            >
                                Date
                            </th>
                            <th
                                rowSpan={2}
                                className={stickyCell('left-[300px]', 'z-40', bgSticky, 'w-[70px] min-w-[70px] px-3 py-2 text-xs font-bold uppercase tracking-wider text-left ' + headerSub)}
                            >
                                CP
                            </th>
                            <th
                                rowSpan={2}
                                className={stickyCell('left-[370px]', 'z-40', bgSticky, 'w-[80px] min-w-[80px] px-3 py-2 text-xs font-bold uppercase tracking-wider text-left ' + headerSub)}
                            >
                                เตา
                            </th>
                            <th
                                rowSpan={2}
                                className={`${cellBorder} px-3 py-2 text-xs font-bold uppercase tracking-wider text-right ${headerSub}`}
                            >
                                Process
                            </th>
                            <th
                                colSpan={2}
                                className={`${cellBorder} px-2 py-1.5 text-center text-xs font-bold ${gradeGoodHeader}`}
                            >
                                Good
                            </th>
                            <th
                                colSpan={2}
                                className={`${cellBorder} px-2 py-1.5 text-center text-xs font-bold ${gradeScrapHeader}`}
                            >
                                Scrap
                            </th>
                            <th
                                colSpan={2}
                                className={`${cellBorder} px-2 py-1.5 text-center text-xs font-bold ${gradeRejectHeader}`}
                            >
                                Reject
                            </th>
                        </tr>
                        <tr className={isDark ? 'bg-zinc-800/80' : 'bg-gray-50'}>
                            {['Qty', '%', 'Qty', '%', 'Qty', '%'].map((h, i) => (
                                <th
                                    key={`${h}-${i}`}
                                    className={`${cellBorder} px-2 py-1 text-center text-[10px] font-bold uppercase ${headerSub}`}
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                        {totals && (
                            <tr className={totalBg}>
                                <th
                                    colSpan={4}
                                    className={stickyCell('left-0', 'z-40', totalBg, 'px-4 py-1.5 text-left text-sm font-black ' + theme.textWhite)}
                                >
                                    Total
                                </th>
                                <th className={`${metricCell} font-bold ${theme.textPrimary} ${totalBg}`}>
                                    {totals.qtyp.toLocaleString()}
                                </th>
                                <th className={`${metricCell} font-bold text-green-500 bg-green-500/5 ${totalBg}`}>
                                    {totals.qtycomp.toLocaleString()}
                                </th>
                                <th className={`${metricCell} font-bold text-green-500/80 bg-green-500/5 ${totalBg}`}>
                                    {totals.compRate.toFixed(1)}%
                                </th>
                                <th className={`${metricCell} font-bold text-red-500 bg-red-500/5 ${totalBg}`}>
                                    {totals.totalScrap.toLocaleString()}
                                </th>
                                <th className={`${metricCell} font-bold text-red-500/80 bg-red-500/5 ${totalBg}`}>
                                    {totals.scrapRate.toFixed(1)}%
                                </th>
                                <th className={`${metricCell} font-bold text-orange-400 bg-amber-500/5 ${totalBg}`}>
                                    {totals.totalReject.toLocaleString()}
                                </th>
                                <th className={`${metricCell} font-bold text-orange-400/80 bg-amber-500/5 ${totalBg}`}>
                                    {totals.rejectRate.toFixed(1)}%
                                </th>
                            </tr>
                        )}
                    </thead>
                    <tbody>
                        {rows.map((item, idx) => {
                            const compRate = item.qtyp > 0 ? (item.qtycomp / item.qtyp) * 100 : 0;
                            const scrapRate = item.qtyp > 0 ? (item.totalScrap / item.qtyp) * 100 : 0;
                            const rejectRate = item.qtyp > 0 ? (item.totalReject / item.qtyp) * 100 : 0;
                            const isDw = isDwCodeware(item);
                            const desc1Color = dwDesc1Color(item, !isDark);

                            return (
                                <tr
                                    key={idx}
                                    onClick={onRowClick ? () => onRowClick(item) : undefined}
                                    className={`${theme.tableRowHover} transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                                >
                                    <td
                                        className={stickyCell('left-0', 'z-20', bgRow, 'px-4 py-1.5')}
                                    >
                                        <div
                                            className={`text-xs font-bold leading-tight ${desc1Color ? '' : theme.textWhite}`}
                                            style={desc1Color ? { color: desc1Color } : undefined}
                                            title={item.pt_desc1}
                                        >
                                            {formatProductDescription(item.pt_desc1)}
                                        </div>
                                        {isDw && item.pt_desc2 && (
                                            <div className={`text-[10px] leading-tight ${theme.textWhite}`}>
                                                {item.pt_desc2}
                                            </div>
                                        )}
                                    </td>
                                    <td
                                        className={stickyCell('left-[200px]', 'z-20', bgRow, 'px-3 py-1.5')}
                                    >
                                        <span className={`text-xs ${theme.textSecondary} whitespace-nowrap`}>
                                            {formatDateDisplay(item.m_date)}
                                        </span>
                                    </td>
                                    <td
                                        className={stickyCell('left-[300px]', 'z-20', bgRow, 'px-3 py-1.5')}
                                    >
                                        <span className={`text-xs font-medium ${theme.textSecondary}`}>
                                            {item.m_cp}
                                        </span>
                                    </td>
                                    <td
                                        className={stickyCell('left-[370px]', 'z-20', bgRow, 'px-3 py-1.5')}
                                    >
                                        <KilnBadge
                                            item={item}
                                            isLight={!isDark}
                                            className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border"
                                        />
                                    </td>
                                    <td className={`${metricCell} font-medium ${theme.textPrimary}`}>
                                        {item.qtyp.toLocaleString()}
                                    </td>
                                    <td className={`${metricCell} font-bold text-green-500 bg-green-500/5`}>
                                        {item.qtycomp.toLocaleString()}
                                    </td>
                                    <td className={`${metricCell} font-bold text-green-500/80 bg-green-500/5`}>
                                        {compRate.toFixed(1)}%
                                    </td>
                                    <td className={`${metricCell} font-bold text-red-500 bg-red-500/5`}>
                                        {item.totalScrap.toLocaleString()}
                                    </td>
                                    <td className={`${metricCell} font-bold text-red-500/80 bg-red-500/5`}>
                                        {scrapRate.toFixed(1)}%
                                    </td>
                                    <td className={`${metricCell} font-bold text-orange-400 bg-amber-500/5`}>
                                        {item.totalReject.toLocaleString()}
                                    </td>
                                    <td className={`${metricCell} font-bold text-orange-400/80 bg-amber-500/5`}>
                                        {rejectRate.toFixed(1)}%
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
