"use client";

import { Search, Calendar, TrendingUp, AlertCircle, CheckCircle2, XCircle, Maximize2, Minimize2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Theme, ThemeName } from '@/lib/themes';
import type { GroupedRow } from '@/types/dashboard';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { ResponsiveSortingLog } from '@/components/dashboard/ResponsiveSortingLog';
import { ExportOverviewSortingLogButton } from '@/components/dashboard/ExportOverviewSortingLogButton';
import { formatDateDisplay } from '@/lib/utils';

interface OverviewMetrics {
    totalQtyp: number;
    totalQtya: number;
    totalScrap: number;
    totalReject: number;
    scrapRate: number;
    rejectRate: number;
    compRate: number;
}

interface TrendDataPoint {
    name: string;
    scrap: number;
    reject: number;
    comp: number;
}

interface OverviewViewProps {
    theme: Theme;
    currentTheme: ThemeName;
    selectedDate: string;
    dailyMetrics: OverviewMetrics;
    weeklyMetrics: OverviewMetrics;
    trendData: TrendDataPoint[];
    dailyActivityTable: GroupedRow[];
    activityTable: GroupedRow[];
    /** Full filtered rows for Excel (not capped at 100 like the on-screen table). */
    activityTableExportRows: GroupedRow[];
    // Daily Monitor
    isDailyMonitorFullscreen: boolean;
    setIsDailyMonitorFullscreen: (v: boolean) => void;
    setSelectedDailyRow: (row: GroupedRow | null) => void;
    // Filters for Data Sorting Logs
    cpFilter: string;
    setCpFilter: (v: string) => void;
    unitFilter: string;
    searchQuery: string;
    setSearchQuery: (v: string) => void;
    cpOptions: string[];
    // Fullscreen filters
    overallCpFilter: string;
    setOverallCpFilter: (v: string) => void;
    setSelectedDate: (d: string) => void;
}

