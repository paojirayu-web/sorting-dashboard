'use client';

import { useEffect, useMemo, useState } from 'react';
import { Package, Flame, X } from 'lucide-react';
import {
    Area,
    CartesianGrid,
    ComposedChart,
    Legend,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import type { Theme, ThemeName } from '@/lib/themes';
import type { DefectTrendPayload } from '@/lib/defect-reason-query';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import {
    buildSingleDefectTrend,
    getKilnSharesForWare,
    type DefectChartRow,
    type DefectKilnShareRow,
    type DefectMonthlyBreakdownRow,
    type SelectedWareBreakdown,
} from '@/lib/defect-analysis';
import type { DefectListMode } from '@/types/dashboard';

interface DefectAnalysisViewProps {
    theme: Theme;
    currentTheme: ThemeName;
    category: string;
    defectMode: DefectListMode;
    selectedDefect: string;
    selectedDefectLabel: string;
    trendPayload: DefectTrendPayload;
    loading: boolean;
    analysisStartDate: string;
    setAnalysisStartDate: (d: string) => void;
    analysisEndDate: string;
    setAnalysisEndDate: (d: string) => void;
}

const RANK_STYLES = [
    'bg-amber-500/20 text-amber-400 border-amber-500/40',
    'bg-slate-400/15 text-slate-300 border-slate-400/30',
    'bg-orange-700/20 text-orange-300 border-orange-600/35',
];

const TOTAL_TREND_COLOR = {
    scrap: '#ef4444',
    reject: '#eab308',
} as const;

/** Shared chart margins */
const TREND_CHART_Y_WIDTH = 40;
const TREND_CHART_MARGIN = {
    top: 8,
    right: TREND_CHART_Y_WIDTH + 6,
    left: TREND_CHART_Y_WIDTH + 6,
    bottom: 8,
};

function TrendTooltip({
    active,
    payload,
    label,
    isDark,
    defectMode,
    defectLabel,
}: {
    active?: boolean;
    payload?: { dataKey?: string; payload: DefectChartRow }[];
    label?: string;
    isDark: boolean;
    defectMode: DefectListMode;
    defectLabel: string;
}) {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload;
    const totalQty = defectMode === 'scrap' ? row.scrapQty : row.rejectQty;

    return (
        <div
            className="rounded-xl px-3 py-2.5 text-xs shadow-lg border min-w-[200px]"
            style={{
                backgroundColor: isDark ? '#141414' : '#fff',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            }}
        >
            <p className={`font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{label}</p>
            <div className="space-y-2">
                <div>
                    <p className="font-semibold" style={{ color: TOTAL_TREND_COLOR[defectMode] }}>
                        {row.totalPct != null ? `${row.totalPct}%` : '—'} · Total {defectLabel}
                    </p>
                    <p className={isDark ? 'text-zinc-400' : 'text-gray-500'}>
                        {totalQty.toLocaleString()} pcs
                    </p>
                </div>
                <div>
                    <p className="text-blue-500 font-semibold">
                        {row.defectPct != null ? `${row.defectPct}%` : '—'} · Defect / output
                    </p>
                    <p className={isDark ? 'text-zinc-400' : 'text-gray-500'}>
                        {row.defectQty.toLocaleString()} pcs
                    </p>
                </div>
                <div className={`pt-1.5 border-t ${isDark ? 'border-zinc-700' : 'border-gray-200'}`}>
                    <p className={`font-semibold ${isDark ? 'text-violet-300' : 'text-violet-600'}`}>
                        {row.sharePct != null ? `${row.sharePct}%` : '—'} · Share of total {defectLabel.toLowerCase()}
                    </p>
                    <p className={isDark ? 'text-zinc-400' : 'text-gray-500'}>
                        {row.defectQty.toLocaleString()} / {totalQty.toLocaleString()} pcs
                    </p>
                </div>
            </div>
        </div>
    );
}

function BreakdownBar({
    pct,
    isDark,
    mode,
}: {
    pct: number;
    isDark: boolean;
    mode: DefectListMode;
}) {
    const fill = mode === 'scrap'
        ? (isDark ? 'bg-red-500' : 'bg-red-600')
        : (isDark ? 'bg-orange-500' : 'bg-orange-500');
    const track = isDark ? 'bg-zinc-800' : 'bg-gray-100';

    return (
        <div className={`h-1.5 rounded-full overflow-hidden ${track}`}>
            <div className={`h-full rounded-full ${fill} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
    );
}

function BreakdownWareLabel({
    label,
    labelSub,
    theme,
    isDark,
}: {
    label: string;
    labelSub?: string;
    theme: Theme;
    isDark: boolean;
}) {
    const subColor = isDark ? 'text-orange-400' : 'text-orange-600';

    if (!labelSub) {
        return (
            <p className={`text-[11px] font-medium truncate ${theme.textWhite}`} title={label}>
                {label}
            </p>
        );
    }

    return (
        <div className="min-w-0" title={`${label}\n${labelSub}`}>
            <p className={`text-[11px] font-medium truncate leading-tight ${theme.textWhite}`}>
                {label}
            </p>
            <p className={`text-[10px] font-medium truncate leading-tight ${subColor}`}>
                {labelSub}
            </p>
        </div>
    );
}

function KilnShareBar({ pct, isDark }: { pct: number; isDark: boolean }) {
    const fill = isDark ? 'bg-amber-500' : 'bg-amber-600';
    const track = isDark ? 'bg-zinc-800' : 'bg-gray-100';

    return (
        <div className={`h-1.5 rounded-full overflow-hidden ${track}`}>
            <div className={`h-full rounded-full ${fill} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
    );
}

function WareKilnModal({
    theme,
    isDark,
    selected,
    kilnShares,
    defectMode,
    defectLabel,
    onClose,
}: {
    theme: Theme;
    isDark: boolean;
    selected: SelectedWareBreakdown;
    kilnShares: DefectKilnShareRow[];
    defectMode: DefectListMode;
    defectLabel: string;
    onClose: () => void;
}) {
    const accentText = defectMode === 'scrap' ? 'text-red-500' : 'text-orange-500';
    const totalQty = kilnShares.reduce((sum, row) => sum + row.qty, 0);

    return (
        <>
            <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div
                className={`fixed inset-0 sm:inset-x-4 sm:top-6 sm:bottom-6 z-[201] ${theme.cardBg} border-0 sm:border ${theme.borderColor} sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[min(520px,92vw)] md:max-h-[85vh]`}
            >
                <div className={`flex items-start justify-between px-4 sm:px-5 py-4 border-b ${theme.borderColor} shrink-0 gap-3`}>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <Flame size={16} className="text-amber-500 shrink-0" />
                            <p className={`text-[10px] font-bold uppercase tracking-wide ${theme.textMuted}`}>
                                Kiln share · {selected.month}
                            </p>
                        </div>
                        <BreakdownWareLabel
                            label={selected.label}
                            labelSub={selected.labelSub}
                            theme={theme}
                            isDark={isDark}
                        />
                        <p className={`text-[10px] ${theme.textMuted} mt-2`}>
                            {selected.wareQty.toLocaleString()} pcs ({selected.warePct.toFixed(1)}% of monthly {defectLabel.toLowerCase()})
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className={`p-2 shrink-0 rounded-xl ${theme.inputBg} border ${theme.borderColor} ${theme.textSecondary} hover:opacity-80 transition-all touch-manipulation`}
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-4 sm:p-5 min-h-0">
                    {kilnShares.length === 0 ? (
                        <p className={`text-center text-sm py-8 ${theme.textMuted}`}>No kiln data for this ware.</p>
                    ) : (
                        <div className="space-y-3">
                            {kilnShares.map((row, index) => (
                                <div
                                    key={`${row.kiln}-${index}`}
                                    className={`rounded-xl border ${theme.borderColor} px-3 py-2.5 ${isDark ? 'bg-zinc-900/40' : 'bg-gray-50/80'}`}
                                >
                                    <div className="flex items-center justify-between gap-2 mb-1.5">
                                        <span className={`text-sm font-bold truncate ${theme.textWhite}`} title={row.kiln}>
                                            {row.kiln}
                                        </span>
                                        <div className="flex items-center gap-2 shrink-0 text-[11px]">
                                            <span className={`font-bold ${theme.textSecondary}`}>
                                                {row.qty.toLocaleString()} pcs
                                            </span>
                                            <span className={`font-black ${accentText}`}>
                                                {row.pct.toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                    <KilnShareBar pct={row.pct} isDark={isDark} />
                                </div>
                            ))}
                            <p className={`text-[10px] ${theme.textMuted} text-center pt-1`}>
                                {kilnShares.length} kiln{kilnShares.length !== 1 ? 's' : ''} · {totalQty.toLocaleString()} pcs total
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

function MonthBreakdownCard({
    theme,
    isDark,
    month,
    monthRows,
    defectMode,
    onWareClick,
}: {
    theme: Theme;
    isDark: boolean;
    month: string;
    monthRows: DefectMonthlyBreakdownRow[];
    defectMode: DefectListMode;
    onWareClick: (row: DefectMonthlyBreakdownRow) => void;
}) {
    const monthTotal = monthRows.reduce((sum, row) => sum + row.qty, 0);
    const topPctSum = monthRows.reduce((sum, row) => sum + row.pct, 0);
    const accentText = defectMode === 'scrap' ? 'text-red-500' : 'text-orange-500';

    return (
        <div className={`rounded-xl border ${theme.borderColor} overflow-hidden ${isDark ? 'bg-zinc-900/40' : 'bg-gray-50/80'}`}>
            <div className="px-3 py-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-sm font-black ${theme.textWhite}`}>{month}</span>
                    <div className="flex items-center gap-2 shrink-0 text-[10px]">
                        <span className={`px-2 py-0.5 rounded-md font-bold ${theme.inputBg} ${theme.textMuted}`}>
                            Top {monthRows.length}
                        </span>
                        <span className={`font-bold ${theme.textSecondary}`}>
                            {monthTotal.toLocaleString()} pcs
                        </span>
                    </div>
                </div>

                <div className="space-y-2">
                    {monthRows.map((row) => (
                        <button
                            key={`${month}-${row.rank}-${row.label}-${row.labelSub ?? ''}`}
                            type="button"
                            onClick={() => onWareClick(row)}
                            className={`w-full grid grid-cols-[1.25rem_1fr_3rem] items-start gap-2 rounded-lg px-1 py-1 -mx-1 text-left transition-colors hover:bg-white/5 active:bg-white/10 cursor-pointer touch-manipulation`}
                        >
                            <span
                                className={`inline-flex items-center justify-center w-5 h-5 rounded-md text-[9px] font-black border mt-0.5 ${RANK_STYLES[row.rank - 1] ?? RANK_STYLES[2]}`}
                            >
                                {row.rank}
                            </span>
                            <div className="min-w-0">
                                <BreakdownWareLabel
                                    label={row.label}
                                    labelSub={row.labelSub}
                                    theme={theme}
                                    isDark={isDark}
                                />
                                <BreakdownBar pct={row.pct} isDark={isDark} mode={defectMode} />
                            </div>
                            <span className={`text-[11px] font-black text-right pt-0.5 ${accentText}`}>
                                {row.pct.toFixed(1)}%
                            </span>
                        </button>
                    ))}
                </div>

                {monthRows.length > 0 && (
                    <p className={`text-[10px] ${theme.textMuted} mt-2`}>
                        Top {monthRows.length} cover {topPctSum.toFixed(1)}% of monthly defect · tap ware for kiln split
                    </p>
                )}
            </div>
        </div>
    );
}

function MonthlyBreakdown({
    theme,
    isDark,
    rows,
    emptyMessage,
    defectMode,
    onWareClick,
    compact = false,
}: {
    theme: Theme;
    isDark: boolean;
    rows: DefectMonthlyBreakdownRow[];
    emptyMessage: string;
    defectMode: DefectListMode;
    onWareClick: (row: DefectMonthlyBreakdownRow) => void;
    compact?: boolean;
}) {
    const months = useMemo(
        () => [...new Set(rows.map((row) => row.month))].sort((a, b) => b.localeCompare(a)),
        [rows],
    );

    return (
        <div className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl overflow-hidden shadow-lg h-full flex flex-col min-h-0`}>
            <div className={`${compact ? 'px-3 py-2' : 'px-4 py-3'} border-b ${theme.borderColor} ${theme.inputBg} shrink-0`}>
                <div className="flex items-center gap-2">
                    <Package size={compact ? 14 : 16} className={defectMode === 'scrap' ? 'text-red-500' : 'text-orange-500'} />
                    <div>
                        <p className={`${compact ? 'text-xs' : 'text-sm'} font-bold ${theme.textWhite}`}>Monthly breakdown</p>
                        {!compact && (
                            <p className={`text-[10px] ${theme.textMuted} mt-0.5`}>
                                Top 3 ware share per month · tap for kiln split
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {rows.length === 0 ? (
                <div className={`px-3 py-8 text-center text-xs ${theme.textMuted}`}>{emptyMessage}</div>
            ) : (
                <div className={`${compact ? 'p-2' : 'p-3 sm:p-4'} space-y-2 flex-1 min-h-0 overflow-y-auto overscroll-contain`}>
                    {months.map((month) => {
                        const monthRows = rows
                            .filter((row) => row.month === month)
                            .sort((a, b) => a.rank - b.rank);

                        return (
                            <MonthBreakdownCard
                                key={month}
                                theme={theme}
                                isDark={isDark}
                                month={month}
                                monthRows={monthRows}
                                defectMode={defectMode}
                                onWareClick={onWareClick}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export function DefectAnalysisView({
    theme,
    currentTheme,
    category,
    defectMode,
    selectedDefect,
    selectedDefectLabel,
    trendPayload,
    loading,
    analysisStartDate,
    setAnalysisStartDate,
    analysisEndDate,
    setAnalysisEndDate,
}: DefectAnalysisViewProps) {
    const [mCpFilter, setMCpFilter] = useState('ALL');
    const [selectedWare, setSelectedWare] = useState<SelectedWareBreakdown | null>(null);

    const cpOptions = useMemo(
        () => buildSingleDefectTrend(trendPayload.trend, trendPayload.jobMetrics, trendPayload.products, 'ALL', defectMode).cpOptions,
        [trendPayload, defectMode],
    );

    const cpOptionsKey = cpOptions.join('|');

    useEffect(() => {
        if (mCpFilter === 'ALL') return;
        if (!cpOptions.includes(mCpFilter)) setMCpFilter('ALL');
    }, [mCpFilter, cpOptionsKey, cpOptions]);

    useEffect(() => {
        setSelectedWare(null);
    }, [selectedDefect, mCpFilter, defectMode, analysisStartDate, analysisEndDate]);

    const trend = useMemo(
        () =>
            selectedDefect
                ? buildSingleDefectTrend(
                      trendPayload.trend,
                      trendPayload.jobMetrics,
                      trendPayload.products,
                      mCpFilter,
                      defectMode,
                  )
                : { chartData: [], total: 0, cpOptions: [], wareBreakdown: [] },
        [trendPayload, selectedDefect, mCpFilter, defectMode],
    );

    const kilnShares = useMemo(() => {
        if (!selectedWare) return [];
        return getKilnSharesForWare(
            trendPayload.wareKilns,
            selectedWare.month,
            selectedWare.label,
            selectedWare.labelSub,
            mCpFilter,
        );
    }, [selectedWare, trendPayload.wareKilns, mCpFilter]);

    const handleWareClick = (row: DefectMonthlyBreakdownRow) => {
        setSelectedWare({
            month: row.month,
            label: row.label,
            labelSub: row.labelSub,
            wareQty: row.qty,
            warePct: row.pct,
        });
    };

    const isDark = currentTheme === 'dark';
    const selectClass = isDark ? 'bg-[#1f1f1f] text-white' : 'bg-white text-gray-900';
    const defectLabel = defectMode === 'scrap' ? 'Scrap' : 'Reject';
    const categoryLabel = category === 'ALL' ? 'ALL' : category;

    const breakdownRows = trend.wareBreakdown;
    const totalTrendColor = TOTAL_TREND_COLOR[defectMode];

    const defectAxisMax = useMemo(() => {
        const values = trend.chartData
            .map((row) => row.defectPct)
            .filter((v): v is number => v != null && v > 0);
        if (values.length === 0) return 1;
        const max = Math.max(...values);
        return Math.ceil(max * 1.15 * 10) / 10 || 1;
    }, [trend.chartData]);

    if (!selectedDefect) {
        return (
            <div className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl p-8 text-center`}>
                <p className={`${theme.textMuted} text-sm`}>
                    Select Scrap or Reject, then search and pick an <strong className={theme.textWhite}>Defects</strong> from the box above.
                </p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            <div className={`${theme.cardBg} border ${theme.borderColor} p-4 sm:p-6 rounded-2xl shadow-lg`}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
                    <div className="min-w-0 flex-1">
                        <p className={`text-xs font-bold uppercase ${theme.textMuted} mb-1`}>
                            {defectLabel} · {categoryLabel}
                        </p>
                        <h1 className={`text-xl sm:text-2xl font-black ${theme.textWhite} break-words`}>
                            {selectedDefectLabel}
                        </h1>
                    </div>
                    <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 shrink-0">
                        <div className={`flex items-center gap-2 px-3 py-2 ${theme.inputBg} rounded-xl border ${theme.borderColor}`}>
                            <span className={`text-xs font-bold ${theme.textMuted}`}>From</span>
                            <input
                                type="date"
                                value={analysisStartDate}
                                onChange={(e) => setAnalysisStartDate(e.target.value)}
                                style={{ colorScheme: currentTheme }}
                                className={`bg-transparent outline-none text-xs font-bold ${theme.textWhite} cursor-pointer`}
                            />
                        </div>
                        <div className={`flex items-center gap-2 px-3 py-2 ${theme.inputBg} rounded-xl border ${theme.borderColor}`}>
                            <span className={`text-xs font-bold ${theme.textMuted}`}>To</span>
                            <input
                                type="date"
                                value={analysisEndDate}
                                onChange={(e) => setAnalysisEndDate(e.target.value)}
                                style={{ colorScheme: currentTheme }}
                                className={`bg-transparent outline-none text-xs font-bold ${theme.textWhite} cursor-pointer`}
                            />
                        </div>
                        <div className={`flex items-center gap-2 px-3 py-2 ${theme.inputBg} rounded-xl border ${theme.borderColor}`}>
                            <span className={`text-xs font-bold ${theme.textMuted}`}>C/P</span>
                            <select
                                value={mCpFilter}
                                onChange={(e) => setMCpFilter(e.target.value)}
                                style={{ colorScheme: currentTheme }}
                                className={`outline-none text-xs font-bold cursor-pointer rounded-md px-1 py-0.5 min-w-[72px] ${selectClass}`}
                            >
                                <option value="ALL" className={selectClass}>ALL</option>
                                {cpOptions.map((cp) => (
                                    <option key={cp} value={cp} className={selectClass}>{cp}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <section>
                {loading ? (
                    <div className={`py-16 text-center ${theme.textMuted} text-sm animate-pulse`}>
                        Loading defect trend...
                    </div>
                ) : trend.chartData.length === 0 ? (
                    <div className={`py-16 text-center ${theme.cardBg} border ${theme.borderColor} rounded-2xl ${theme.textMuted} text-sm`}>
                        No {defectLabel.toLowerCase()} records for this defect, date range, and C/P filter.
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 min-h-0">
                        <SectionHeader
                            title={`${defectLabel} trend`}
                            subtitle={
                                mCpFilter === 'ALL'
                                    ? `Left = total ${defectLabel.toLowerCase()} % · right = defect % (zoomed) · share in tooltip · ${categoryLabel}`
                                    : `C/P ${mCpFilter} · dual axis · share in tooltip`
                            }
                            theme={theme}
                        />
                        <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-4 items-stretch min-h-0">
                            <div className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl p-3 sm:p-4 shadow-lg flex flex-col min-w-0 min-h-0 h-full`}>
                                <div className="flex items-center justify-between px-1 pb-2 shrink-0">
                                    <p className={`text-xs font-bold ${theme.textMuted}`}>Period total ({defectLabel})</p>
                                    <p className={`text-sm font-black ${defectMode === 'scrap' ? 'text-red-500' : 'text-orange-500'}`}>
                                        {trend.total.toLocaleString()} pcs
                                    </p>
                                </div>
                                <div className="flex-1 min-h-[300px] sm:min-h-[340px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart
                                            data={trend.chartData}
                                            margin={TREND_CHART_MARGIN}
                                        >
                                            <defs>
                                                <linearGradient id="defectTrendTotalGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={totalTrendColor} stopOpacity={0.15} />
                                                    <stop offset="95%" stopColor={totalTrendColor} stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
                                            />
                                            <XAxis
                                                dataKey="month"
                                                tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 10 }}
                                                axisLine={false}
                                                tickLine={false}
                                                height={48}
                                                interval={0}
                                                angle={-40}
                                                textAnchor="end"
                                                padding={{ left: 12, right: 12 }}
                                            />
                                            <YAxis
                                                yAxisId="total"
                                                width={TREND_CHART_Y_WIDTH}
                                                tick={{ fill: totalTrendColor, fontSize: 10 }}
                                                axisLine={false}
                                                tickLine={false}
                                                domain={[0, 'auto']}
                                                tickFormatter={(v) => `${v}%`}
                                                label={{
                                                    value: `Total ${defectLabel} %`,
                                                    angle: -90,
                                                    position: 'insideLeft',
                                                    offset: 10,
                                                    style: { fill: totalTrendColor, fontSize: 10, fontWeight: 600 },
                                                }}
                                            />
                                            <YAxis
                                                yAxisId="defect"
                                                orientation="right"
                                                width={TREND_CHART_Y_WIDTH}
                                                tick={{ fill: '#2563eb', fontSize: 10 }}
                                                axisLine={false}
                                                tickLine={false}
                                                domain={[0, defectAxisMax]}
                                                tickFormatter={(v) => `${v}%`}
                                                allowDecimals
                                                label={{
                                                    value: 'Defect %',
                                                    angle: 90,
                                                    position: 'insideRight',
                                                    offset: 6,
                                                    style: { fill: '#2563eb', fontSize: 10, fontWeight: 600 },
                                                }}
                                            />
                                            <Tooltip
                                                content={
                                                    <TrendTooltip
                                                        isDark={isDark}
                                                        defectMode={defectMode}
                                                        defectLabel={defectLabel}
                                                    />
                                                }
                                            />
                                            <Legend
                                                iconType="line"
                                                verticalAlign="top"
                                                height={28}
                                                wrapperStyle={{ fontSize: '10px', paddingBottom: '4px' }}
                                            />
                                            <Area
                                                yAxisId="total"
                                                type="monotone"
                                                dataKey="totalPct"
                                                name={`%Total ${defectLabel}`}
                                                stroke={totalTrendColor}
                                                strokeWidth={2}
                                                fill="url(#defectTrendTotalGrad)"
                                                connectNulls
                                            />
                                            <Line
                                                yAxisId="defect"
                                                type="monotone"
                                                dataKey="defectPct"
                                                name="Defect %"
                                                stroke="#2563eb"
                                                strokeWidth={2}
                                                strokeDasharray="5 5"
                                                dot={{ r: 3, fill: '#2563eb', strokeWidth: 0 }}
                                                activeDot={{ r: 5 }}
                                                connectNulls
                                            />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="min-w-0 flex flex-col min-h-0 max-h-[420px] sm:max-h-[460px] lg:max-h-none h-full lg:h-0 lg:min-h-full overflow-hidden">
                                <MonthlyBreakdown
                                theme={theme}
                                isDark={isDark}
                                rows={breakdownRows}
                                defectMode={defectMode}
                                onWareClick={handleWareClick}
                                compact
                                emptyMessage="No ware breakdown for this filter."
                            />
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {selectedWare && (
                <WareKilnModal
                    theme={theme}
                    isDark={isDark}
                    selected={selectedWare}
                    kilnShares={kilnShares}
                    defectMode={defectMode}
                    defectLabel={defectLabel}
                    onClose={() => setSelectedWare(null)}
                />
            )}
        </div>
    );
}
