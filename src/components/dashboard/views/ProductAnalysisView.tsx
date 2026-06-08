"use client";

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, LayoutGrid, Maximize2, Minimize2, Table2, XCircle, X } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { Theme, ThemeName } from '@/lib/themes';
import type { CPData, DataItem, GroupedRow, ProductStats, SelectedReason, ReasonLogEntry, ReasonMonthlyEntry } from '@/types/dashboard';
import { CompactCard } from '@/components/dashboard/CompactCard';
import { FiringCycleQtyTable } from '@/components/dashboard/FiringCycleQtyTable';
import { ResponsiveReasonLog } from '@/components/dashboard/ResponsiveReasonLog';
import { MultiCheckFilter } from '@/components/dashboard/MultiCheckFilter';
import { CpDefectModal } from '@/components/dashboard/CpDefectModal';
import { DailyDetailModal } from '@/components/dashboard/DailyDetailModal';
import { ExportProductSortingLogButton } from '@/components/dashboard/ExportProductSortingLogButton';
import { QtyGradeSortingLog } from '@/components/dashboard/QtyGradeSortingLog';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { applyCpCardGrouping, collectPfiringCps } from '@/lib/cp-card-grouping';
import { PCardModeToggle, type PCardMode } from '@/components/dashboard/PCardModeToggle';
import {
    buildFiringCycleQtyRows,
    isSpecialFiringProduct,
    sortCpBreakdownForDisplay,
} from '@/lib/firing-cycle-labels';
import {
    buildProductSortingLogRows,
    collectCpValues,
    collectKilnValues,
    getDefaultLogKilnFilters,
} from '@/lib/product-sorting-log';
import { formatDateDisplay } from '@/lib/utils';

type AnalysisLayoutMode = 'cards' | 'qty-table';

interface ProductAnalysisViewProps {
    theme: Theme;
    currentTheme: ThemeName;
    selectedProduct: string;
    selectedProductLabel: string;
    productStats: ProductStats | null;
    paRawData: DataItem[];
    paRawLoading: boolean;
    showReject: boolean;
    setShowReject: (v: boolean) => void;
    selectedReason: SelectedReason | null;
    setSelectedReason: (r: SelectedReason | null) => void;
    reasonLogData: ReasonLogEntry[];
    reasonLogLoading: boolean;
    reasonMonthly: ReasonMonthlyEntry[];
    reasonChartMonth: string | null;
    setReasonChartMonth: (m: string | null) => void;
    analysisStartDate: string;
    setAnalysisStartDate: (d: string) => void;
    analysisEndDate: string;
    setAnalysisEndDate: (d: string) => void;
}

