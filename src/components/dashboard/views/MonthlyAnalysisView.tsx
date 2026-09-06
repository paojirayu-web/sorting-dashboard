"use client";

import React, { useMemo, useState } from 'react';
import { AlertCircle, XCircle } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList, ReferenceLine } from 'recharts';
import { SKIN_ACCENT, SKIN_ACCENT_TEXT, type Theme, type ThemeName } from '@/lib/themes';
import type { MonthlyStats, DataItem, GroupedRow } from '@/types/dashboard';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { CodewareStickyTitle } from '@/components/dashboard/CodewareStickyTitle';
import { isC1SpecialReasonForRecord, isSomboonCpC } from '@/lib/c1-special-reason';
import { isDefectReasonSubTyp, isRejectSubTyp, isScrapSubTyp } from '@/lib/sub-typ';
import { DailyDetailModal } from '@/components/dashboard/DailyDetailModal';
import { ResponsiveSortingLog } from '@/components/dashboard/ResponsiveSortingLog';
import { matchesSelectedProduct, parseAnalysisProduct } from '@/lib/product-sorting-log';

interface MonthlyAnalysisViewProps {
    theme: Theme;
    currentTheme: ThemeName;
    selectedProduct: string;
    selectedProductLabel: string;
    monthlyStats: MonthlyStats | null;
    monthlyLoading?: boolean;
    showMonthlyReject: boolean;
    setShowMonthlyReject: (v: boolean) => void;
    // Data for sorting log
    allData: DataItem[];
    // CP and Kiln options for filters
    cpOptions: string[];
    monthlyCpFilter: string;
    setMonthlyCpFilter: (v: string) => void;
    analysisStartDate: string;
    setAnalysisStartDate: (d: string) => void;
    analysisEndDate: string;
    setAnalysisEndDate: (d: string) => void;
}