export function OverviewView({
    theme,
    currentTheme,
    selectedDate,
    dailyMetrics,
    weeklyMetrics,
    trendData,
    dailyActivityTable,
    activityTable,
    activityTableExportRows,
    isDailyMonitorFullscreen,
    setIsDailyMonitorFullscreen,
    setSelectedDailyRow,
    cpFilter,
    setCpFilter,
    unitFilter,
    searchQuery,
    setSearchQuery,
    cpOptions,
    overallCpFilter,
    setOverallCpFilter,
    setSelectedDate,
}: OverviewViewProps) {
    return (
        <>
            {/* Section 1: Performance Overview */}
            <section>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-2">
                    <SectionHeader title="Performance Overview" subtitle={`Comparing Daily (${formatDateDisplay(selectedDate)}) / Weekly`} theme={theme} />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                    {/* Qty Processed */}
                    <div className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl p-5 shadow-lg relative overflow-hidden group skin-card-hover`}>
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                            <TrendingUp size={40} />
                        </div>
                        <div className="flex flex-col h-full justify-between">
                            <div>
                                <p className={`text-[10px] font-bold uppercase ${theme.textMuted} mb-1`}>PROCESSED</p>
                                <div className="flex items-baseline gap-2">
                                    <span className={`text-lg sm:text-2xl font-black ${theme.textWhite}`}>{dailyMetrics.totalQtyp.toLocaleString()}</span>
                                    <span className={`text-sm font-medium ${theme.textMuted}`}>/ {weeklyMetrics.totalQtyp.toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="mt-3 flex items-center gap-2">
                                <div className={`text-[10px] px-2 py-0.5 rounded-md ${theme.badgeBg} ${theme.accentText} border ${theme.badgeBorder} font-bold`}>
                                    Daily / Weekly
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Comp (Good) */}
                    <div className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-green-500/30 transition-all`}>
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                            <CheckCircle2 size={40} className="text-green-500" />
                        </div>
                        <div className="flex flex-col h-full justify-between">
                            <div>
                                <p className={`text-[10px] font-bold uppercase ${theme.textMuted} mb-1`}>Completed</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-lg sm:text-2xl font-black text-green-500">{dailyMetrics.totalQtya.toLocaleString()}</span>
                                    <span className={`text-sm font-medium ${theme.textMuted}`}>/ {weeklyMetrics.totalQtya.toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="mt-3">
                                <div className="flex items-center gap-2">
                                    <div className={`flex-1 h-1.5 rounded-full ${theme.inputBg} overflow-hidden`}>
                                        <div className="h-full bg-green-500" style={{ width: `${dailyMetrics.totalQtyp > 0 ? (dailyMetrics.totalQtya / dailyMetrics.totalQtyp) * 100 : 0}%` }} />
                                    </div>
                                    <span className="text-[10px] font-bold text-green-500">{dailyMetrics.totalQtyp > 0 ? ((dailyMetrics.totalQtya / dailyMetrics.totalQtyp) * 100).toFixed(1) : 0}%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Scrap */}
                    <div className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-red-500/30 transition-all`}>
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                            <AlertCircle size={40} className="text-red-500" />
                        </div>
                        <div className="flex flex-col h-full justify-between">
                            <div>
                                <p className={`text-[10px] font-bold uppercase ${theme.textMuted} mb-1`}>Scrap</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-lg sm:text-2xl font-black text-red-500">{dailyMetrics.totalScrap.toLocaleString()}</span>
                                    <span className={`text-sm font-medium ${theme.textMuted}`}>/ {weeklyMetrics.totalScrap.toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="mt-3">
                                <div className="flex items-center gap-2">
                                    <div className={`flex-1 h-1.5 rounded-full ${theme.inputBg} overflow-hidden`}>
                                        <div className="h-full bg-red-500" style={{ width: `${Math.min(dailyMetrics.scrapRate, 100)}%` }} />
                                    </div>
                                    <span className="text-[10px] font-bold text-red-500">{dailyMetrics.scrapRate.toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Reject */}
                    <div className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-orange-500/30 transition-all`}>
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                            <XCircle size={40} className="text-orange-500" />
                        </div>
                        <div className="flex flex-col h-full justify-between">
                            <div>
                                <p className={`text-[10px] font-bold uppercase ${theme.textMuted} mb-1`}>Reject</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-lg sm:text-2xl font-black text-orange-400">{dailyMetrics.totalReject.toLocaleString()}</span>
                                    <span className={`text-sm font-medium ${theme.textMuted}`}>/ {weeklyMetrics.totalReject.toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="mt-3">
                                <div className="flex items-center gap-2">
                                    <div className={`flex-1 h-1.5 rounded-full ${theme.inputBg} overflow-hidden`}>
                                        <div className="h-full bg-orange-500" style={{ width: `${Math.min(dailyMetrics.totalQtyp > 0 ? (dailyMetrics.totalReject / dailyMetrics.totalQtyp) * 100 : 0, 100)}%` }} />
                                    </div>
                                    <span className="text-[10px] font-bold text-orange-400">{dailyMetrics.totalQtyp > 0 ? ((dailyMetrics.totalReject / dailyMetrics.totalQtyp) * 100).toFixed(1) : 0}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section 2: Trend Chart + Daily Activity Table */}
            <section>
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    {/* Chart Column */}
                    <div className="xl:col-span-5">
                        <SectionHeader title="Weekly Performance Trend" subtitle="7-day breakdown (Good/Reject/Scrap)" theme={theme} />
                        <div className={`${theme.cardBg} border ${theme.borderColor} p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl h-[260px] sm:h-[320px] md:h-[400px]`}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorComp" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorReject" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorScrap" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke={currentTheme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: currentTheme === "dark" ? "#9ca3af" : "#6b7280", fontSize: 11, fontWeight: 500 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: currentTheme === "dark" ? "#9ca3af" : "#6b7280", fontSize: 11, fontWeight: 500 }}
                                        tickFormatter={(value) => `${value}%`}
                                        domain={[0, 100]}
                                        ticks={[0, 20, 40, 60, 80, 100]}
                                        width={35}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: currentTheme === "dark" ? "#141414" : "#ffffff",
                                            border: `1px solid ${currentTheme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                                            borderRadius: "12px",
                                            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
                                        }}
                                        itemStyle={{ color: theme.primary }}
                                    />
                                    <Area type="monotone" dataKey="scrap" stackId="1" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorScrap)" name="Scrap" />
                                    <Area type="monotone" dataKey="reject" stackId="1" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#colorReject)" name="Reject" />
                                    <Area type="monotone" dataKey="comp" stackId="1" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#colorComp)" name="Good" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Daily Activity Side Widget */}
                    {isDailyMonitorFullscreen && (
                        <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm" onClick={() => setIsDailyMonitorFullscreen(false)} />
                    )}
                    <div className={isDailyMonitorFullscreen ? `fixed inset-2 sm:inset-4 md:inset-8 z-[100] ${theme.pageBg} p-3 sm:p-4 md:p-6 border ${theme.borderColor} rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col transition-all duration-300` : "xl:col-span-7 flex flex-col min-w-0"}>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                            <SectionHeader title="Daily Defects Monitor" subtitle={`Items on ${selectedDate}`} theme={theme} />
                            <div className="flex flex-wrap items-center gap-2">
                                {isDailyMonitorFullscreen && (
                                    <>
                                        <div className={`flex items-center gap-2 px-2 md:px-3 py-1.5 md:py-2 ${theme.inputBg} rounded-xl border ${theme.borderColor}`}>
                                            <span className={`text-[10px] md:text-xs font-bold ${theme.textMuted} hidden md:inline`}>CP:</span>
                                            <select
                                                value={overallCpFilter}
                                                onChange={(e) => setOverallCpFilter(e.target.value)}
                                                className={`bg-transparent outline-none text-[10px] md:text-xs font-bold ${theme.textWhite} cursor-pointer min-w-[50px]`}
                                                title="Select CP"
                                            >
                                                {cpOptions.map(cp => <option key={cp} value={cp} className={currentTheme === "dark" ? "bg-[#141414]" : "bg-white"}>{cp}</option>)}
                                            </select>
                                        </div>
                                        <div className={`flex items-center gap-2 px-2 md:px-3 py-1.5 md:py-2 ${theme.inputBg} rounded-xl border ${theme.borderColor}`}>
                                            <Calendar size={14} className={`${theme.textMuted} hidden md:block`} />
                                            <input
                                                type="date"
                                                title="Select Date"
                                                value={selectedDate}
                                                onChange={(e) => setSelectedDate(e.target.value)}
                                                style={{ colorScheme: currentTheme }}
                                                className={`bg-transparent outline-none text-[10px] md:text-xs font-bold ${theme.textWhite} cursor-pointer`}
                                            />
                                        </div>
                                    </>
                                )}
                                <button
                                    onClick={() => setIsDailyMonitorFullscreen(!isDailyMonitorFullscreen)}
                                    className={`p-2 rounded-xl ${theme.inputBg} border ${theme.borderColor} ${theme.textSecondary} hover:${theme.textWhite} transition-all`}
                                    title={isDailyMonitorFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                                >
                                    {isDailyMonitorFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                                </button>
                            </div>
                        </div>
                        <div className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl flex-1 min-h-0 ${isDailyMonitorFullscreen ? 'max-h-full' : 'max-h-[min(70vh,520px)]'} flex flex-col`}>
                            <ResponsiveSortingLog
                                rows={dailyActivityTable}
                                theme={theme}
                                currentTheme={currentTheme}
                                onRowClick={setSelectedDailyRow}
                                emptyMessage={`No activity on ${formatDateDisplay(selectedDate)}`}
                                showJobPart={false}
                                scrapColumnLabel="Top Defect(C)"
                                rejectColumnLabel="Top Defect(P)"
                                variant="daily-monitor"
                                isFullscreen={isDailyMonitorFullscreen}
                                scrollClassName="flex-1 min-h-0"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Section 3: Activity Table */}
            <section>
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                    <SectionHeader title="Data Sorting Logs" subtitle="Real-time production logs" theme={theme} />
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        <ExportOverviewSortingLogButton
                            rows={activityTableExportRows}
                            selectedDate={selectedDate}
                            cpFilter={cpFilter}
                            unitFilter={unitFilter}
                            theme={theme}
                        />
                        <div className={`flex items-center gap-2 px-3 py-2 ${theme.inputBg} rounded-xl border ${theme.borderColor}`}>
                            <span className={`text-xs font-bold ${theme.textMuted}`}>CP:</span>
                            <select
                                value={cpFilter}
                                onChange={(e) => setCpFilter(e.target.value)}
                                className={`bg-transparent outline-none text-xs font-bold ${theme.textWhite} cursor-pointer`}
                                title="Control Point Filter"
                            >
                                {cpOptions.map(cp => <option key={cp} value={cp} className={currentTheme === "dark" ? "bg-[#141414]" : "bg-white"}>{cp}</option>)}
                            </select>
                        </div>
                        <div className={`flex items-center gap-3 px-4 py-2.5 ${theme.inputBg} rounded-xl border ${theme.borderColor} flex-1 md:w-64`}>
                            <Search size={18} className={theme.textMuted} />
                            <input
                                placeholder="Search Job, Part..."
                                title="Search Input"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-transparent border-none outline-none text-sm w-full font-medium"
                            />
                        </div>
                    </div>
                </div>

                <div className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl transition-all`}>
                    <ResponsiveSortingLog
                        rows={activityTable}
                        theme={theme}
                        currentTheme={currentTheme}
                        onRowClick={setSelectedDailyRow}
                        emptyMessage="No matching sorting activity found."
                        scrollClassName="max-h-[min(600px,70vh)]"
                    />

                </div>
            </section>
        </>
    );
}
