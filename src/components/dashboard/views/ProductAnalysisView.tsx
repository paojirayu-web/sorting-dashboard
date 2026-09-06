"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, LayoutGrid, Maximize2, Minimize2, Table2, XCircle, X } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { SKIN_ACCENT, type Theme, type ThemeName } from '@/lib/themes';
import type { CPData, DataItem, GroupedRow, ProductStats, SelectedReason, ReasonLogEntry, ReasonMonthlyEntry } from '@/types/dashboard';
import { CompactCard } from '@/components/dashboard/CompactCard';
import { FiringCycleQtyTable } from '@/components/dashboard/FiringCycleQtyTable';
import { YieldPlanningCards } from '@/components/dashboard/YieldPlanningCards';
import { ResponsiveReasonLog } from '@/components/dashboard/ResponsiveReasonLog';
import { MultiCheckFilter } from '@/components/dashboard/MultiCheckFilter';
import { CpDefectModal } from '@/components/dashboard/CpDefectModal';
import { DailyDetailModal } from '@/components/dashboard/DailyDetailModal';
import { ExportProductSortingLogButton } from '@/components/dashboard/ExportProductSortingLogButton';
import { QtyGradeSortingLog } from '@/components/dashboard/QtyGradeSortingLog';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { CodewareStickyTitle } from '@/components/dashboard/CodewareStickyTitle';
import { applyCpCardGrouping, collectPfiringCps } from '@/lib/cp-card-grouping';
import { PCardModeToggle, type PCardMode } from '@/components/dashboard/PCardModeToggle';
import {
    buildFiringCycleQtyRows,
    isSpecialFiringProduct,
    sortCpBreakdownForDisplay,
} from '@/lib/firing-cycle-labels';
import {
    applyReasonRowsToGroupedRow,
    buildProductSortingLogRows,
    collectCpValues,
    collectKilnValues,
    getDefaultLogKilnFilters,
    jobReasonQueryCp,
    matchesSelectedProduct,
    parseAnalysisProduct,
} from '@/lib/product-sorting-log';
import { buildCpBreakdownFromRaw } from '@/lib/build-cp-from-raw';
import { buildYieldPlanningResult } from '@/lib/product-yield-planning';
import { formatDateDisplay, normalizeMDate } from '@/lib/utils';
import { TimelineDateFilter } from '@/components/dashboard/TimelineDateFilter';
import type { UnitFilter } from '@/lib/unit-filter';

type AnalysisLayoutMode = 'cards' | 'qty-table';

interface ProductAnalysisViewProps {
    theme: Theme;
    currentTheme: ThemeName;
    selectedProduct: string;
    selectedProductLabel: string;
    productStats: ProductStats | null;
    statsLoading?: boolean;
    paRawData: DataItem[];
    paRawLoading: boolean;
    showReject: boolean;
    setShowReject: (v: boolean) => void;
    selectedReason: SelectedReason | null;
    setSelectedReason: (r: SelectedReason | null) => void;
    reasonLogData: ReasonLogEntry[];
    reasonLogLoading: boolean;
    reasonLogError?: string | null;
    reasonMonthly: ReasonMonthlyEntry[];
    reasonChartMonth: string | null;
    setReasonChartMonth: (m: string | null) => void;
    analysisStartDate: string;
    setAnalysisStartDate: (d: string) => void;
    analysisEndDate: string;
    setAnalysisEndDate: (d: string) => void;
    onNeedPaRawData?: () => void;
    unitFilter: UnitFilter;
}