export function MonthlyAnalysisView({
    theme,
    currentTheme,
    selectedProduct,
    selectedProductLabel,
    monthlyStats,
    monthlyLoading,
    showMonthlyReject,
    setShowMonthlyReject,
    allData,
    cpOptions,
    monthlyCpFilter,
    setMonthlyCpFilter,
    analysisStartDate,
    setAnalysisStartDate,
    analysisEndDate,
    setAnalysisEndDate,
}: MonthlyAnalysisViewProps) {
    // State for filters and modal
    const [logCpFilter, setLogCpFilter] = useState('C');
    const [logKilnFilter, setLogKilnFilter] = useState('ALL');
    const [selectedRow, setSelectedRow] = useState<GroupedRow | null>(null);
    const processedKilnData = useMemo(() => {
        if (!monthlyStats) return [];
        const map = new Map<string, { qtyp: number; qtycomp: number; qtyscrp: number; qtyrjct: number }>();

        monthlyStats.months.forEach(m => {
            m.kilns.forEach(k => {
                if (!map.has(k.m_kiln)) {
                    map.set(k.m_kiln, { qtyp: 0, qtycomp: 0, qtyscrp: 0, qtyrjct: 0 });
                }
                const v = map.get(k.m_kiln)!;
                v.qtyp += k.qtyp;
                v.qtycomp += k.qtycomp;
                v.qtyscrp += k.qtyscrp;
                v.qtyrjct += k.qtyrjct;
            });
        });

        return Array.from(map.entries()).map(([name, v]) => {
            const total = v.qtyp || 1;
            return {
                name,
                pctComp: (v.qtycomp / total) * 100,
                pctScrap: (v.qtyscrp / total) * 100,
                pctReject: (v.qtyrjct / total) * 100,
                ...v
            };
        }).sort((a, b) => {
            if (b.qtyp !== a.qtyp) return b.qtyp - a.qtyp;
            return b.pctComp - a.pctComp;
        });
    }, [monthlyStats]);

    const parsedProduct = useMemo(() => parseAnalysisProduct(selectedProduct), [selectedProduct]);
    const isDwStyle = parsedProduct.kind === 'dw' || parsedProduct.kind === 'og';
    const dwDesc1 = parsedProduct.pt_desc1;
    const dwDesc2 = parsedProduct.pt_desc2;

    // Get kiln options for filter
    const kilnOptions = useMemo(() => {
        if (!allData || !selectedProduct) return ['ALL'];
        const kilns = new Set<string>();
        allData
            .filter((item) => matchesSelectedProduct(item, selectedProduct))
            .forEach((item) => {
                if (item.m_kiln) kilns.add(item.m_kiln);
            });
        return ['ALL', ...Array.from(kilns).sort()];
    }, [allData, selectedProduct]);

    // Filter data for the selected product's m_desc (pt_desc1) with additional filters
    const filteredProductData = useMemo(() => {
        if (!allData || !selectedProduct) return [];

        const grouped = new Map<string, GroupedRow>();

        allData
            .filter((item) => {
                if (!matchesSelectedProduct(item, selectedProduct)) return false;
                const filterCp = isSomboonCpC(item) ? 'C1' : item.m_cp;
                if (logCpFilter !== 'ALL' && filterCp !== logCpFilter) return false;
                if (logKilnFilter !== 'ALL' && item.m_kiln !== logKilnFilter) return false;
                return true;
            })
            .forEach((item) => {
                const dateStr = item.m_date.split('T')[0];
                const displayCp = isSomboonCpC(item) ? 'C1' : item.m_cp;
                const key = `${item.m_doc}-${item.m_job}-${dateStr}-${item.m_kiln}-${displayCp}`;

                if (!grouped.has(key)) {
                    grouped.set(key, {
                        ...item, m_cp: displayCp,
                        cdReasons: new Map<string, number>(),
                        pjReasons: new Map<string, number>(),
                        totalScrap: item.qtyscrp || 0,
                        totalReject: item.qtyrjct || 0
                    });
                }
                const g = grouped.get(key)!;

                if (item.rsn_desc) {
                    if (isC1SpecialReasonForRecord(item)) {
                        g.qtycomp += (item.sub_qty || 0);
                        g.totalReject = Math.max(0, g.totalReject - (item.sub_qty || 0));
                    } else if (isScrapSubTyp(item.sub_typ)) {
                        g.cdReasons.set(item.rsn_desc, (g.cdReasons.get(item.rsn_desc) || 0) + (item.sub_qty || 0));
                    } else if (isRejectSubTyp(item.sub_typ)) {
                        g.pjReasons.set(item.rsn_desc, (g.pjReasons.get(item.rsn_desc) || 0) + (item.sub_qty || 0));
                    }
                }
            });

        return Array.from(grouped.values())
            .sort((a, b) => {
                const dateA = new Date(a.m_date).getTime();
                const dateB = new Date(b.m_date).getTime();
                return dateB - dateA;
            });
    }, [allData, selectedProduct, logCpFilter, logKilnFilter]);

    // Build per-reason kiln breakdown from allData for Top2 kiln display
    // Map: month (YYYY-MM) → rsn_desc → m_kiln → qty
    const kilnReasonMap = useMemo(() => {
        const map = new Map<string, Map<string, Map<string, number>>>();
        if (!allData || !selectedProduct) return map;
        allData
            .filter((item) =>
                matchesSelectedProduct(item, selectedProduct) &&
                item.rsn_desc &&
                isDefectReasonSubTyp(item.sub_typ),
            )
            .forEach((item) => {
                const month = item.m_date.split('T')[0].slice(0, 7); // YYYY-MM
                const rsn = (item.rsn_desc || '').trim();
                const kiln = item.m_kiln || 'Unknown';
                const qty = item.sub_qty || 0;
                if (!map.has(month)) map.set(month, new Map());
                const rsnMap = map.get(month)!;
                if (!rsnMap.has(rsn)) rsnMap.set(rsn, new Map());
                const kilnMap = rsnMap.get(rsn)!;
                kilnMap.set(kiln, (kilnMap.get(kiln) || 0) + qty);
            });
        return map;
    }, [allData, selectedProduct]);

    return (
        <div className="animate-in fade-in duration-500 space-y-6">
            <CodewareStickyTitle
                theme={theme}
                kicker="Monthly Analysis"
                title={isDwStyle ? dwDesc1 : (selectedProductLabel || 'Select a Product')}
                subtitle={isDwStyle ? dwDesc2 : undefined}
            />
            {/* Header Controls */}
            <div className={`${theme.cardBg} border ${theme.borderColor} p-4 sm:p-6 rounded-2xl shadow-lg`}>
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 w-full">
                        <div className={`flex items-center gap-2 px-3 py-2 ${theme.inputBg} rounded-xl border ${theme.borderColor}`}>
                            <span className={`text-xs font-bold ${theme.textMuted}`}>CP:</span>
                            <select
                                value={monthlyCpFilter}
                                onChange={(e) => setMonthlyCpFilter(e.target.value)}
                                className={`bg-transparent outline-none text-xs font-bold ${theme.textWhite} cursor-pointer`}
                                title="MA CP filter"
                            >
                                {cpOptions.map((cp) => (
                                    <option key={cp} value={cp} className={currentTheme === "dark" ? "bg-[#141414]" : "bg-white"}>{cp}</option>
                                ))}
                            </select>
                        </div>
                        <div className={`flex items-center gap-2 px-3 py-2 ${theme.inputBg} rounded-xl border ${theme.borderColor}`}>
                            <span className={`text-xs font-bold ${theme.textMuted}`}>From:</span>
                            <input
                                type="date"
                                value={analysisStartDate}
                                onChange={(e) => setAnalysisStartDate(e.target.value)}
                                style={{ colorScheme: currentTheme }}
                                className={`bg-transparent outline-none text-xs font-bold ${theme.textWhite} cursor-pointer`}
                                title="MA Start Date"
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
                                title="Analysis end date (synced with Product Analysis)"
                            />
                        </div>
                    </div>
                    {selectedProduct && monthlyLoading && !monthlyStats && (
                        <p className={`text-xs font-bold ${theme.textMuted} animate-pulse`}>Updating…</p>
                    )}
                </div>
            </div>

            {monthlyStats && (
                <>
                    {/* Section 1: Top Row - Monthly Trend & Compare by Kiln */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Monthly Performance Trends */}
                        <div className={`${theme.cardBg} border ${theme.borderColor} p-4 sm:p-6 rounded-2xl shadow-lg min-w-0`}>
                            <SectionHeader title="Monthly Performance Trends" subtitle="% Completed vs % Scrap vs % Reject" theme={theme} />
                            <div className="h-[260px] sm:h-[320px] md:h-[400px] w-full min-w-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={monthlyStats.months} margin={{ top: 20, right: 30, left: 10, bottom: 5 }} stackOffset="expand">
                                        <defs>
                                            <linearGradient id="colorComp" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorScrap" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorReject" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke={currentTheme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} vertical={false} />
                                        <XAxis
                                            dataKey="label"
                                            tick={{ fill: currentTheme === "dark" ? "#9ca3af" : "#6b7280", fontSize: 11 }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            tick={{ fill: currentTheme === "dark" ? "#9ca3af" : "#6b7280", fontSize: 11 }}
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={(val) => `${(val * 100).toFixed(0)}%`}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: currentTheme === "dark" ? "#141414" : "#fff", borderColor: theme.borderColor, borderRadius: "12px" }}
                                            itemStyle={{ fontSize: "12px", fontWeight: "bold" }}
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            formatter={(value: any, name: any, item: any) => {
                                                const total = item.payload.metrics.totalQtyp || 1;
                                                const pct = (Number(value) / total) * 100;
                                                return [`${Number(value).toLocaleString()} (${pct.toFixed(1)}%)`, name];
                                            }}
                                            labelStyle={{ color: currentTheme === "dark" ? "#fff" : "#000" }}
                                        />
                                        <Legend />
                                        <Area type="monotone" dataKey="metrics.totalScrap" stackId="1" stroke="#ef4444" fill="url(#colorScrap)" name="Scrap" />
                                        <Area type="monotone" dataKey="metrics.totalReject" stackId="1" stroke="#f97316" fill="url(#colorReject)" name="Reject" />
                                        <Area type="monotone" dataKey="metrics.totalQtycomp" stackId="1" stroke="#22c55e" fill="url(#colorComp)" name="Good" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Comparison by Kiln */}
                        <div className={`${theme.cardBg} border ${theme.borderColor} p-4 sm:p-6 rounded-2xl shadow-lg min-w-0`}>
                            <SectionHeader title="Comparison by Kiln" subtitle="Good vs Scrap vs Reject" theme={theme} />
                            <div className="h-[260px] sm:h-[320px] md:h-[400px] w-full min-w-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={processedKilnData.filter(item => item.name !== 'REWORK')} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }} stackOffset="expand">
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={currentTheme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
                                        <XAxis
                                            type="number"
                                            tick={{ fill: currentTheme === "dark" ? "#9ca3af" : "#6b7280", fontSize: 10 }}
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={(val) => `${(val * 100).toFixed(0)}%`}
                                        />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            tick={{ fill: currentTheme === "dark" ? "#fff" : "#000", fontSize: 11, fontWeight: 'bold' }}
                                            axisLine={false}
                                            tickLine={false}
                                            width={100}
                                        />
                                        <Tooltip
                                            cursor={{ fill: 'transparent' }}
                                            contentStyle={{ backgroundColor: currentTheme === "dark" ? "#141414" : "#fff", borderColor: theme.borderColor, borderRadius: "12px" }}
                                            itemStyle={{ fontSize: "12px", fontWeight: "bold" }}
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            formatter={(value: any, name: any, item: any) => {
                                                const total = item.payload.qtyp;
                                                const rawVal =
                                                    name === 'Scrap' ? item.payload.qtyscrp :
                                                        name === 'Reject' ? item.payload.qtyrjct :
                                                            item.payload.qtycomp;
                                                const pct = total > 0 ? (rawVal / total) * 100 : 0;
                                                return [`${rawVal.toLocaleString()} (${pct.toFixed(1)}%)`, name];
                                            }}
                                        />
                                        <Legend />
                                        <Bar dataKey="qtyscrp" name="Scrap" fill="#ef4444" stackId="a" barSize={32}>
                                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                            <LabelList dataKey="pctScrap" position="center" formatter={(v: any) => Number(v) > 5 ? `${Number(v).toFixed(1)}%` : ''} fill="white" style={{ fontSize: '10px', fontWeight: 'bold' }} />
                                        </Bar>
                                        <Bar dataKey="qtyrjct" name="Reject" fill="#f97316" stackId="a" barSize={32}>
                                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                            <LabelList dataKey="pctReject" position="center" formatter={(v: any) => Number(v) > 5 ? `${Number(v).toFixed(1)}%` : ''} fill="white" style={{ fontSize: '10px', fontWeight: 'bold' }} />
                                        </Bar>
                                        <Bar dataKey="qtycomp" name="Good" fill="#22c55e" stackId="a" radius={[0, 4, 4, 0]} barSize={32}>
                                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                            <LabelList dataKey="pctComp" position="center" formatter={(v: any) => Number(v) > 5 ? `${Number(v).toFixed(1)}%` : ''} fill="white" style={{ fontSize: '10px', fontWeight: 'bold' }} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Bottom Row - YTD Defect (70%) & Top 3 Defect (30%) */}
                    <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
                        {/* YTD Defect Trend Chart - 70% */}
                        <div className={`${theme.cardBg} border ${theme.borderColor} p-4 rounded-2xl shadow-lg lg:col-span-7`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                                <div>
                                    <SectionHeader title="Pareto Analysis" subtitle="80/20 Rule - Vital Few Defects" theme={theme} />
                                </div>
                                <button
                                    onClick={() => setShowMonthlyReject(!showMonthlyReject)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-2 ${showMonthlyReject
                                        ? 'bg-orange-500/10 text-orange-400 border-orange-500 hover:bg-orange-500/20'
                                        : 'bg-red-500/10 text-red-500 border-red-500 hover:bg-red-500/20'
                                        }`}
                                >
                                    {showMonthlyReject ? <AlertCircle size={14} /> : <XCircle size={14} />}
                                    Switch to {showMonthlyReject ? 'Scrap' : 'Reject'}
                                </button>
                            </div>
                            <div className="h-[260px] sm:h-[320px] md:h-[400px] w-full min-w-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={(() => {
                                        // Calculate Pareto data
                                        const allDefects = new Map<string, number>();
                                        monthlyStats.months.forEach(m => {
                                            const topData = showMonthlyReject ? m.topReject : m.topScrap;
                                            topData.forEach(r => {
                                                const current = allDefects.get(r.rsn_desc) || 0;
                                                allDefects.set(r.rsn_desc, current + r.qty);
                                            });
                                        });
                                        
                                        const sortedDefects = Array.from(allDefects.entries())
                                            .sort((a, b) => b[1] - a[1])
                                            .slice(0, 10); // Top 10 defects for Pareto
                                        
                                        const total = sortedDefects.reduce((sum, [_, qty]) => sum + qty, 0);
                                        let cumulative = 0;
                                        
                                        return sortedDefects.map(([name, qty], index) => {
                                            cumulative += qty;
                                            const cumulativePercent = (cumulative / total) * 100;
                                            return {
                                                name: name,
                                                fullName: name,
                                                quantity: qty,
                                                cumulative: cumulativePercent,
                                                index: index + 1
                                            };
                                        });
                                    })()} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                                        <defs>
                                            {/* Scrap gradients - Red theme */}
                                            <linearGradient id="scrapGradientHigh" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#dc2626" stopOpacity={0.95} />
                                                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.4} />
                                            </linearGradient>
                                            <linearGradient id="scrapGradientMedium" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
                                                <stop offset="100%" stopColor="#f87171" stopOpacity={0.3} />
                                            </linearGradient>
                                            <linearGradient id="scrapGradientLow" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#f87171" stopOpacity={0.85} />
                                                <stop offset="100%" stopColor="#fca5a5" stopOpacity={0.25} />
                                            </linearGradient>
                                            
                                            {/* Reject gradients - Dark Orange theme */}
                                            <linearGradient id="rejectGradientHigh" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#ea580c" stopOpacity={0.95} />
                                                <stop offset="100%" stopColor="#f97316" stopOpacity={0.4} />
                                            </linearGradient>
                                            <linearGradient id="rejectGradientMedium" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#f97316" stopOpacity={0.9} />
                                                <stop offset="100%" stopColor="#fb923c" stopOpacity={0.3} />
                                            </linearGradient>
                                            <linearGradient id="rejectGradientLow" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#fb923c" stopOpacity={0.85} />
                                                <stop offset="100%" stopColor="#fed7aa" stopOpacity={0.25} />
                                            </linearGradient>
                                            
                                            {/* Blue line gradient */}
                                            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor={SKIN_ACCENT} stopOpacity={0.9} />
                                                <stop offset="100%" stopColor={SKIN_ACCENT_TEXT} stopOpacity={0.9} />
                                            </linearGradient>
                                            {/* Subtle shadow effect */}
                                            <filter id="subtleShadow">
                                                <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity={currentTheme === "dark" ? "0.2" : "0.1"}/>
                                            </filter>
                                        </defs>
                                        <CartesianGrid 
                                            strokeDasharray="3 3" 
                                            stroke={currentTheme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"} 
                                            vertical={false}
                                        />
                                        <XAxis 
                                            dataKey="name"
                                            tick={{ 
                                                fill: currentTheme === "dark" ? "#f3f4f6" : "#1f2937", 
                                                fontSize: 11, 
                                                fontWeight: 400,
                                                textAnchor: 'end'
                                            }}
                                            axisLine={{ stroke: currentTheme === "dark" ? "#4b5563" : "#9ca3af" }}
                                            tickLine={false}
                                            height={120}
                                            interval={0}
                                            angle={-45}
                                        />
                                        <YAxis 
                                            yAxisId="left"
                                            tick={{ 
                                                fill: currentTheme === "dark" ? "#9ca3af" : "#6b7280", 
                                                fontSize: 11,
                                                fontWeight: 400
                                            }}
                                            axisLine={{ stroke: currentTheme === "dark" ? "#374151" : "#d1d5db" }}
                                            tickLine={false}
                                            label={{ 
                                                value: 'Quantity', 
                                                angle: -90, 
                                                position: 'insideLeft', 
                                                style: { 
                                                    fill: currentTheme === "dark" ? "#6b7280" : "#4b5563", 
                                                    fontSize: 12,
                                                    fontWeight: '500'
                                                } 
                                            }}
                                        />
                                        <YAxis 
                                            yAxisId="right"
                                            orientation="right"
                                            tick={{ 
                                                fill: currentTheme === "dark" ? "#9ca3af" : "#6b7280", 
                                                fontSize: 11,
                                                fontWeight: 400
                                            }}
                                            axisLine={{ stroke: currentTheme === "dark" ? "#374151" : "#d1d5db" }}
                                            tickLine={false}
                                            tickFormatter={(value) => `${value}%`}
                                            label={{ 
                                                value: 'Cumulative %', 
                                                angle: 90, 
                                                position: 'insideRight', 
                                                style: { 
                                                    fill: currentTheme === "dark" ? "#9ca3af" : "#6b7280", 
                                                    fontSize: 12,
                                                    fontWeight: '500'
                                                } 
                                            }}
                                        />
                                        <Tooltip
                                            contentStyle={{ 
                                                backgroundColor: currentTheme === "dark" ? "#1f2937" : "#ffffff", 
                                                borderColor: currentTheme === "dark" ? "#374151" : "#e5e7eb", 
                                                borderRadius: "8px",
                                                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                                                padding: "8px"
                                            }}
                                            itemStyle={{ fontSize: "11px", fontWeight: "400" }}
                                            labelStyle={{ 
                                                color: currentTheme === "dark" ? "#f3f4f6" : "#111827",
                                                fontWeight: "500",
                                                marginBottom: "2px"
                                            }}
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            formatter={(value: any, name: any, payload: any) => {
                                                if (name === 'quantity') {
                                                    return [
                                                        <span style={{ color: currentTheme === "dark" ? "#6b7280" : "#374151", fontWeight: "500" }}>
                                                            {Number(value).toLocaleString()} pcs
                                                        </span>, 
                                                        'Quantity'
                                                    ];
                                                } else if (name === 'cumulative') {
                                                    return [
                                                        <span style={{ color: SKIN_ACCENT, fontWeight: "500" }}>
                                                            {Number(value).toFixed(2)}%
                                                        </span>, 
                                                        'Cumulative %'
                                                    ];
                                                }
                                                return [value, name];
                                            }}
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            labelFormatter={(label: any, payload: any) => {
                                                return payload?.payload?.fullName || label;
                                            }}
                                        />
                                        <Legend 
                                            wrapperStyle={{ 
                                                fontSize: "11px",
                                                paddingTop: "16px"
                                            }}
                                            iconType="rect"
                                        />
                                        <Bar 
                                            yAxisId="left"
                                            dataKey="quantity" 
                                            fill="url(#scrapGradientHigh)" 
                                            name="Quantity"
                                            radius={[4, 4, 0, 0]}
                                            maxBarSize={50}
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            shape={(props: any) => {
                                                const { x, y, width, height, payload } = props;
                                                const quantity = payload?.quantity || 0;
                                                const isReject = showMonthlyReject;
                                                
                                                // Determine gradient based on quantity and type
                                                let gradientId;
                                                if (isReject) {
                                                    // Reject gradients - Dark Orange theme
                                                    if (quantity >= 1000) gradientId = "rejectGradientHigh";
                                                    else if (quantity >= 500) gradientId = "rejectGradientMedium";
                                                    else gradientId = "rejectGradientLow";
                                                } else {
                                                    // Scrap gradients - Red theme
                                                    if (quantity >= 1000) gradientId = "scrapGradientHigh";
                                                    else if (quantity >= 500) gradientId = "scrapGradientMedium";
                                                    else gradientId = "scrapGradientLow";
                                                }
                                                
                                                return (
                                                    <g>
                                                        <rect
                                                            x={x}
                                                            y={y}
                                                            width={width}
                                                            height={height}
                                                            fill={`url(#${gradientId})`}
                                                            rx={4}
                                                            ry={0}
                                                        />
                                                    </g>
                                                );
                                            }}
                                        />
                                        <Line 
                                            yAxisId="right"
                                            type="monotone" 
                                            dataKey="cumulative" 
                                            stroke="url(#lineGradient)" 
                                            strokeWidth={2}
                                            dot={{ 
                                                fill: SKIN_ACCENT, 
                                                r: 4,
                                                stroke: currentTheme === "dark" ? "#1f2937" : "#ffffff",
                                                strokeWidth: 1
                                            }}
                                            activeDot={{ 
                                                r: 5,
                                                fill: SKIN_ACCENT_TEXT,
                                                stroke: currentTheme === "dark" ? "#1f2937" : "#ffffff",
                                                strokeWidth: 2
                                            }}
                                            name="Cumulative %"
                                            filter="url(#subtleShadow)"
                                        />
                                        {/* Minimal 80% reference line */}
                                        <ReferenceLine 
                                            yAxisId="right"
                                            y={80} 
                                            stroke={SKIN_ACCENT} 
                                            strokeDasharray="6 3" 
                                            strokeWidth={1.5}
                                            label={{ 
                                                value: "80%", 
                                                position: "left", 
                                                fill: SKIN_ACCENT, 
                                                fontSize: 10,
                                                fontWeight: "500"
                                            }}
                                        />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Top 3 Reasons Card - 30% */}
                        <div className={`${theme.cardBg} border ${theme.borderColor} p-4 rounded-2xl shadow-lg lg:col-span-3`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                                <div>
                                    <h2 className={`text-lg font-bold ${theme.textWhite}`}>
                                        Top 3 {showMonthlyReject ? 'Reject' : 'Scrap'} Reasons
                                    </h2>
                                    <p className={`${theme.textMuted} text-xs mt-1`}>Accumulated by Month</p>
                                </div>
                                <button
                                    onClick={() => setShowMonthlyReject(!showMonthlyReject)}
                                    className={`px-2 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 ${showMonthlyReject
                                        ? 'bg-orange-500/10 text-orange-400 border-orange-500 hover:bg-orange-500/20'
                                        : 'bg-red-500/10 text-red-500 border-red-500 hover:bg-red-500/20'
                                        }`}
                                >
                                    {showMonthlyReject ? <AlertCircle size={12} /> : <XCircle size={12} />}
                                    Switch to {showMonthlyReject ? 'Scrap' : 'Reject'}
                                </button>
                            </div>

                            <div className="h-[280px] sm:h-[350px] md:h-[400px] overflow-y-auto pr-2">
                                {[...monthlyStats.months].reverse().map((m, idx) => {
                                    const topData = showMonthlyReject ? m.topReject : m.topScrap;
                                    const totalForRate = showMonthlyReject ? m.metrics.totalReject : m.metrics.totalScrap;
                                    const textClass = showMonthlyReject ? 'text-orange-400' : 'text-red-500';
                                    const monthRsnMap = kilnReasonMap.get(m.month);

                                    return (
                                        <div key={idx} className="mb-4 last:mb-0">
                                            <h4 className={`text-xs font-bold ${theme.textWhite} mb-1 sticky top-0 ${theme.cardBg} py-1 z-10`}>{m.label}</h4>
                                            <div className="space-y-1">
                                                {topData.length > 0 ? topData.slice(0, 3).map((r, i) => {
                                                    const percent = totalForRate > 0 ? (r.qty / totalForRate) * 100 : 0;
                                                    // All kilns for this reason this month
                                                    const kilnEntries = monthRsnMap?.get(r.rsn_desc.trim());
                                                    const allKilns = kilnEntries
                                                        ? Array.from(kilnEntries.entries())
                                                            .sort((a, b) => b[1] - a[1])
                                                        : [];
                                                    
                                                    return (
                                                        <div key={i} className="space-y-0.5">
                                                            <div 
                                                                className="flex items-center justify-between text-xs cursor-pointer hover:bg-gray-500/10 p-1 rounded transition-colors"
                                                                onClick={() => {
                                                                    // Toggle kiln display for this reason
                                                                    const element = document.getElementById(`kilns-${m.month}-${i}`);
                                                                    if (element) {
                                                                        element.classList.toggle('hidden');
                                                                    }
                                                                }}
                                                            >
                                                                <span className={`${theme.textMuted} truncate flex-1 pr-2`} title={r.rsn_desc}>
                                                                    <span className={`font-bold ${textClass} mr-1`}>{i + 1}.</span>{r.rsn_desc}
                                                                </span>
                                                                <div className="flex items-center gap-1 font-mono font-bold shrink-0">
                                                                    <span className={`${textClass} text-xs`}>{r.qty.toLocaleString()}</span>
                                                                    <span className={`text-[9px] ${textClass} opacity-80`}>({percent.toFixed(1)}%)</span>
                                                                </div>
                                                            </div>
                                                            {allKilns.length > 0 && (
                                                                <div id={`kilns-${m.month}-${i}`} className="hidden pl-3 pr-2 pb-1">
                                                                    <div className="text-xs font-bold text-gray-400 mb-0.5">Kiln Breakdown:</div>
                                                                    <div className="flex flex-wrap gap-0.5">
                                                                        {allKilns.map(([kiln, qty]) => {
                                                                            const kilnPct = r.qty > 0 ? (qty / r.qty) * 100 : 0;
                                                                            return (
                                                                                <span key={kiln} className={`inline-flex items-center gap-0.5 text-[9px] font-mono px-1 py-0.5 rounded ${theme.badgeBg} border ${theme.badgeBorder}`}>
                                                                                    <span className={`font-bold ${theme.accentText}`}>{kiln}</span>
                                                                                    <span className={theme.textMuted}>{qty.toLocaleString()}</span>
                                                                                    <span className={`${textClass} opacity-80`}>({kilnPct.toFixed(0)}%)</span>
                                                                                </span>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                }) : <p className={`text-xs ${theme.textMuted} italic`}>No data recorded</p>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Data Sorting Log - Filtered by Selected Product */}
                    <div className={`${theme.cardBg} border ${theme.borderColor} p-4 sm:p-6 rounded-2xl shadow-lg`}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 sm:mb-6 gap-4">
                            <SectionHeader title="Data Sorting Log" subtitle={`Filtered by ${selectedProductLabel}`} theme={theme} />
                            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                                <div className={`flex items-center gap-2 px-3 py-2 ${theme.inputBg} rounded-xl border ${theme.borderColor}`}>
                                    <span className={`text-xs font-bold ${theme.textMuted}`}>CP:</span>
                                    <select
                                        value={logCpFilter}
                                        onChange={(e) => setLogCpFilter(e.target.value)}
                                        className={`bg-transparent outline-none text-xs font-bold ${theme.textWhite} cursor-pointer`}
                                        title="Control Point Filter"
                                    >
                                        {cpOptions.map(cp => <option key={cp} value={cp} className={currentTheme === "dark" ? "bg-[#141414]" : "bg-white"}>{cp}</option>)}
                                    </select>
                                </div>
                                <div className={`flex items-center gap-2 px-3 py-2 ${theme.inputBg} rounded-xl border ${theme.borderColor}`}>
                                    <span className={`text-xs font-bold ${theme.textMuted}`}>Kiln:</span>
                                    <select
                                        value={logKilnFilter}
                                        onChange={(e) => setLogKilnFilter(e.target.value)}
                                        className={`bg-transparent outline-none text-xs font-bold ${theme.textWhite} cursor-pointer`}
                                        title="Kiln Filter"
                                    >
                                        {kilnOptions.map(kiln => <option key={kiln} value={kiln} className={currentTheme === "dark" ? "bg-[#141414]" : "bg-white"}>{kiln}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <div className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl transition-all`}>
                            <ResponsiveSortingLog
                                rows={filteredProductData}
                                theme={theme}
                                currentTheme={currentTheme}
                                onRowClick={setSelectedRow}
                                emptyMessage="No sorting activity found for this product."
                                scrollClassName="max-h-[min(600px,70vh)]"
                            />
                        </div>
                    </div>

                    {/* Daily Detail Modal */}
                    {selectedRow && (
                        <DailyDetailModal
                            row={selectedRow}
                            theme={theme}
                            currentTheme={currentTheme}
                            onClose={() => setSelectedRow(null)}
                        />
                    )}
                </>
            )}
        </div>
    );
}
