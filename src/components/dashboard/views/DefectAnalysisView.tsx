'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Package } from 'lucide-react';
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
import { SKIN_ACCENT, type Theme, type ThemeName } from '@/lib/themes';
import { isGlazeDwCategory } from '@/lib/sort-source';
import {
    BREAKDOWN_PANEL_TOP_N,
    BREAKDOWN_MIN_QTYPROC,
    buildSingleDefectTrend,
    buildKilnSharesFromWareRows,
    buildWareBreakdown,
    buildWareBreakdownKey,
    collectDefectCpOptionsFromRecords,
    type DefectChartRow,
    type DefectKilnShareRow,
    type DefectMonthlyBreakdownRow,
} from '@/lib/defect-analysis';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import type { DefectTrendPayload, DefectProductMonthRow, DefectWareKilnMonthRow } from '@/lib/defect-reason-query';
import type { DefectListMode } from '@/types/dashboard';
import type { UnitFilter } from '@/lib/unit-filter';
import { UNIT_LABELS } from '@/lib/unit-filter';

interface DefectAnalysisViewProps {
    theme: Theme;
    currentTheme: ThemeName;
    category: string;
    categoryLabel?: string;
    defectMode: DefectListMode;
    selectedDefect: string;
    selectedDefectLabel: string;
    trendPayload: DefectTrendPayload;
    /** True while chart data does not match the selected defect / filters */
    chartPending: boolean;
    breakdownUnitFilter: UnitFilter;
    setBreakdownUnitFilter: (unit: UnitFilter) => void;
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
                    <p className="font-semibold skin-accent-text">
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
                <p className={`pt-1 text-[10px] ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
                    คลิกจุดบนเส้น Defect % เพื่อดู Top ware
                </p>
            </div>
        </div>
    );
}

function DefectTrendDot({
    cx,
    cy,
    payload,
    onMonthSelect,
    radius = 5,
}: {
    cx?: number;
    cy?: number;
    payload?: DefectChartRow;
    onMonthSelect: (month: string) => void;
    radius?: number;
}) {
    if (cx == null || cy == null || !payload?.month) return null;

    return (
        <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill={SKIN_ACCENT}
            stroke="#ffffff"
            strokeWidth={1.5}
            style={{ cursor: 'pointer' }}
            onClick={(event) => {
                event.stopPropagation();
                onMonthSelect(payload.month);
            }}
        />
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
    mCp,
    theme,
}: {
    label: string;
    labelSub?: string;
    mCp?: string;
    theme: Theme;
    isDark: boolean;
}) {
    const subColor = theme.textWhite;
    const titleColor = labelSub ? theme.accentText : theme.textWhite;
    const cpBadge = mCp ? (
        <span
            className={`shrink-0 text-[9px] font-bold px-1 py-px rounded border ${theme.badgeBg} ${theme.badgeBorder} ${theme.textMuted}`}
            title={`C/P: ${mCp}`}
        >
            {mCp}
        </span>
    ) : null;

    if (!labelSub) {
        return (
            <div className="flex items-center gap-1 min-w-0" title={mCp ? `${label} (${mCp})` : label}>
                <p className={`text-[11px] font-medium truncate ${titleColor}`}>{label}</p>
                {cpBadge}
            </div>
        );
    }

    return (
        <div className="min-w-0" title={mCp ? `${label}\n${labelSub}\nC/P: ${mCp}` : `${label}\n${labelSub}`}>
            <div className="flex items-center gap-1 min-w-0">
                <p className={`text-[11px] font-medium truncate leading-tight ${titleColor}`}>{label}</p>
                {cpBadge}
            </div>
            <p className={`text-[10px] font-medium truncate leading-tight ${subColor}`}>{labelSub}</p>
        </div>
    );
}

function KilnCapsules({
    kilnShares,
    wareQty,
    theme,
    accentText,
}: {
    kilnShares: DefectKilnShareRow[];
    wareQty: number;
    theme: Theme;
    accentText: string;
}) {
    if (kilnShares.length === 0) return null;

    return (
        <div className="pl-3 pr-1 pb-1 pt-0.5">
            <div className={`text-[9px] font-bold ${theme.textMuted} mb-0.5`}>Kiln breakdown</div>
            <div className="flex flex-wrap gap-0.5">
                {kilnShares.map((row) => {
                    const kilnPct = wareQty > 0 ? (row.qty / wareQty) * 100 : 0;
                    return (
                        <span
                            key={row.kiln}
                            className={`inline-flex items-center gap-0.5 text-[9px] font-mono px-1 py-0.5 rounded ${theme.badgeBg} border ${theme.badgeBorder}`}
                        >
                            <span className={`font-bold ${theme.accentText}`}>{row.kiln}</span>
                            <span className={theme.textMuted}>{row.qty.toLocaleString()}</span>
                            <span className={`${accentText} opacity-80`}>({kilnPct.toFixed(0)}%)</span>
                        </span>
                    );
                })}
            </div>
        </div>
    );
}

function WareBreakdownList({
    rows,
    theme,
    isDark,
    defectMode,
    expandedWareKey,
    getKilnShares,
    kilnLoadingKeys,
    onWareClick,
}: {
    rows: DefectMonthlyBreakdownRow[];
    theme: Theme;
    isDark: boolean;
    defectMode: DefectListMode;
    expandedWareKey: string | null;
    getKilnShares: (row: DefectMonthlyBreakdownRow) => DefectKilnShareRow[] | null;
    kilnLoadingKeys: ReadonlySet<string>;
    onWareClick: (row: DefectMonthlyBreakdownRow) => void;
}) {
    const accentText = defectMode === 'scrap' ? 'text-red-500' : 'text-orange-500';

    return (
        <div className="space-y-1">
            {rows.map((row) => {
                const rowKey = buildWareBreakdownKey(row.month, row.label, row.labelSub, row.mCp);
                const isExpanded = expandedWareKey === rowKey;
                const kilnShares = isExpanded ? getKilnShares(row) : null;
                const kilnLoading = isExpanded && kilnShares === null && kilnLoadingKeys.has(rowKey);

                return (
                    <div
                        key={rowKey}
                        className={`rounded-lg border ${theme.borderColor} overflow-hidden transition-colors ${
                            isExpanded ? (isDark ? 'bg-white/[0.04]' : 'bg-black/[0.03]') : ''
                        }`}
                    >
                        <button
                            type="button"
                            onClick={() => onWareClick(row)}
                            className={`w-full grid grid-cols-[1.25rem_1fr_auto_1rem] items-start gap-2 px-2 py-1.5 text-left transition-colors hover:bg-white/5 active:bg-white/10 cursor-pointer touch-manipulation`}
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
                                    mCp={row.mCp}
                                    theme={theme}
                                    isDark={isDark}
                                />
                                <BreakdownBar pct={row.pct} isDark={isDark} mode={defectMode} />
                            </div>
                            <div className="flex flex-col items-end shrink-0 pt-0.5 text-[10px] font-mono font-bold">
                                <span className={accentText}>{row.qty.toLocaleString()}</span>
                                <span className={`${accentText} opacity-80 text-[9px]`}>
                                    ({row.pct.toFixed(1)}%)
                                </span>
                            </div>
                            <ChevronDown
                                size={14}
                                className={`mt-1 shrink-0 ${theme.textMuted} transition-transform duration-200 ${
                                    isExpanded ? 'rotate-180' : ''
                                }`}
                            />
                        </button>
                        {isExpanded && kilnLoading && (
                            <p className={`px-3 pb-2 text-[9px] ${theme.textMuted} animate-pulse`}>Loading kilns…</p>
                        )}
                        {isExpanded && !kilnLoading && kilnShares && kilnShares.length > 0 && (
                            <KilnCapsules
                                kilnShares={kilnShares}
                                wareQty={row.qty}
                                theme={theme}
                                accentText={accentText}
                            />
                        )}
                        {isExpanded && !kilnLoading && kilnShares?.length === 0 && (
                            <p className={`px-3 pb-2 text-[9px] ${theme.textMuted}`}>No kiln data for this filter.</p>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

const BREAKDOWN_UNIT_TABS: { id: UnitFilter; label: string }[] = [
    { id: 'WW_WHITE', label: 'White' },
    { id: 'WW_BLACK', label: 'Black' },
];

const BREAKDOWN_SIBLING_UNIT: Partial<Record<UnitFilter, UnitFilter>> = {
    WW_WHITE: 'WW_BLACK',
    WW_BLACK: 'WW_WHITE',
};

function BreakdownUnitTabs({
    theme,
    isDark,
    value,
    onChange,
}: {
    theme: Theme;
    isDark: boolean;
    value: UnitFilter;
    onChange: (unit: UnitFilter) => void;
}) {
    return (
        <div className={`flex p-0.5 rounded-lg border ${theme.borderColor} ${isDark ? 'bg-zinc-900/60' : 'bg-gray-100'}`}>
            {BREAKDOWN_UNIT_TABS.map((tab) => {
                const active = value === tab.id;
                return (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => onChange(tab.id)}
                        className={`flex-1 px-2 py-1.5 text-[10px] font-bold rounded-md transition-colors touch-manipulation ${
                            active
                                ? `${isDark ? 'bg-zinc-700 text-white' : 'bg-white text-gray-900 shadow-sm'}`
                                : `${theme.textMuted} hover:opacity-80`
                        }`}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}

function BreakdownPanel({
    theme,
    isDark,
    category,
    defectMode,
    defectLabel,
    breakdownUnitFilter,
    setBreakdownUnitFilter,
    selectedMonth,
    monthDefectQty,
    panelRows,
    loading,
    expandedWareKey,
    getKilnShares,
    kilnLoadingKeys,
    onWareClick,
}: {
    theme: Theme;
    isDark: boolean;
    category: string;
    defectMode: DefectListMode;
    defectLabel: string;
    breakdownUnitFilter: UnitFilter;
    setBreakdownUnitFilter: (unit: UnitFilter) => void;
    selectedMonth: string | null;
    monthDefectQty: number | null;
    panelRows: DefectMonthlyBreakdownRow[];
    loading: boolean;
    expandedWareKey: string | null;
    getKilnShares: (row: DefectMonthlyBreakdownRow) => DefectKilnShareRow[] | null;
    kilnLoadingKeys: ReadonlySet<string>;
    onWareClick: (row: DefectMonthlyBreakdownRow) => void;
}) {
    const showUnitTabs = false;

    return (
        <div className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl overflow-hidden shadow-lg h-full flex flex-col min-h-0`}>
            <div className="px-3 py-2 border-b border-inherit shrink-0 space-y-2">
                <div className="flex items-center gap-2">
                    <Package size={14} className={defectMode === 'scrap' ? 'text-red-500' : 'text-orange-500'} />
                    <div className="min-w-0">
                        <p className={`text-xs font-bold ${theme.textWhite}`}>Ware breakdown</p>
                        <p className={`text-[10px] ${theme.textMuted}`}>
                            Top {BREAKDOWN_PANEL_TOP_N} · qtyproc ≥ {BREAKDOWN_MIN_QTYPROC.toLocaleString()} · คลิก ware เพื่อดู kiln
                        </p>
                    </div>
                </div>
                {showUnitTabs && (
                    <BreakdownUnitTabs
                        theme={theme}
                        isDark={isDark}
                        value={breakdownUnitFilter}
                        onChange={setBreakdownUnitFilter}
                    />
                )}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3">
                {!selectedMonth ? (
                    <p className={`text-center text-xs py-8 ${theme.textMuted}`}>เลือก defect เพื่อดู breakdown</p>
                ) : (
                    <>
                        <div className="mb-2">
                            <p className={`text-sm font-black ${theme.textWhite}`}>{selectedMonth}</p>
                            <p className={`text-[10px] ${theme.textMuted}`}>
                                {monthDefectQty != null
                                    ? `${monthDefectQty.toLocaleString()} pcs · ${defectLabel}`
                                    : `— · ${defectLabel}`}
                                {showUnitTabs ? ` · ${UNIT_LABELS[breakdownUnitFilter]}` : ''}
                            </p>
                        </div>

                        {loading ? (
                            <p className={`text-center text-xs py-8 ${theme.textMuted} animate-pulse`}>
                                Loading breakdown…
                            </p>
                        ) : panelRows.length === 0 ? (
                            <p className={`text-center text-xs py-8 ${theme.textMuted}`}>
                                No ware data for this month and unit.
                            </p>
                        ) : (
                            <WareBreakdownList
                                rows={panelRows}
                                theme={theme}
                                isDark={isDark}
                                defectMode={defectMode}
                                expandedWareKey={expandedWareKey}
                                getKilnShares={getKilnShares}
                                kilnLoadingKeys={kilnLoadingKeys}
                                onWareClick={onWareClick}
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export function DefectAnalysisView({
    theme,
    currentTheme,
    category,
    categoryLabel: categoryLabelProp,
    defectMode,
    selectedDefect,
    selectedDefectLabel,
    trendPayload,
    chartPending,
    breakdownUnitFilter,
    setBreakdownUnitFilter,
    analysisStartDate,
    setAnalysisStartDate,
    analysisEndDate,
    setAnalysisEndDate,
}: DefectAnalysisViewProps) {
    const [mCpFilter, setMCpFilter] = useState('ALL');
    const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
    const [expandedWareKey, setExpandedWareKey] = useState<string | null>(null);
    const monthProductsCacheRef = useRef<Map<string, DefectProductMonthRow[]>>(new Map());
    const monthBreakdownAbortRef = useRef<AbortController | null>(null);
    const [monthCacheVersion, setMonthCacheVersion] = useState(0);
    const [monthBreakdownLoading, setMonthBreakdownLoading] = useState<string | null>(null);
    const kilnRowsCacheRef = useRef<Map<string, DefectWareKilnMonthRow[]>>(new Map());
    const kilnFetchAbortRef = useRef<Map<string, AbortController>>(new Map());
    const [kilnCacheVersion, setKilnCacheVersion] = useState(0);
    const [kilnLoadingKeys, setKilnLoadingKeys] = useState<Set<string>>(() => new Set());

    const breakdownDataScopeKey = `${analysisStartDate}|${analysisEndDate}|${category}|${defectMode}|${selectedDefect}`;

    const getMonthCacheKey = useCallback(
        (month: string, unit: UnitFilter = breakdownUnitFilter) =>
            `${breakdownDataScopeKey}|${unit}|${month}`,
        [breakdownDataScopeKey, breakdownUnitFilter],
    );

    useEffect(() => {
        monthProductsCacheRef.current.clear();
        setMonthCacheVersion((v) => v + 1);
        monthBreakdownAbortRef.current?.abort();
        setMonthBreakdownLoading(null);
        kilnRowsCacheRef.current.clear();
        setKilnCacheVersion((v) => v + 1);
        kilnFetchAbortRef.current.forEach((controller) => controller.abort());
        kilnFetchAbortRef.current.clear();
        setKilnLoadingKeys(new Set());
        setExpandedWareKey(null);
    }, [breakdownDataScopeKey]);

    const getKilnCacheKey = useCallback(
        (row: DefectMonthlyBreakdownRow) =>
            `${breakdownDataScopeKey}|${breakdownUnitFilter}|${buildWareBreakdownKey(row.month, row.label, row.labelSub, row.mCp)}`,
        [breakdownDataScopeKey, breakdownUnitFilter],
    );

    const prefetchMonthBreakdown = useCallback(
        async (month: string, unit: UnitFilter) => {
            if (!selectedDefect || isGlazeDwCategory(category)) return;
            const cacheKey = getMonthCacheKey(month, unit);
            if (monthProductsCacheRef.current.has(cacheKey)) return;

            try {
                const params = new URLSearchParams({
                    startDate: analysisStartDate,
                    endDate: analysisEndDate,
                    category,
                    rsn_desc: selectedDefect,
                    mode: defectMode,
                    unit,
                    part: 'breakdown',
                    month,
                });
                const res = await fetch(`/api/defect-trend?${params}`);
                if (!res.ok) return;
                const result = await res.json();
                const products = Array.isArray(result?.products) ? result.products as DefectProductMonthRow[] : [];
                monthProductsCacheRef.current.set(cacheKey, products);
                setMonthCacheVersion((v) => v + 1);
            } catch {
                // background prefetch — ignore errors
            }
        },
        [
            analysisStartDate,
            analysisEndDate,
            category,
            defectMode,
            selectedDefect,
            getMonthCacheKey,
        ],
    );

    const loadMonthBreakdown = useCallback(
        async (month: string) => {
            if (!selectedDefect) return;

            const cacheKey = getMonthCacheKey(month);
            if (monthProductsCacheRef.current.has(cacheKey)) return;

            monthBreakdownAbortRef.current?.abort();
            const controller = new AbortController();
            monthBreakdownAbortRef.current = controller;
            setMonthBreakdownLoading(month);

            try {
                const params = new URLSearchParams({
                    startDate: analysisStartDate,
                    endDate: analysisEndDate,
                    category,
                    rsn_desc: selectedDefect,
                    mode: defectMode,
                    unit: breakdownUnitFilter,
                    part: 'breakdown',
                    month,
                });
                const res = await fetch(`/api/defect-trend?${params}`, { signal: controller.signal });
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    const detail = typeof body?.error === 'string' ? body.error : `HTTP ${res.status}`;
                    throw new Error(`Failed to load month breakdown: ${detail}`);
                }
                const result = await res.json();
                const products = Array.isArray(result?.products) ? result.products as DefectProductMonthRow[] : [];
                monthProductsCacheRef.current.set(cacheKey, products);
                setMonthCacheVersion((v) => v + 1);

                const siblingUnit = BREAKDOWN_SIBLING_UNIT[breakdownUnitFilter];
                if (siblingUnit) void prefetchMonthBreakdown(month, siblingUnit);
            } catch (e) {
                if ((e as Error).name !== 'AbortError') {
                    console.error(e);
                    monthProductsCacheRef.current.set(cacheKey, []);
                    setMonthCacheVersion((v) => v + 1);
                }
            } finally {
                if (monthBreakdownAbortRef.current === controller) {
                    setMonthBreakdownLoading(null);
                }
            }
        },
        [
            analysisStartDate,
            analysisEndDate,
            category,
            defectMode,
            breakdownUnitFilter,
            selectedDefect,
            getMonthCacheKey,
            prefetchMonthBreakdown,
        ],
    );

    const loadWareKilns = useCallback(async (row: DefectMonthlyBreakdownRow) => {
        const cacheKey = getKilnCacheKey(row);
        if (kilnRowsCacheRef.current.has(cacheKey)) return;

        const rowKey = buildWareBreakdownKey(row.month, row.label, row.labelSub, row.mCp);
        kilnFetchAbortRef.current.get(rowKey)?.abort();

        const controller = new AbortController();
        kilnFetchAbortRef.current.set(rowKey, controller);
        setKilnLoadingKeys((prev) => new Set(prev).add(rowKey));

        try {
            const params = new URLSearchParams({
                startDate: analysisStartDate,
                endDate: analysisEndDate,
                category,
                rsn_desc: selectedDefect,
                mode: defectMode,
                unit: breakdownUnitFilter,
                part: 'kilns',
                month: row.month,
                pt_desc1: row.label,
                pt_desc2: row.labelSub ?? '',
            });
            const res = await fetch(`/api/defect-trend?${params}`, { signal: controller.signal });
            if (!res.ok) throw new Error('Failed to load kiln breakdown');
            const rows = (await res.json()) as DefectWareKilnMonthRow[];
            kilnRowsCacheRef.current.set(cacheKey, Array.isArray(rows) ? rows : []);
            setKilnCacheVersion((v) => v + 1);
        } catch (e) {
            if ((e as Error).name !== 'AbortError') {
                console.error(e);
                kilnRowsCacheRef.current.set(cacheKey, []);
                setKilnCacheVersion((v) => v + 1);
            }
        } finally {
            kilnFetchAbortRef.current.delete(rowKey);
            setKilnLoadingKeys((prev) => {
                const next = new Set(prev);
                next.delete(rowKey);
                return next;
            });
        }
    }, [
        analysisStartDate,
        analysisEndDate,
        category,
        defectMode,
        breakdownUnitFilter,
        selectedDefect,
        getKilnCacheKey,
    ]);

    const getKilnShares = useCallback(
        (row: DefectMonthlyBreakdownRow): DefectKilnShareRow[] | null => {
            void kilnCacheVersion;
            const cached = kilnRowsCacheRef.current.get(getKilnCacheKey(row));
            if (cached === undefined) return null;
            return buildKilnSharesFromWareRows(cached, row.mCp ?? mCpFilter);
        },
        [kilnCacheVersion, getKilnCacheKey, mCpFilter],
    );

    const cpOptions = useMemo(
        () => collectDefectCpOptionsFromRecords(trendPayload.trend),
        [trendPayload.trend],
    );

    const cpOptionsKey = cpOptions.join('|');

    useEffect(() => {
        if (mCpFilter === 'ALL') return;
        if (!cpOptions.includes(mCpFilter)) setMCpFilter('ALL');
    }, [mCpFilter, cpOptionsKey, cpOptions]);

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

    const latestMonth = useMemo(() => {
        if (trend.chartData.length === 0) return null;
        return [...trend.chartData].sort((a, b) => b.month.localeCompare(a.month))[0].month;
    }, [trend.chartData]);

    useEffect(() => {
        if (!latestMonth) {
            setSelectedMonth(null);
            return;
        }
        setSelectedMonth((prev) => {
            if (!prev || !trend.chartData.some((row) => row.month === prev)) return latestMonth;
            return prev;
        });
    }, [latestMonth, trend.chartData, selectedDefect]);

    useEffect(() => {
        if (!selectedMonth || chartPending) return;
        void loadMonthBreakdown(selectedMonth);
    }, [selectedMonth, breakdownUnitFilter, loadMonthBreakdown, chartPending]);

    useEffect(() => {
        if (chartPending || !selectedDefect || isGlazeDwCategory(category)) return;
        const months = trend.chartData.map((row) => row.month).sort((a, b) => b.localeCompare(a));
        if (months.length === 0) return;

        const toPrefetch = new Set<string>();
        const latest = months[0];
        toPrefetch.add(latest);
        if (months.length > 1) toPrefetch.add(months[1]);
        if (selectedMonth) toPrefetch.add(selectedMonth);

        toPrefetch.forEach((month) => {
            void prefetchMonthBreakdown(month, breakdownUnitFilter);
            const siblingUnit = BREAKDOWN_SIBLING_UNIT[breakdownUnitFilter];
            if (siblingUnit) void prefetchMonthBreakdown(month, siblingUnit);
        });
    }, [
        chartPending,
        selectedDefect,
        category,
        trend.chartData,
        selectedMonth,
        breakdownUnitFilter,
        prefetchMonthBreakdown,
    ]);

    const monthDefectQtyMap = useMemo(() => {
        const map = new Map<string, number>();
        trend.chartData.forEach((row) => {
            map.set(row.month, row.defectQty);
        });
        return map;
    }, [trend.chartData]);

    const handleChartMonthClick = (month: string) => {
        setExpandedWareKey(null);
        setSelectedMonth(month);
    };

    const handleWareClick = (row: DefectMonthlyBreakdownRow) => {
        const key = buildWareBreakdownKey(row.month, row.label, row.labelSub, row.mCp);
        const next = expandedWareKey === key ? null : key;
        setExpandedWareKey(next);
        if (next) void loadWareKilns(row);
    };

    const isDark = currentTheme === 'dark';
    const selectClass = isDark ? 'bg-[#1f1f1f] text-white' : 'bg-white text-gray-900';
    const defectLabel = defectMode === 'scrap' ? 'Scrap' : 'Reject';
    const categoryLabel = categoryLabelProp ?? (category === 'ALL' ? 'All' : category);

    const panelRows = useMemo(() => {
        if (!selectedMonth) return [];
        void monthCacheVersion;
        const products = monthProductsCacheRef.current.get(getMonthCacheKey(selectedMonth)) ?? [];
        return buildWareBreakdown(products, mCpFilter)
            .filter((row) => row.month === selectedMonth)
            .sort((a, b) => {
                if (b.pct !== a.pct) return b.pct - a.pct;
                return b.qty - a.qty;
            })
            .slice(0, BREAKDOWN_PANEL_TOP_N)
            .map((row, index) => ({ ...row, rank: index + 1 }));
    }, [selectedMonth, monthCacheVersion, getMonthCacheKey, mCpFilter]);

    const panelLoading =
        selectedMonth != null &&
        (chartPending ||
            monthBreakdownLoading === selectedMonth ||
            !monthProductsCacheRef.current.has(getMonthCacheKey(selectedMonth)));

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
                {!chartPending && trend.chartData.length === 0 ? (
                    <div className={`py-16 text-center ${theme.cardBg} border ${theme.borderColor} rounded-2xl ${theme.textMuted} text-sm`}>
                        No {defectLabel.toLowerCase()} records for this defect, date range, and C/P filter.
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 min-h-0">
                        <SectionHeader
                            title={`${defectLabel} trend`}
                            subtitle={
                                chartPending
                                    ? 'Loading chart…'
                                    : [
                                          mCpFilter === 'ALL' ? null : `C/P ${mCpFilter}`,
                                          breakdownUnitFilter !== 'ALL' ? UNIT_LABELS[breakdownUnitFilter] : null,
                                          'คลิกจุดบนเส้น Defect % เพื่อเลือกเดือน',
                                      ]
                                          .filter(Boolean)
                                          .join(' · ')
                            }
                            theme={theme}
                        />
                        <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-4 items-stretch min-h-0">
                            <div className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl p-3 sm:p-4 shadow-lg flex flex-col min-w-0 min-h-0 h-full`}>
                                {chartPending ? (
                                    <div className="flex flex-1 min-h-[340px] items-center justify-center">
                                        <p className={`${theme.textMuted} text-sm animate-pulse`}>Loading defect trend…</p>
                                    </div>
                                ) : (
                                    <>
                                <div className="flex items-center justify-between px-1 pb-2 shrink-0">
                                    <p className={`text-xs font-bold ${theme.textMuted}`}>Period total ({defectLabel})</p>
                                    <p className={`text-sm font-black ${defectMode === 'scrap' ? 'text-red-500' : 'text-orange-500'}`}>
                                        {trend.total.toLocaleString()} pcs
                                    </p>
                                </div>
                                <div className="w-full">
                                    <ResponsiveContainer width="100%" height={340}>
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
                                                tick={{ fill: SKIN_ACCENT, fontSize: 10 }}
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
                                                    style: { fill: SKIN_ACCENT, fontSize: 10, fontWeight: 600 },
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
                                                stroke={SKIN_ACCENT}
                                                strokeWidth={2}
                                                strokeDasharray="5 5"
                                                dot={(props: { cx?: number; cy?: number; payload?: DefectChartRow }) => (
                                                    <DefectTrendDot
                                                        cx={props.cx}
                                                        cy={props.cy}
                                                        payload={props.payload}
                                                        onMonthSelect={handleChartMonthClick}
                                                    />
                                                )}
                                                activeDot={(props: { cx?: number; cy?: number; payload?: DefectChartRow }) => (
                                                    <DefectTrendDot
                                                        cx={props.cx}
                                                        cy={props.cy}
                                                        payload={props.payload}
                                                        onMonthSelect={handleChartMonthClick}
                                                        radius={7}
                                                    />
                                                )}
                                                connectNulls
                                            />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                                    </>
                                )}
                            </div>

                            <div className="min-w-0 flex flex-col min-h-0 max-h-[min(72vh,720px)] lg:max-h-none h-full lg:h-0 lg:min-h-full overflow-hidden">
                                <BreakdownPanel
                                    theme={theme}
                                    isDark={isDark}
                                    category={category}
                                    defectMode={defectMode}
                                    defectLabel={defectLabel}
                                    breakdownUnitFilter={breakdownUnitFilter}
                                    setBreakdownUnitFilter={setBreakdownUnitFilter}
                                    selectedMonth={selectedMonth}
                                    monthDefectQty={
                                        selectedMonth && !chartPending
                                            ? monthDefectQtyMap.get(selectedMonth) ?? 0
                                            : null
                                    }
                                    panelRows={panelRows}
                                    loading={panelLoading}
                                    expandedWareKey={expandedWareKey}
                                    getKilnShares={getKilnShares}
                                    kilnLoadingKeys={kilnLoadingKeys}
                                    onWareClick={handleWareClick}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