export function ProductAnalysisView({
    theme,
    currentTheme,
    selectedProduct,
    selectedProductLabel,
    productStats,
    statsLoading = false,
    paRawData,
    paRawLoading,
    showReject,
    setShowReject,
    selectedReason,
    setSelectedReason,
    reasonLogData,
    reasonLogLoading,
    reasonLogError = null,
    reasonMonthly,
    reasonChartMonth,
    setReasonChartMonth,
    analysisStartDate,
    setAnalysisStartDate,
    analysisEndDate,
    setAnalysisEndDate,
    onNeedPaRawData,
    unitFilter,
}: ProductAnalysisViewProps) {
    const [layoutMode, setLayoutMode] = useState<AnalysisLayoutMode>('cards');
    const [pCardMode, setPCardMode] = useState<PCardMode>('separate');
    const [combinePSelection, setCombinePSelection] = useState<string[]>([]);
    const [selectedCpCard, setSelectedCpCard] = useState<CPData | null>(null);
    const [logCpFilters, setLogCpFilters] = useState<string[]>(['ALL']);
    const [logKilnFilters, setLogKilnFilters] = useState<string[]>(['ALL']);
    const [selectedSortingLogRow, setSelectedSortingLogRow] = useState<GroupedRow | null>(null);
    const [sortingLogReasonsLoading, setSortingLogReasonsLoading] = useState(false);
    const jobReasonsCacheRef = useRef(new Map<string, GroupedRow>());
    const jobReasonsReqRef = useRef(0);
    const [isSortingLogFullscreen, setIsSortingLogFullscreen] = useState(false);
    const [planningYieldPct, setPlanningYieldPct] = useState<number | null>(null);
    const [planningMeta, setPlanningMeta] = useState<{
        loading?: boolean;
        source?: string | null;
        match?: string | null;
        sampleRows?: number;
        error?: string | null;
    }>({ loading: false });
    /** Separate date ranges per layout tab so switching does not overwrite the other. */
    const [cardsStartDate, setCardsStartDate] = useState(analysisStartDate);
    const [cardsEndDate, setCardsEndDate] = useState(analysisEndDate);
    const [tableStartDate, setTableStartDate] = useState(analysisStartDate);
    const [tableEndDate, setTableEndDate] = useState(analysisEndDate);
    /** Table-mode timeline outer bounds (do not shrink when narrowing range). */
    const [timelineBoundStart, setTimelineBoundStart] = useState(analysisStartDate);
    const [timelineBoundEnd, setTimelineBoundEnd] = useState(analysisEndDate);
    /** Capsule dates selected within timeline (empty = all dates in range). */
    const [selectedCapsuleDates, setSelectedCapsuleDates] = useState<string[]>([]);
    /** Skip re-seeding local ranges when we ourselves pushed dates to parent. */
    const selfPushGenRef = useRef(0);

    const activeStartDate = layoutMode === 'qty-table' ? tableStartDate : cardsStartDate;
    const activeEndDate = layoutMode === 'qty-table' ? tableEndDate : cardsEndDate;

    // Debounce push to parent — sliding timeline must not fire SQL on every tick
    useEffect(() => {
        if (activeStartDate === analysisStartDate && activeEndDate === analysisEndDate) return;
        const timer = window.setTimeout(() => {
            selfPushGenRef.current += 1;
            setAnalysisStartDate(activeStartDate);
            setAnalysisEndDate(activeEndDate);
        }, 500);
        return () => window.clearTimeout(timer);
    }, [
        activeStartDate,
        activeEndDate,
        analysisStartDate,
        analysisEndDate,
        setAnalysisStartDate,
        setAnalysisEndDate,
    ]);

    // Parent auto-range / external date change → seed both tabs (keep filters independent after that)
    useEffect(() => {
        if (selfPushGenRef.current > 0) {
            selfPushGenRef.current -= 1;
            return;
        }
        setCardsStartDate(analysisStartDate);
        setCardsEndDate(analysisEndDate);
        setTableStartDate(analysisStartDate);
        setTableEndDate(analysisEndDate);
        setTimelineBoundStart(analysisStartDate);
        setTimelineBoundEnd(analysisEndDate);
        setSelectedCapsuleDates([]);
    }, [analysisStartDate, analysisEndDate]);

    useEffect(() => {
        setSelectedCapsuleDates([]);
    }, [selectedProduct]);

    useEffect(() => {
        if (layoutMode !== 'qty-table' || !selectedProduct) return;
        onNeedPaRawData?.();
    }, [layoutMode, selectedProduct, onNeedPaRawData]);

    useEffect(() => {
        jobReasonsCacheRef.current = new Map();
        jobReasonsReqRef.current += 1;
        setSortingLogReasonsLoading(false);
        setSelectedSortingLogRow(null);
    }, [paRawData, selectedProduct, analysisStartDate, analysisEndDate, unitFilter]);

    const handleSortingLogRowClick = async (row: GroupedRow) => {
        const cacheKey = `${normalizeMDate(row.m_date)}|${row.m_doc}|${row.m_job}|${row.m_kiln}|${row.m_cp}`;
        const cached = jobReasonsCacheRef.current.get(cacheKey);
        if (cached) {
            setSelectedSortingLogRow(cached);
            return;
        }
        if (row.cdReasons.size > 0 || row.pjReasons.size > 0) {
            jobReasonsCacheRef.current.set(cacheKey, row);
            setSelectedSortingLogRow(row);
            return;
        }

        setSelectedSortingLogRow(row);
        if (row.totalScrap === 0 && row.totalReject === 0) {
            jobReasonsCacheRef.current.set(cacheKey, row);
            return;
        }

        const reqId = ++jobReasonsReqRef.current;
        setSortingLogReasonsLoading(true);
        try {
            const params = new URLSearchParams({
                startDate: analysisStartDate,
                endDate: analysisEndDate,
                product: selectedProduct,
                unit: unitFilter,
                jobReasons: '1',
                m_doc: row.m_doc || '',
                m_job: row.m_job || '',
                m_date: normalizeMDate(row.m_date),
                m_kiln: row.m_kiln || '',
                m_cp: jobReasonQueryCp(row.m_cp),
            });
            const res = await fetch(`/api/data?${params.toString()}`);
            const reasons = await res.json();
            if (jobReasonsReqRef.current !== reqId) return;
            const enriched = Array.isArray(reasons)
                ? applyReasonRowsToGroupedRow(row, reasons)
                : row;
            jobReasonsCacheRef.current.set(cacheKey, enriched);
            setSelectedSortingLogRow(enriched);
        } catch (e) {
            console.error(e);
        } finally {
            if (jobReasonsReqRef.current === reqId) setSortingLogReasonsLoading(false);
        }
    };

    /** Table tab CP metrics: capsule selection rebuilds from raw; else use API stats for table range. */
    const tableCpBreakdown = useMemo(() => {
        if (selectedCapsuleDates.length > 0) {
            return buildCpBreakdownFromRaw(
                paRawData,
                selectedProduct,
                tableStartDate,
                tableEndDate,
                selectedCapsuleDates,
            );
        }
        return productStats?.cpBreakdown ?? [];
    }, [
        selectedCapsuleDates,
        paRawData,
        selectedProduct,
        tableStartDate,
        tableEndDate,
        productStats?.cpBreakdown,
    ]);

    const cardsCpBreakdown = productStats?.cpBreakdown ?? [];
    const activeCpBreakdown =
        layoutMode === 'qty-table' ? tableCpBreakdown : cardsCpBreakdown;

    const isSpecialFiring = useMemo(
        () => isSpecialFiringProduct(activeCpBreakdown),
        [activeCpBreakdown],
    );

    const sortedCpBreakdown = useMemo(() => {
        if (!activeCpBreakdown.length) return [];
        const sorted = sortCpBreakdownForDisplay(activeCpBreakdown);
        if (!isSpecialFiring) {
            return sorted.filter((cp) => cp.m_cp !== 'C1');
        }
        return sorted;
    }, [activeCpBreakdown, isSpecialFiring]);

    const pCpOptions = useMemo(
        () => collectPfiringCps(sortedCpBreakdown),
        [sortedCpBreakdown],
    );

    const pCpOptionsKey = pCpOptions.join('|');

    const displayCpBreakdown = useMemo(
        () =>
            applyCpCardGrouping(
                sortedCpBreakdown,
                pCardMode === 'combine' ? combinePSelection : [],
            ),
        [sortedCpBreakdown, pCardMode, combinePSelection],
    );

    const firingCycleRows = useMemo(
        () =>
            tableCpBreakdown.length
                ? buildFiringCycleQtyRows(tableCpBreakdown)
                : [],
        [tableCpBreakdown],
    );

    const yieldPlanning = useMemo(
        () =>
            tableCpBreakdown.length
                ? buildYieldPlanningResult(tableCpBreakdown)
                : { rows: [], divisorCp: null, divisorProcess: 0 },
        [tableCpBreakdown],
    );

    const planningLookup = useMemo(() => {
        const info = productStats?.totalStats?.info;
        const desc1 = (info?.pt_desc1 || selectedProductLabel || '').trim();
        const part = (info?.m_part || '').trim();
        // DW product key is "DW:desc2:desc1" — prefer info.pt_desc1 when present
        let resolvedDesc1 = desc1;
        if (!info?.pt_desc1 && selectedProduct) {
            const parsed = parseAnalysisProduct(selectedProduct);
            resolvedDesc1 = parsed.pt_desc1 || selectedProduct.trim();
        }
        return { desc1: resolvedDesc1, part };
    }, [productStats?.totalStats?.info, selectedProduct, selectedProductLabel]);

    useEffect(() => {
        if (!planningLookup.desc1 && !planningLookup.part) {
            setPlanningYieldPct(null);
            setPlanningMeta({ loading: false, match: 'none' });
            return;
        }
        let cancelled = false;
        setPlanningMeta((m) => ({ ...m, loading: true, error: null }));
        const qs = new URLSearchParams();
        if (planningLookup.desc1) qs.set('desc1', planningLookup.desc1);
        if (planningLookup.part) qs.set('part', planningLookup.part);
        fetch(`/api/product-planning-yield?${qs.toString()}`)
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to load planning yield');
                if (cancelled) return;
                setPlanningYieldPct(
                    typeof data.planningYieldPct === 'number' ? data.planningYieldPct : null,
                );
                setPlanningMeta({
                    loading: false,
                    source: data.source ?? null,
                    match: data.match ?? null,
                    sampleRows: data.sampleRows ?? 0,
                    error: null,
                });
            })
            .catch((err) => {
                if (cancelled) return;
                setPlanningYieldPct(null);
                setPlanningMeta({
                    loading: false,
                    error: err instanceof Error ? err.message : String(err),
                });
            });
        return () => {
            cancelled = true;
        };
    }, [planningLookup.desc1, planningLookup.part]);

    const kilnOptions = useMemo(
        () => collectKilnValues(paRawData, selectedProduct, tableStartDate, tableEndDate),
        [paRawData, selectedProduct, tableStartDate, tableEndDate],
    );

    const cpOptions = useMemo(
        () =>
            collectCpValues(
                paRawData,
                selectedProduct,
                tableStartDate,
                tableEndDate,
                sortedCpBreakdown.map((cp) => cp.m_cp),
            ),
        [paRawData, selectedProduct, tableStartDate, tableEndDate, sortedCpBreakdown],
    );

    const sortingLogRows = useMemo(() => {
        const rows = buildProductSortingLogRows(
            paRawData,
            selectedProduct,
            logCpFilters,
            logKilnFilters,
            tableStartDate,
            tableEndDate,
        );
        if (selectedCapsuleDates.length === 0) return rows;
        const allow = new Set(selectedCapsuleDates);
        return rows.filter((r) => allow.has(normalizeMDate(r.m_date)));
    }, [
        paRawData,
        selectedProduct,
        logCpFilters,
        logKilnFilters,
        tableStartDate,
        tableEndDate,
        selectedCapsuleDates,
    ]);

    const kilnOptionsKey = kilnOptions.join('|');

    useEffect(() => {
        setLogCpFilters(['ALL']);
        setLogKilnFilters(getDefaultLogKilnFilters(kilnOptions));
    }, [selectedProduct, tableStartDate, tableEndDate, kilnOptionsKey]);

    useEffect(() => {
        setPCardMode('separate');
        setCombinePSelection([...pCpOptions]);
    }, [selectedProduct, pCpOptionsKey]);

    const availableCapsuleDates = useMemo(() => {
        if (!paRawData.length || !selectedProduct) return [];
        const set = new Set<string>();
        for (const item of paRawData) {
            if (!matchesSelectedProduct(item, selectedProduct)) continue;
            const d = normalizeMDate(item.m_date);
            if (!d) continue;
            if (d < tableStartDate || d > tableEndDate) continue;
            set.add(d);
        }
        return [...set].sort();
    }, [paRawData, selectedProduct, tableStartDate, tableEndDate]);

    useEffect(() => {
        setSelectedCapsuleDates((prev) =>
            prev.filter((d) => d >= tableStartDate && d <= tableEndDate),
        );
    }, [tableStartDate, tableEndDate]);

    useEffect(() => {
        if (!isSortingLogFullscreen && !selectedCpCard) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [isSortingLogFullscreen, selectedCpCard]);

    return (
        <div className="animate-in fade-in duration-500 space-y-6">
            <CodewareStickyTitle
                theme={theme}
                title={
                    (productStats?.totalStats?.info?.m_part || '').startsWith('143') && productStats?.totalStats?.info?.pt_desc2
                        ? (productStats.totalStats.info.pt_desc1 || selectedProductLabel)
                        : (selectedProduct ? selectedProductLabel : 'Select a Product')
                }
                subtitle={
                    (productStats?.totalStats?.info?.m_part || '').startsWith('143') && productStats?.totalStats?.info?.pt_desc2
                        ? productStats.totalStats.info.pt_desc2
                        : undefined
                }
                actions={selectedProduct ? (
                    <div className={`flex rounded-lg border ${theme.borderColor} overflow-hidden`}>
                        <button
                            type="button"
                            onClick={() => setLayoutMode('cards')}
                            className={`text-[10px] px-3 py-1.5 font-bold flex items-center gap-1.5 transition-all ${layoutMode === 'cards'
                                ? `${theme.accentBg} text-white`
                                : `${theme.inputBg} ${theme.textMuted} hover:${theme.textWhite}`
                                }`}
                        >
                            <LayoutGrid size={14} />
                            Cards
                        </button>
                        <button
                            type="button"
                            onClick={() => setLayoutMode('qty-table')}
                            className={`text-[10px] px-3 py-1.5 font-bold flex items-center gap-1.5 transition-all border-l ${theme.borderColor} ${layoutMode === 'qty-table'
                                ? `${theme.accentBg} text-white`
                                : `${theme.inputBg} ${theme.textMuted} hover:${theme.textWhite}`
                                }`}
                        >
                            <Table2 size={14} />
                            Table
                        </button>
                    </div>
                ) : undefined}
            />
            {/* Product Info Header */}
            <div className={`${theme.cardBg} border ${theme.borderColor} p-4 sm:p-6 rounded-2xl shadow-lg`}>
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 w-full">
                        {layoutMode === 'qty-table' ? (
                            <TimelineDateFilter
                                theme={theme}
                                currentTheme={currentTheme}
                                boundStart={timelineBoundStart || tableStartDate}
                                boundEnd={timelineBoundEnd || tableEndDate}
                                onChangeBounds={(start, end) => {
                                    setTimelineBoundStart(start);
                                    setTimelineBoundEnd(end);
                                }}
                                startDate={tableStartDate}
                                endDate={tableEndDate}
                                onChangeRange={(start, end) => {
                                    setTableStartDate(start);
                                    setTableEndDate(end);
                                }}
                                availableDates={availableCapsuleDates}
                                selectedDates={selectedCapsuleDates}
                                onSelectedDatesChange={setSelectedCapsuleDates}
                            />
                        ) : (
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
                                <div className={`flex items-center gap-2 px-3 py-2 ${theme.inputBg} rounded-xl border ${theme.borderColor}`}>
                                    <span className={`text-xs font-bold ${theme.textMuted}`}>From:</span>
                                    <input
                                        type="date"
                                        value={cardsStartDate}
                                        onChange={(e) => setCardsStartDate(e.target.value)}
                                        style={{ colorScheme: currentTheme }}
                                        className={`bg-transparent outline-none text-xs font-bold ${theme.textWhite} cursor-pointer`}
                                    />
                                </div>
                                <div className={`flex items-center gap-2 px-3 py-2 ${theme.inputBg} rounded-xl border ${theme.borderColor}`}>
                                    <span className={`text-xs font-bold ${theme.textMuted}`}>To:</span>
                                    <input
                                        type="date"
                                        value={cardsEndDate}
                                        onChange={(e) => setCardsEndDate(e.target.value)}
                                        style={{ colorScheme: currentTheme }}
                                        className={`bg-transparent outline-none text-xs font-bold ${theme.textWhite} cursor-pointer`}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Section: Merged Analysis Table */}
                {selectedProduct && (statsLoading || (productStats && productStats.cpBreakdown.length > 0)) && (
                    <section>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                                <div className={`h-5 w-1 ${theme.accentBg} rounded-full`} />
                                <h2 className={`text-base font-bold ${theme.textWhite}`}>
                                    Analysis Defects by Firing Cycle
                                </h2>
                                {statsLoading && (
                                    <span className={`text-[10px] font-bold ${theme.textMuted} animate-pulse`}>
                                        Updating…
                                    </span>
                                )}
                            </div>
                            {layoutMode === 'cards' && !statsLoading && (
                                <div className="flex flex-wrap items-center gap-2">
                                    {pCpOptions.length >= 2 && (
                                        <PCardModeToggle
                                            options={pCpOptions}
                                            mode={pCardMode}
                                            combineSelection={combinePSelection}
                                            onModeChange={setPCardMode}
                                            onCombineSelectionChange={setCombinePSelection}
                                            theme={theme}
                                            currentTheme={currentTheme}
                                        />
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setShowReject(!showReject)}
                                        className={`text-[10px] px-3 py-1.5 rounded-lg border font-bold transition-all flex items-center gap-2 ${showReject
                                            ? 'bg-orange-500 text-white border-orange-600 shadow-lg shadow-orange-500/20'
                                            : 'bg-red-500 text-white border-red-600 shadow-lg shadow-red-500/20'
                                            }`}
                                    >
                                        {showReject ? <XCircle size={14} /> : <AlertCircle size={14} />}
                                        Show {showReject ? 'Scrap' : 'Reject'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {layoutMode === 'qty-table' ? (
                            <div className="space-y-6">
                                {statsLoading ? (
                                    <div className="space-y-4 animate-pulse" aria-busy="true">
                                        <div className={`h-40 w-full rounded-2xl border ${theme.borderColor} ${theme.inputBg}`} />
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                            {[1, 2, 3, 4].map((i) => (
                                                <div key={i} className={`h-28 rounded-2xl border ${theme.borderColor} ${theme.inputBg}`} />
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <FiringCycleQtyTable
                                            rows={firingCycleRows}
                                            theme={theme}
                                            currentTheme={currentTheme}
                                        />
                                        <YieldPlanningCards
                                            data={yieldPlanning}
                                            theme={theme}
                                            currentTheme={currentTheme}
                                            planningYieldPct={planningYieldPct}
                                            planningMeta={planningMeta}
                                        />
                                    </>
                                )}
                                <div className={isSortingLogFullscreen ? 'relative' : undefined}>
                                    {isSortingLogFullscreen && (
                                        <div
                                            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
                                            onClick={() => setIsSortingLogFullscreen(false)}
                                        />
                                    )}
                                    <div
                                        className={
                                            isSortingLogFullscreen
                                                ? `fixed inset-2 sm:inset-4 md:inset-8 z-[100] ${theme.pageBg} p-3 sm:p-4 md:p-6 border ${theme.borderColor} rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col min-h-0 overflow-hidden transition-all duration-300`
                                                : undefined
                                        }
                                    >
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3 shrink-0">
                                            <SectionHeader
                                                title="Data Sorting Log"
                                                subtitle={`${sortingLogRows.length} jobs (filtered)`}
                                                theme={theme}
                                            />
                                            <div className="flex flex-wrap items-center gap-2">
                                                <ExportProductSortingLogButton
                                                    rows={sortingLogRows}
                                                    productLabel={selectedProductLabel}
                                                    startDate={
                                                        selectedCapsuleDates.length === 1
                                                            ? selectedCapsuleDates[0]
                                                            : tableStartDate
                                                    }
                                                    endDate={
                                                        selectedCapsuleDates.length === 1
                                                            ? selectedCapsuleDates[0]
                                                            : selectedCapsuleDates.length > 1
                                                              ? [...selectedCapsuleDates].sort().at(-1)!
                                                              : tableEndDate
                                                    }
                                                    cpFilters={logCpFilters}
                                                    kilnFilters={logKilnFilters}
                                                    theme={theme}
                                                    disabled={paRawLoading}
                                                />

                                                <MultiCheckFilter
                                                    label="CP"
                                                    options={cpOptions}
                                                    selected={logCpFilters}
                                                    onChange={setLogCpFilters}
                                                    theme={theme}
                                                    currentTheme={currentTheme}
                                                />
                                                <MultiCheckFilter
                                                    label="Kiln"
                                                    options={kilnOptions}
                                                    selected={logKilnFilters}
                                                    onChange={setLogKilnFilters}
                                                    theme={theme}
                                                    currentTheme={currentTheme}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setIsSortingLogFullscreen((v) => !v)}
                                                    className={`p-2 rounded-xl ${theme.inputBg} border ${theme.borderColor} ${theme.textSecondary} hover:opacity-90 transition-all`}
                                                    title={isSortingLogFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                                                >
                                                    {isSortingLogFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                                                </button>
                                            </div>
                                        </div>
                                        <div
                                            className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl shadow-xl flex flex-col min-h-0 min-w-0 ${isSortingLogFullscreen ? 'flex-1 overflow-hidden' : ''}`}
                                        >
                                            <QtyGradeSortingLog
                                                rows={sortingLogRows}
                                                theme={theme}
                                                currentTheme={currentTheme}
                                                loading={paRawLoading}
                                                emptyMessage="No sorting activity for this product and filters."
                                                onRowClick={handleSortingLogRowClick}
                                                isFullscreen={isSortingLogFullscreen}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : statsLoading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 animate-pulse" aria-busy="true">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className={`h-48 rounded-2xl border ${theme.borderColor} ${theme.inputBg}`} />
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2">
                                {displayCpBreakdown.map((cp, idx) => (
                                    <CompactCard
                                        key={`${cp.m_cp}-${idx}`}
                                        cp={cp}
                                        theme={theme}
                                        currentTheme={currentTheme}
                                        showReject={showReject}
                                        onCardClick={() => setSelectedCpCard(cp)}
                                        onReasonClick={(r) => {
                                            setReasonChartMonth(null);
                                            setSelectedReason(r);
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                )}
            </div>

            {/* Data Log — only visible when a reason is selected */}
            {selectedReason && (
                <div className={`${theme.cardBg} border ${theme.borderColor} p-4 sm:p-6 rounded-2xl shadow-lg`}>
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className={`h-5 w-1 ${selectedReason.sub_type === 'P' ? 'bg-orange-500' : 'bg-red-500'} rounded-full`} />
                            <h2 className={`text-base font-bold ${theme.textWhite}`}>Data Log</h2>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${selectedReason.sub_type === 'P' ? 'bg-orange-500/15 text-orange-400 border-orange-500/30' : 'bg-red-500/15 text-red-400 border-red-500/30'}`}>
                                {selectedReason.sub_type === 'P' ? 'Reject' : 'Scrap'}
                            </span>
                            <span className={`text-xs font-semibold ${theme.textWhite} max-w-full sm:max-w-[300px] truncate`} title={selectedReason.rsn_desc}>
                                {selectedReason.rsn_desc}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded font-bold ${theme.inputBg} border ${theme.borderColor} ${theme.textMuted}`}>
                                CP: {selectedReason.display_cp || selectedReason.m_cp}
                            </span>
                            {!reasonLogLoading && (
                                <span className={`text-xs px-2 py-0.5 rounded-full ${theme.inputBg} border ${theme.borderColor} ${theme.textMuted} font-medium`}>
                                    {reasonLogData.length} records
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => setSelectedReason(null)}
                            className={`text-[10px] px-2 py-1 rounded-lg border font-bold transition-all ${theme.inputBg} ${theme.textMuted} ${theme.borderColor} hover:opacity-70 flex items-center gap-1`}
                        >
                            <X size={10} /> Clear
                        </button>
                    </div>

                    {/* Monthly Area Chart */}
                    {reasonMonthly.length > 0 && (
                        <div className="mb-5">
                            <p className={`text-xs font-bold uppercase ${theme.textMuted} mb-2`}>Monthly Defect Rate vs Total {selectedReason.sub_type === 'P' ? 'Reject' : 'Scrap'} Rate (%)</p>
                            <div className="h-[180px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={reasonMonthly} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        onClick={(e: any) => { if (e && e.activeLabel) { setReasonChartMonth(reasonChartMonth === e.activeLabel ? null : e.activeLabel); } }}>
                                        <defs>
                                            <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={selectedReason.sub_type === 'P' ? '#eab308' : '#ef4444'} stopOpacity={0.15} />
                                                <stop offset="95%" stopColor={selectedReason.sub_type === 'P' ? '#eab308' : '#ef4444'} stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="reasonGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={SKIN_ACCENT} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={SKIN_ACCENT} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke={currentTheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                                        <XAxis dataKey="month" tick={{ fill: currentTheme === 'dark' ? '#9ca3af' : '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} style={{ cursor: 'pointer' }} />
                                        <YAxis tick={{ fill: currentTheme === 'dark' ? '#9ca3af' : '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} unit="%" />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: currentTheme === 'dark' ? '#141414' : '#fff', borderRadius: '10px', fontSize: '12px' }}
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            formatter={(v: any, name: any) => [`${v}%`, name]}
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            itemSorter={(item: any) => (item.dataKey === 'totalPct' ? -1 : 1)}
                                        />
                                        <Legend iconType="line" wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }} />
                                        <Area type="monotone" dataKey="totalPct" name={`%Total ${selectedReason.sub_type === 'P' ? 'Reject' : 'Scrap'}`}
                                            stroke={selectedReason.sub_type === 'P' ? '#eab308' : '#ef4444'} strokeWidth={2}
                                            fill="url(#totalGrad)"
                                        />
                                        <Area type="monotone" dataKey="pct" name={`${selectedReason.rsn_desc}`}
                                            stroke={SKIN_ACCENT}
                                            strokeWidth={2} strokeDasharray="5 5"
                                            fill="url(#reasonGrad)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Log Tables */}
                    {reasonLogLoading ? (
                        <div className="space-y-5 animate-pulse">
                            {/* Skeleton: chart area */}
                            <div>
                                <div className={`h-3 w-48 ${theme.inputBg} rounded mb-3`} />
                                <div className={`h-[180px] w-full ${theme.inputBg} rounded-xl`} />
                            </div>
                            {/* Skeleton: tables */}
                            <div className="flex gap-4 flex-col lg:flex-row">
                                {[1, 2].map(t => (
                                    <div key={t} className="flex-1">
                                        <div className={`h-3 w-32 ${theme.inputBg} rounded mb-3`} />
                                        <div className={`border ${theme.borderColor} rounded-xl overflow-hidden`}>
                                            <div className={`h-8 ${theme.inputBg}`} />
                                            {[...Array(5)].map((_, i) => (
                                                <div key={i} className={`flex gap-3 px-3 py-2.5 border-t ${theme.borderColor}`}>
                                                    <div className={`h-3 w-6 ${theme.inputBg} rounded`} />
                                                    <div className={`h-3 w-16 ${theme.inputBg} rounded`} />
                                                    <div className={`h-3 w-14 ${theme.inputBg} rounded`} />
                                                    <div className={`h-3 w-10 ${theme.inputBg} rounded`} />
                                                    <div className={`h-3 flex-1 ${theme.inputBg} rounded`} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : reasonLogError ? (
                        <div className={`py-10 text-center text-sm`}>
                            <p className="text-red-400 font-semibold mb-1">Failed to load reason log</p>
                            <p className={`${theme.textMuted}`}>{reasonLogError}</p>
                        </div>
                    ) : reasonLogData.length === 0 ? (
                        <div className={`py-10 text-center ${theme.textMuted} text-sm`}>No records found for this reason</div>
                    ) : (() => {
                        // Filter by selected month or show top 10 most recent
                        const filterAndLimit = (rows: typeof reasonLogData) => {
                            const sorted = [...rows].sort((a, b) => b.m_date.localeCompare(a.m_date));
                            if (reasonChartMonth) {
                                return sorted.filter(r => r.m_date.substring(0, 7) === reasonChartMonth);
                            }
                            return sorted.slice(0, 10);
                        };
                        const allProd = reasonLogData.filter(r => !/test/i.test(r.m_job));
                        const allTest = reasonLogData.filter(r => /test/i.test(r.m_job));
                        const prodRows = filterAndLimit(allProd);
                        const testRows = filterAndLimit(allTest);

                        const isReject = selectedReason.sub_type === 'P';

                        const chartSubtitle = reasonChartMonth ? `(${reasonChartMonth})` : '(Latest 10)';
                        return (
                            <div>
                                {reasonChartMonth && (
                                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                                        <span className={`text-xs ${theme.textMuted}`}>Filtered by:</span>
                                        <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-bold">{reasonChartMonth}</span>
                                        <button onClick={() => setReasonChartMonth(null)} className={`text-[10px] ${theme.textMuted} hover:text-red-400 underline`}>Clear</button>
                                    </div>
                                )}
                                <div className={`flex gap-4 ${testRows.length > 0 ? 'flex-col lg:flex-row' : ''}`}>
                                    {prodRows.length > 0 && (
                                        <ResponsiveReasonLog
                                            rows={prodRows}
                                            theme={theme}
                                            currentTheme={currentTheme}
                                            isReject={isReject}
                                            label="Production"
                                            subtitle={chartSubtitle}
                                        />
                                    )}
                                    {testRows.length > 0 && (
                                        <ResponsiveReasonLog
                                            rows={testRows}
                                            theme={theme}
                                            currentTheme={currentTheme}
                                            isReject={isReject}
                                            label="Test"
                                            subtitle={chartSubtitle}
                                        />
                                    )}
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}
            {selectedCpCard && (
                <CpDefectModal
                    cp={selectedCpCard}
                    theme={theme}
                    currentTheme={currentTheme}
                    showReject={showReject}
                    onClose={() => setSelectedCpCard(null)}
                    onReasonClick={(r) => {
                        setReasonChartMonth(null);
                        setSelectedReason(r);
                    }}
                />
            )}
            {selectedSortingLogRow && (
                <DailyDetailModal
                    row={selectedSortingLogRow}
                    theme={theme}
                    currentTheme={currentTheme}
                    reasonsLoading={sortingLogReasonsLoading}
                    onClose={() => {
                        setSelectedSortingLogRow(null);
                        setSortingLogReasonsLoading(false);
                    }}
                />
            )}
        </div>
    );
}