export function ProductAnalysisView({
    theme,
    currentTheme,
    selectedProduct,
    selectedProductLabel,
    productStats,
    paRawData,
    paRawLoading,
    showReject,
    setShowReject,
    selectedReason,
    setSelectedReason,
    reasonLogData,
    reasonLogLoading,
    reasonMonthly,
    reasonChartMonth,
    setReasonChartMonth,
    analysisStartDate,
    setAnalysisStartDate,
    analysisEndDate,
    setAnalysisEndDate,
}: ProductAnalysisViewProps) {
    const [layoutMode, setLayoutMode] = useState<AnalysisLayoutMode>('cards');
    const [pCardMode, setPCardMode] = useState<PCardMode>('separate');
    const [combinePSelection, setCombinePSelection] = useState<string[]>([]);
    const [selectedCpCard, setSelectedCpCard] = useState<CPData | null>(null);
    const [logCpFilters, setLogCpFilters] = useState<string[]>(['ALL']);
    const [logKilnFilters, setLogKilnFilters] = useState<string[]>(['ALL']);
    const [selectedSortingLogRow, setSelectedSortingLogRow] = useState<GroupedRow | null>(null);
    const [isSortingLogFullscreen, setIsSortingLogFullscreen] = useState(false);

    const isSpecialFiring = useMemo(
        () => isSpecialFiringProduct(productStats?.cpBreakdown ?? []),
        [productStats?.cpBreakdown],
    );

    const sortedCpBreakdown = useMemo(() => {
        if (!productStats?.cpBreakdown?.length) return [];
        const sorted = sortCpBreakdownForDisplay(productStats.cpBreakdown);
        if (!isSpecialFiring) {
            return sorted.filter((cp) => cp.m_cp !== 'C1');
        }
        return sorted;
    }, [productStats?.cpBreakdown, isSpecialFiring]);

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
            productStats?.cpBreakdown?.length
                ? buildFiringCycleQtyRows(productStats.cpBreakdown)
                : [],
        [productStats?.cpBreakdown],
    );

    const kilnOptions = useMemo(
        () => collectKilnValues(paRawData, selectedProduct, analysisStartDate, analysisEndDate),
        [paRawData, selectedProduct, analysisStartDate, analysisEndDate],
    );

    const cpOptions = useMemo(
        () =>
            collectCpValues(
                paRawData,
                selectedProduct,
                analysisStartDate,
                analysisEndDate,
                sortedCpBreakdown.map((cp) => cp.m_cp),
            ),
        [paRawData, selectedProduct, analysisStartDate, analysisEndDate, sortedCpBreakdown],
    );

    const sortingLogRows = useMemo(
        () =>
            buildProductSortingLogRows(
                paRawData,
                selectedProduct,
                logCpFilters,
                logKilnFilters,
                analysisStartDate,
                analysisEndDate,
            ),
        [paRawData, selectedProduct, logCpFilters, logKilnFilters, analysisStartDate, analysisEndDate],
    );

    const kilnOptionsKey = kilnOptions.join('|');

    useEffect(() => {
        setLogCpFilters(['ALL']);
        setLogKilnFilters(getDefaultLogKilnFilters(kilnOptions));
    }, [selectedProduct, analysisStartDate, analysisEndDate, kilnOptionsKey]);

    useEffect(() => {
        setPCardMode('separate');
        setCombinePSelection([...pCpOptions]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when P CP list changes
    }, [selectedProduct, pCpOptionsKey]);

    useEffect(() => {
        if (!isSortingLogFullscreen && !selectedCpCard) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [isSortingLogFullscreen, selectedCpCard]);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            {/* Product Info Header */}
            <div className={`${theme.cardBg} border ${theme.borderColor} p-4 sm:p-6 rounded-2xl shadow-lg`}>
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="min-w-0">
                            <p className={`text-xs font-bold uppercase ${theme.textMuted} mb-1`}>Codeware</p>
                            {(productStats?.totalStats?.info?.m_part || '').startsWith('143') && productStats?.totalStats?.info?.pt_desc2 ? (
                                <div>
                                    <h1 className={`text-2xl font-black ${theme.textWhite}`}>{productStats.totalStats.info.pt_desc1 || selectedProductLabel}</h1>
                                    <p className={`text-lg font-bold mt-1 ${currentTheme === "dark" ? "text-blue-400" : "text-blue-700"}`}>{productStats.totalStats.info.pt_desc2}</p>
                                </div>
                            ) : (
                                <h1 className={`text-xl sm:text-2xl md:text-3xl font-black ${theme.textWhite} break-words`}>{selectedProductLabel}</h1>
                            )}
                        </div>
                        {productStats && productStats.cpBreakdown.length > 0 && (
                            <div className={`flex rounded-lg border ${theme.borderColor} overflow-hidden shrink-0 self-start sm:self-auto`}>
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
                        )}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 w-full">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
                            {/* Date Range Picker */}
                            <div className={`flex items-center gap-2 px-3 py-2 ${theme.inputBg} rounded-xl border ${theme.borderColor}`}>
                                <span className={`text-xs font-bold ${theme.textMuted}`}>From:</span>
                                <input
                                    type="date"
                                    value={analysisStartDate}
                                    onChange={(e) => setAnalysisStartDate(e.target.value)}
                                    style={{ colorScheme: currentTheme }}
                                    className={`bg-transparent outline-none text-xs font-bold ${theme.textWhite} cursor-pointer`}
                                />
                            </div>
                            <div className={`flex items-center gap-2 px-3 py-2 ${theme.inputBg} rounded-xl border ${theme.borderColor}`}>
                                <span className={`text-xs font-bold ${theme.textMuted}`}>To:</span>
                                <input
                                    type="date"
                                    value={analysisEndDate}
                                    onChange={(e) => setAnalysisEndDate(e.target.value)}
                                    style={{ colorScheme: currentTheme }}
                                    className={`bg-transparent outline-none text-xs font-bold ${theme.textWhite} cursor-pointer`}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section: Merged Analysis Table */}
                {productStats && productStats.cpBreakdown.length > 0 && (
                    <section>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                                <div className={`h-5 w-1 ${theme.accentBg} rounded-full`} />
                                <h2 className={`text-base font-bold ${theme.textWhite}`}>Analysis Defects by Firing Cycle</h2>
                            </div>
                            {layoutMode === 'cards' && (
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
                                <FiringCycleQtyTable
                                    rows={firingCycleRows}
                                    theme={theme}
                                    currentTheme={currentTheme}
                                />
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
                                                    startDate={analysisStartDate}
                                                    endDate={analysisEndDate}
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
                                            className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl overflow-hidden shadow-xl flex flex-col min-h-0 ${isSortingLogFullscreen ? 'flex-1' : ''}`}
                                        >
                                            <QtyGradeSortingLog
                                                rows={sortingLogRows}
                                                theme={theme}
                                                currentTheme={currentTheme}
                                                loading={paRawLoading}
                                                emptyMessage="No sorting activity for this product and filters."
                                                onRowClick={setSelectedSortingLogRow}
                                                isFullscreen={isSortingLogFullscreen}
                                            />
                                        </div>
                                    </div>
                                </div>
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
                                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
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
                                            stroke="#2563eb"
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
                    onClose={() => setSelectedSortingLogRow(null)}
                />
            )}
        </div>
    );
}
