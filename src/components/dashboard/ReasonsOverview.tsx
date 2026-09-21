"use client";

import { useEffect, useMemo, useState, type ReactElement } from 'react';
import {
    Bar,
    CartesianGrid,
    Cell,
    ComposedChart,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    LabelList,
    type LabelProps,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { Maximize2, Minimize2, RefreshCw } from 'lucide-react';
import type { Theme, ThemeName } from '@/lib/themes';
import {
    REASONS_PARETO_OTHER,
    REASONS_PARETO_CHART_N,
    REASONS_TONE_COLOR,
    formatReasonsYearLabel,
    isYearCompareKey,
    paretoTopItems,
    type ReasonsFocusTone,
    type ReasonsKind,
    type ReasonsNamedTrend,
    type ReasonsOverviewCard,
    type ReasonsOverviewResponse,
    type ReasonsOverviewTopItem,
    type ReasonsYearStat,
} from '@/lib/reasons';

const SCRAP_COLOR = '#ef4444';
const REJECT_COLOR = '#f97316';
const ORIGIN_COLOR: Record<string, string> = {
    WW: '#0d9488',
    DW: '#d97706',
    'WW+DW': '#64748b',
    White: '#0d9488',
    Black: '#db2777',
    Inglaze: '#d97706',
    Onglaze: '#9333ea',
    'White+Black': '#0d9488',
    'Inglaze+Onglaze': '#d97706',
};

function originColor(label?: string): string | undefined {
    if (!label) return undefined;
    if (ORIGIN_COLOR[label]) return ORIGIN_COLOR[label];
    const parts = label.split('+');
    const families = new Set(parts.map((part) => {
        if (part === 'White' || part === 'Black' || part === 'WW') return 'WW';
        if (part === 'Inglaze' || part === 'Onglaze' || part === 'DW') return 'DW';
        return '';
    }).filter(Boolean));
    if (families.size === 1) return ORIGIN_COLOR[[...families][0]];
    if (families.size > 1) return ORIGIN_COLOR['WW+DW'];
    return undefined;
}

function fmtQty(n: number): string {
    return Math.round(n).toLocaleString();
}

function fmtRate(n: number): string {
    if (!Number.isFinite(n) || n === 0) return '0%';
    return `${n >= 10 ? n.toFixed(1) : n.toFixed(2)}%`;
}

function ParetoAxisTick({
    x = 0,
    y = 0,
    payload,
    data,
    fill,
    fontSize,
    angle,
}: {
    x?: number;
    y?: number;
    payload?: { value?: number };
    data: { rsn: string; tick: string; other?: boolean }[];
    fill: string;
    fontSize: number;
    angle: number;
}) {
    const row = data[Number(payload?.value) - 1];
    const label = row?.tick || row?.rsn || '';
    if (!label) return <g />;
    const vertical = angle <= -80;
    return (
        <text
            x={x}
            y={vertical ? y + 6 : y}
            fill={fill}
            fontSize={fontSize}
            fontWeight={600}
            textAnchor={vertical ? 'start' : 'end'}
            dominantBaseline={vertical ? 'middle' : 'hanging'}
            transform={`rotate(${vertical ? 90 : angle} ${x} ${vertical ? y + 6 : y})`}
            style={{ fontFamily: 'ui-sans-serif, system-ui, "Segoe UI", Tahoma, sans-serif' }}
        >
            <title>{row.rsn}</title>
            {label}
        </text>
    );
}

function namedTopItems(items: ReasonsOverviewTopItem[]) {
    return items.filter((item) => !item.other).slice(0, 10);
}

function seriesTooltipLabel(dataKey: string, name?: string): string {
    if (dataKey === 'cum' || name === 'Cum') return 'Cumulative %';
    if (dataKey === 'qty' || name === 'Qty') return 'Quantity';
    if (dataKey === 'share') return 'Share';
    if (dataKey === 'rate' || dataKey === 'pct') return 'Rate';
    if (dataKey === 'origin') return 'Category';
    return name || dataKey;
}

function RateBarLabel(props: LabelProps): ReactElement {
    const value = Number(props.value);
    if (!Number.isFinite(value)) return <g />;
    return (
        <text
            x={Number(props.x || 0) + Number(props.width || 0) / 2}
            y={Number(props.y || 0) - 4}
            textAnchor="middle"
            fontSize={10}
            fontWeight={700}
            fill="#64748b"
        >
            {fmtRate(value)}
        </text>
    );
}

function OriginBarLabel(props: LabelProps): ReactElement {
    const label = String(props.value || '');
    if (!label || label === 'undefined') return <g />;
    return (
        <text
            x={Number(props.x || 0) + Number(props.width || 0) / 2}
            y={Number(props.y || 0) - 4}
            textAnchor="middle"
            fontSize={label.includes('+') || label.length > 6 ? 8 : 9}
            fontWeight={700}
            fill={originColor(label) || '#64748b'}
        >
            {label}
        </text>
    );
}

function OverviewTooltip({
    active,
    payload,
    currentTheme,
}: {
    active?: boolean;
    payload?: { name?: string; value?: number; color?: string; dataKey?: string }[];
    currentTheme: ThemeName;
}) {
    if (!active || !payload?.length) return null;
    const bg = currentTheme === 'dark' ? '#141414' : '#ffffff';
    const border = currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    const ink = currentTheme === 'dark' ? '#fafafa' : '#18181b';
    const row = (payload[0] as { payload?: { label?: string; rsn?: string; origin?: string; share?: number; rate?: number; qty?: number; pct?: number } })?.payload;
    const label = row?.rsn || row?.label;
    return (
        <div className="rounded-xl px-3 py-2 text-xs shadow-lg min-w-[10rem]" style={{ background: bg, border: `1px solid ${border}`, color: ink }}>
            {label && (
                <p className="font-bold mb-1 leading-snug">
                    {label}{row?.origin ? ` · ${row.origin}` : ''}
                </p>
            )}
            {payload.map((entry) => {
                const key = String(entry.dataKey || '');
                const asRate = key === 'rate' || key === 'pct' || key === 'share' || key === 'cum'
                    || key.endsWith('_pct')
                    || isYearCompareKey(key);
                return (
                    <p key={key} className="tabular-nums flex justify-between gap-4">
                        <span>{seriesTooltipLabel(key, entry.name)}</span>
                        <span>
                            {asRate
                                ? fmtRate(Number(entry.value) || 0)
                                : fmtQty(Number(entry.value) || 0)}
                        </span>
                    </p>
                );
            })}
            {row?.share != null && (
                <p className="tabular-nums flex justify-between gap-4">
                    <span>Share</span>
                    <span>{fmtRate(row.share)}</span>
                </p>
            )}
            {row?.rate != null && (
                <p className="tabular-nums flex justify-between gap-4">
                    <span>Rate</span>
                    <span>{fmtRate(row.rate)}</span>
                </p>
            )}
            {row?.qty != null && (
                <p className="tabular-nums flex justify-between gap-4">
                    <span>Quantity</span>
                    <span>{fmtQty(row.qty)}</span>
                </p>
            )}
        </div>
    );
}

function fmtSignedQty(n: number): string {
    const rounded = Math.round(n);
    if (rounded === 0) return '0';
    return `${rounded > 0 ? '+' : ''}${rounded.toLocaleString()}`;
}

function fmtSignedPp(n: number): string {
    if (!Number.isFinite(n) || Math.abs(n) < 0.05) return '0.0 pp';
    return `${n > 0 ? '+' : ''}${n.toFixed(1)} pp`;
}

function YearCompareKpis({
    theme,
    kindLabel,
    stats,
}: {
    theme: Theme;
    kindLabel: string;
    stats: ReasonsYearStat[];
}) {
    const latest = stats[0];
    const prev = stats[1];
    if (!latest || !prev) return null;
    const dQty = latest.qty - prev.qty;
    const dRate = latest.pct - prev.pct;
    return (
        <>
            <KpiCard
                theme={theme}
                label={`${latest.year} ${kindLabel}`}
                value={fmtQty(latest.qty)}
                hint={`${fmtQty(latest.qtyproc)} process`}
                color={latest.color}
            />
            <KpiCard
                theme={theme}
                label={`${latest.year} rate`}
                value={fmtRate(latest.pct)}
                hint={`Δ ${fmtSignedPp(dRate)} vs ${prev.year}`}
                color={latest.color}
            />
            <KpiCard
                theme={theme}
                label={`${prev.year} ${kindLabel} (ปีก่อน)`}
                value={fmtQty(prev.qty)}
                hint={`${fmtQty(prev.qtyproc)} process`}
                color={prev.color}
            />
            <KpiCard
                theme={theme}
                label={`${prev.year} rate (ปีก่อน)`}
                value={fmtRate(prev.pct)}
                hint={`Δ qty ${fmtSignedQty(dQty)}`}
                color={prev.color}
            />
        </>
    );
}

function KpiCard({
    theme,
    label,
    value,
    hint,
    color,
    className = '',
}: {
    theme: Theme;
    label: string;
    value: string;
    hint?: string;
    color: string;
    className?: string;
}) {
    return (
        <div className={`${theme.cardBg} border ${theme.borderColor} rounded-xl px-2.5 py-2 relative overflow-hidden flex-1 min-w-0 ${className}`}>
            <span className="absolute inset-x-0 top-0 h-0.5" style={{ background: color }} aria-hidden />
            <p className="text-[9px] font-bold uppercase tracking-wider truncate" style={{ color }}>{label}</p>
            <p className={`text-base sm:text-lg font-bold tabular-nums ${theme.textWhite} mt-0.5 leading-none`}>{value}</p>
            {hint && <p className={`text-[10px] ${theme.textMuted} mt-1 truncate`}>{hint}</p>}
        </div>
    );
}

function CategoryRatePie({
    theme,
    currentTheme,
    cards,
    kindLabel,
    onOpenTone,
}: {
    theme: Theme;
    currentTheme: ThemeName;
    cards: ReasonsOverviewCard[];
    kindLabel: string;
    onOpenTone: (tone: ReasonsFocusTone) => void;
}) {
    const data = cards
        .filter((card) => card.qty > 0)
        .map((card) => ({
            tone: card.tone,
            label: card.label,
            qty: card.qty,
            share: card.pct,
            rate: card.rate,
            color: REASONS_TONE_COLOR[card.tone],
        }));
    if (data.length === 0) return null;
    return (
        <div className={`${theme.cardBg} border ${theme.borderColor} rounded-xl px-2 py-1.5 flex items-center gap-2 flex-[1.35] min-w-[11rem]`}>
            <div className="h-14 w-14 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey="qty"
                            nameKey="label"
                            innerRadius={15}
                            outerRadius={24}
                            paddingAngle={1}
                            isAnimationActive={false}
                            stroke="none"
                            cursor="pointer"
                            onClick={(_, index) => {
                                const row = data[index];
                                if (row) onOpenTone(row.tone);
                            }}
                        >
                            {data.map((item) => (
                                <Cell key={item.tone} fill={item.color} />
                            ))}
                        </Pie>
                        <Tooltip content={<OverviewTooltip currentTheme={currentTheme} />} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="min-w-0 flex-1">
                <p className={`text-[9px] font-bold uppercase tracking-wider ${theme.textMuted} truncate`}>
                    {kindLabel} mix
                </p>
                <div className="mt-0.5 grid grid-cols-2 gap-x-2 gap-y-0.5">
                    {data.map((item) => (
                        <button
                            key={item.tone}
                            type="button"
                            onClick={() => onOpenTone(item.tone)}
                            className="flex items-center gap-1 min-w-0 text-left"
                            title={`${item.label} ${fmtRate(item.rate)} · ${fmtRate(item.share)} of ${kindLabel.toLowerCase()}`}
                        >
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: item.color }} />
                            <span className="text-[10px] font-semibold truncate" style={{ color: item.color }}>
                                {item.label}
                            </span>
                            <span className={`text-[10px] font-bold tabular-nums shrink-0 ${theme.textWhite}`}>
                                {fmtRate(item.rate)}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

function ParetoChart({
    theme,
    currentTheme,
    items,
    totalQty,
    barColor,
    onSelectRsn,
    height = 268,
    fitAll = false,
}: {
    theme: Theme;
    currentTheme: ThemeName;
    items: ReasonsOverviewTopItem[];
    totalQty: number;
    barColor: string;
    onSelectRsn: (rsn: string) => void;
    height?: number;
    fitAll?: boolean;
}) {
    const otherFill = currentTheme === 'dark' ? '#71717a' : '#a1a1aa';
    const tickFill = currentTheme === 'dark' ? '#ffffff' : '#111111';
    const gridStroke = currentTheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const data = useMemo(() => {
        const namedItems = items.filter((item) => !item.other);
        const lastNamedQty = namedItems[namedItems.length - 1]?.qty ?? 0;
        const plotItems = items.filter((item) => !item.other || item.qty < lastNamedQty);
        return plotItems.map((item, index) => ({
            rank: index + 1,
            rsn: item.rsn,
            tick: item.other && item.otherCount
                ? `Other (${item.otherCount})`
                : item.rsn,
            qty: item.qty,
            share: item.share ?? (totalQty > 0 ? (item.qty / totalQty) * 100 : 0),
            cum: item.cum ?? 0,
            other: Boolean(item.other),
            origin: item.other ? undefined : item.origin,
        }));
    }, [items, totalQty]);

    if (data.length === 0) {
        return <p className={`text-[11px] ${theme.textMuted} py-8 text-center`}>No defects</p>;
    }

    const origins = new Set(data.map((row) => row.origin).filter(Boolean));
    const colorByOrigin = origins.size > 1;
    const showOriginLabels = !fitAll && data.length <= 14;
    const minWidth = fitAll ? undefined : Math.max(data.length * 36, 280);
    const tickFont = fitAll
        ? (data.length > 110 ? 10 : data.length > 70 ? 11 : data.length > 40 ? 12 : 13)
        : (data.length > 110 ? 9 : data.length > 70 ? 10 : data.length > 40 ? 11 : 12);
    const labelAngle = fitAll ? -90 : -42;
    const longest = data.reduce((max, row) => Math.max(max, (row.rsn || '').length), 8);
    const axisHeight = fitAll
        ? Math.min(148, Math.max(64, Math.round(longest * tickFont * 0.55) + 12))
        : Math.min(132, Math.max(88, Math.round(longest * tickFont * 0.38) + 18));

    return (
        <div className={fitAll ? 'h-full min-h-0 w-full' : 'overflow-x-auto'}>
            <div
                style={fitAll ? { height: '100%', width: '100%', minHeight: 280 } : { minWidth, height }}
                className="w-full"
            >
        <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: fitAll ? 12 : 18, right: 8, left: 4, bottom: fitAll ? 2 : 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis
                    dataKey="rank"
                    interval={0}
                    height={axisHeight}
                    tickLine={false}
                    axisLine={false}
                    tick={(props) => (
                        <ParetoAxisTick
                            x={Number(props.x) || 0}
                            y={Number(props.y) || 0}
                            payload={props.payload}
                            data={data}
                            fill={tickFill}
                            fontSize={tickFont}
                            angle={labelAngle}
                        />
                    )}
                />
                <YAxis
                    yAxisId="qty"
                    tick={{ fill: tickFill, fontSize: 9 }}
                    tickFormatter={(n: number) => n >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n))}
                    width={30}
                    axisLine={false}
                    tickLine={false}
                />
                <YAxis
                    yAxisId="cum"
                    orientation="right"
                    domain={[0, 100]}
                    tick={{ fill: tickFill, fontSize: 9 }}
                    tickFormatter={(n: number) => `${Math.round(n)}%`}
                    width={30}
                    axisLine={false}
                    tickLine={false}
                />
                <Tooltip content={<OverviewTooltip currentTheme={currentTheme} />} />
                <ReferenceLine yAxisId="cum" y={80} stroke={barColor} strokeDasharray="4 4" strokeOpacity={0.45} />
                <Bar
                    yAxisId="qty"
                    dataKey="qty"
                    name="Quantity"
                    radius={[3, 3, 0, 0]}
                    cursor="pointer"
                    onClick={(item: { payload?: { rsn?: string; other?: boolean }; rsn?: string; other?: boolean }) => {
                        const row = item?.payload || item;
                        if (!row?.rsn || row.other || row.rsn === REASONS_PARETO_OTHER) return;
                        onSelectRsn(row.rsn);
                    }}
                >
                    {data.map((row) => (
                        <Cell
                            key={`${row.rank}-${row.rsn}`}
                            fill={row.other ? otherFill : (colorByOrigin ? (originColor(row.origin) || barColor) : barColor)}
                            fillOpacity={row.other ? 0.5 : 0.86}
                        />
                    ))}
                    {showOriginLabels && (
                    <LabelList dataKey="origin" position="top" content={OriginBarLabel} />
                    )}
                </Bar>
                <Line
                    yAxisId="cum"
                    type="monotone"
                    dataKey="cum"
                    name="Cumulative %"
                    stroke={currentTheme === 'dark' ? '#e4e4e7' : '#3f3f46'}
                    strokeWidth={data.length > 20 ? 1.2 : 1.8}
                    dot={data.length > 24 ? false : { r: 2.5, fill: currentTheme === 'dark' ? '#e4e4e7' : '#3f3f46' }}
                />
            </ComposedChart>
        </ResponsiveContainer>
            </div>
        </div>
    );
}

function CombinedPareto({
    theme,
    currentTheme,
    items,
    totalQty,
    barColor,
    family,
    view,
    onView,
    height,
    onSelectRsn,
}: {
    theme: Theme;
    currentTheme: ThemeName;
    items: ReasonsOverviewTopItem[];
    totalQty: number;
    barColor: string;
    family?: ReasonsOverviewResponse['meta']['family'];
    view: 'all' | 'top15';
    onView: (next: 'all' | 'top15') => void;
    height: number;
    onSelectRsn: (rsn: string) => void;
}) {
    const [fullscreen, setFullscreen] = useState(false);
    const originHint = family === 'ww'
        ? 'White / Black on each bar'
        : family === 'dw'
            ? 'Inglaze / Onglaze on each bar'
            : 'WW / DW on each bar';
    const namedCount = items.filter((item) => !item.other).length;
    const other = items.find((item) => item.other);
    const lastNamedQty = items.filter((item) => !item.other).at(-1)?.qty ?? 0;
    const otherOnChart = Boolean(other && other.qty < lastNamedQty);

    useEffect(() => {
        if (!fullscreen) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setFullscreen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [fullscreen]);

    return (
        <>
            {fullscreen && (
                <div
                    className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
                    onClick={() => setFullscreen(false)}
                />
            )}
            <div
                className={
                    fullscreen
                        ? `fixed inset-2 sm:inset-4 md:inset-8 z-[100] ${theme.cardBg} border ${theme.borderColor} rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col min-h-0 overflow-hidden`
                        : `${theme.cardBg} border ${theme.borderColor} rounded-xl overflow-hidden flex flex-col min-w-0`
                }
            >
                <div className="px-2.5 pt-2 pb-1 shrink-0">
                    <div className="flex items-center justify-between gap-2 min-h-[1.75rem] flex-nowrap">
                        <p className={`text-[9px] font-bold uppercase tracking-wide ${theme.textMuted} truncate min-w-0`}>
                            {view === 'top15' ? 'Pareto top 15 + Other' : 'Pareto · all defects'}
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
                        <div className={`flex items-center ${theme.inputBg} rounded-lg p-0.5 border ${theme.borderColor}`}>
                            {([
                                { value: 'all' as const, label: 'All defects' },
                                { value: 'top15' as const, label: 'Top 15 + Other' },
                            ]).map((option) => {
                                const active = view === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => onView(option.value)}
                                        className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                                            active ? 'text-white' : theme.textMuted
                                        }`}
                                        style={active ? { background: barColor } : undefined}
                                    >
                                        {option.label}
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            type="button"
                            onClick={() => setFullscreen((open) => !open)}
                            className={`p-1.5 rounded-lg ${theme.inputBg} border ${theme.borderColor} ${theme.textMuted}`}
                            title={fullscreen ? 'Exit fullscreen' : 'Fullscreen — show every bar'}
                        >
                            {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                        </button>
                    </div>
                    </div>
                    <p className={`text-[10px] ${theme.textMuted} mt-0.5 min-h-[1.25rem] leading-5 truncate`}>
                        Combined ranking · {originHint}
                        {view === 'all' && namedCount ? ` · ${namedCount.toLocaleString()} types` : ''}
                        {view === 'top15' && namedCount ? ` · ${namedCount.toLocaleString()} bars` : ''}
                        {view === 'top15' && other
                            ? ` · Other ${other.otherCount ? `${other.otherCount.toLocaleString()} types · ` : ''}${fmtQty(other.qty)} (${fmtRate(other.share || 0)})${otherOnChart ? '' : ' · grouped, not on chart'}`
                            : ''}
                        {fullscreen ? ' · fit all bars' : ''}
                    </p>
                </div>
                <div className={fullscreen ? 'flex-1 min-h-0 px-2 pb-2' : 'px-1 pb-1'}>
                    <ParetoChart
                        theme={theme}
                        currentTheme={currentTheme}
                        items={items}
                        totalQty={totalQty}
                        barColor={barColor}
                        height={height}
                        fitAll={fullscreen}
                        onSelectRsn={(rsn) => {
                            setFullscreen(false);
                            onSelectRsn(rsn);
                        }}
                    />
                </div>
            </div>
        </>
    );
}

function CombinedTop10({
    theme,
    items,
    totalQty,
    accent,
    layout = 'below',
    onSelectRsn,
}: {
    theme: Theme;
    items: ReasonsOverviewTopItem[];
    totalQty: number;
    accent: string;
    layout?: 'side' | 'below';
    onSelectRsn: (rsn: string) => void;
}) {
    const rows = namedTopItems(items);
    return (
        <div className={`${theme.cardBg} border ${theme.borderColor} rounded-xl overflow-hidden flex flex-col min-w-0 ${layout === 'side' ? 'min-h-[18rem]' : ''}`}>
            <div className="px-2.5 py-1.5">
                <p className={`text-[9px] font-bold uppercase tracking-wider ${theme.textMuted}`}>Top 10</p>
            </div>
            <div className={`px-1.5 pb-1.5 flex-1 ${layout === 'below' ? 'grid grid-cols-1 sm:grid-cols-2 gap-0.5' : 'space-y-0.5 overflow-y-auto'}`}>
                {rows.map((item, index) => {
                    const share = item.share ?? (totalQty > 0 ? (item.qty / totalQty) * 100 : 0);
                    return (
                        <button
                            key={item.rsn}
                            type="button"
                            onClick={() => onSelectRsn(item.rsn)}
                            className={`w-full flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg ${theme.inputBg} text-left ${theme.tableRowHover}`}
                        >
                            <span className={`text-[10px] font-bold ${theme.textMuted} w-4 shrink-0`}>{index + 1}</span>
                            <span className={`text-[11px] font-semibold ${theme.textWhite} truncate flex-1`}>
                                {item.rsn}
                                {item.toneOrigin ? (
                                    <span
                                        className="ml-1 text-[9px] font-bold"
                                        style={{ color: originColor(item.toneOrigin) }}
                                    >
                                        {item.toneOrigin}
                                    </span>
                                ) : null}
                            </span>
                            <span className={`text-[10px] tabular-nums ${theme.textMuted}`}>{fmtQty(item.qty)}</span>
                            <span className="text-[11px] font-bold tabular-nums shrink-0" style={{ color: accent }}>
                                {fmtRate(share)}
                            </span>
                        </button>
                    );
                })}
                {rows.length === 0 && (
                    <p className={`text-[11px] ${theme.textMuted} px-2 py-2`}>No defects</p>
                )}
            </div>
        </div>
    );
}

function OverallTrend({
    theme,
    currentTheme,
    cards,
    kindLabel,
}: {
    theme: Theme;
    currentTheme: ThemeName;
    cards: ReasonsOverviewCard[];
    kindLabel: string;
}) {
    const tickFill = currentTheme === 'dark' ? '#9ca3af' : '#6b7280';
    const gridStroke = currentTheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const data = useMemo(() => {
        const months = cards[0]?.trend || [];
        return months.map((point, index) => {
            const row: Record<string, string | number> = { label: point.label };
            for (const card of cards) {
                row[`${card.tone}_pct`] = card.trend[index]?.pct || 0;
            }
            return row;
        });
    }, [cards]);

    return (
        <div className={`${theme.cardBg} border ${theme.borderColor} rounded-xl p-2.5 sm:p-3`}>
            <div className="flex items-baseline justify-between gap-2 mb-1">
                <p className={`text-[10px] font-bold uppercase tracking-wide ${theme.textMuted}`}>
                    Overall trend
                </p>
                <p className={`text-[10px] ${theme.textMuted}`}>
                    %{kindLabel.toLowerCase()} vs qtyproc by category
                </p>
            </div>
            <div className="h-52 w-full min-w-0">
                {data.length === 0 || cards.length === 0 ? (
                    <p className={`text-sm ${theme.textMuted} py-10 text-center`}>No trend in this filter</p>
                ) : (
                    <ResponsiveContainer width="100%" height={208}>
                        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                            <XAxis dataKey="label" tick={{ fill: tickFill, fontSize: 10 }} interval={0} />
                            <YAxis
                                tick={{ fill: tickFill, fontSize: 10 }}
                                tickFormatter={(n: number) => fmtRate(n)}
                                width={44}
                            />
                            <Tooltip content={<OverviewTooltip currentTheme={currentTheme} />} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            {cards.map((card) => (
                                <Line
                                    key={card.tone}
                                    type="monotone"
                                    dataKey={`${card.tone}_pct`}
                                    name={card.label}
                                    stroke={REASONS_TONE_COLOR[card.tone]}
                                    strokeWidth={2.2}
                                    dot={{ r: 3, fill: REASONS_TONE_COLOR[card.tone] }}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}

function HistoryCompare({
    theme,
    currentTheme,
    kindLabel,
    accent,
    trend,
    yearStats,
    metaYear,
    overallRate,
    compare,
}: {
    theme: Theme;
    currentTheme: ThemeName;
    kindLabel: string;
    accent: string;
    trend: { label: string; pct: number; qty: number }[];
    yearStats: ReasonsYearStat[];
    metaYear: ReasonsOverviewResponse['meta']['year'];
    overallRate: number;
    compare?: ReasonsNamedTrend[];
}) {
    const [mode, setMode] = useState<'month' | 'year'>('month');
    const tickFill = currentTheme === 'dark' ? '#9ca3af' : '#6b7280';
    const gridStroke = currentTheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const yearly = yearStats.length > 0
        ? [...yearStats].reverse().map((stat) => ({
            label: String(stat.year),
            pct: stat.pct,
            qty: stat.qty,
            color: stat.color,
        }))
        : (metaYear === 'all'
            ? []
            : [{ label: formatReasonsYearLabel(metaYear), pct: overallRate, qty: 0, color: accent }]);
    const yearSeries = (compare || []).filter((series) => isYearCompareKey(series.key)).slice(0, 2);
    const monthlyYoY = yearSeries.length >= 2
        ? (yearSeries[0].trend.length ? yearSeries[0].trend : trend).map((point, index) => {
            const row: Record<string, string | number> = { label: point.label };
            for (const series of yearSeries) {
                row[series.key] = series.trend[index]?.pct || 0;
            }
            return row;
        })
        : null;
    const monthly = trend.map((point) => ({
        label: point.label,
        pct: point.pct,
        qty: point.qty,
        color: accent,
    }));
    const useYear = mode === 'year' && yearly.length > 0;
    const useYoY = !useYear && Boolean(monthlyYoY?.length);

    return (
        <div className={`${theme.cardBg} border ${theme.borderColor} rounded-xl p-2.5 sm:p-3 min-w-0`}>
            <div className="flex items-center justify-between gap-2 mb-1">
                <div className="min-w-0">
                    <p className={`text-[10px] font-bold uppercase tracking-wide ${theme.textMuted}`}>
                        History
                    </p>
                    <p className={`text-[10px] ${theme.textMuted}`}>
                        {useYear && yearly.length >= 2
                            ? `%${kindLabel.toLowerCase()} vs qtyproc · ${yearly.map((row) => row.label).join(' vs ')}`
                            : useYoY
                                ? `%${kindLabel.toLowerCase()} vs qtyproc · ${yearSeries.map((s) => s.label).join(' vs ')}`
                                : `%${kindLabel.toLowerCase()} vs qtyproc`}
                    </p>
                </div>
                <div className={`flex items-center ${theme.inputBg} rounded-lg p-0.5 border ${theme.borderColor} shrink-0`}>
                    {(['month', 'year'] as const).map((option) => {
                        const active = (useYear ? 'year' : 'month') === option;
                        const disabled = option === 'year' && yearly.length === 0;
                        return (
                            <button
                                key={option}
                                type="button"
                                disabled={disabled}
                                onClick={() => setMode(option)}
                                className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                                    active ? 'text-white' : theme.textMuted
                                } ${disabled ? 'opacity-40' : ''}`}
                                style={active ? { background: accent } : undefined}
                            >
                                {option === 'month' ? 'Month' : 'Year'}
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="h-52 w-full min-w-0">
                {useYear ? (
                    yearly.length === 0 ? (
                        <p className={`text-sm ${theme.textMuted} py-10 text-center`}>No history in this filter</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={208}>
                            <ComposedChart data={yearly} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                                <XAxis dataKey="label" tick={{ fill: tickFill, fontSize: 10 }} interval={0} />
                                <YAxis
                                    tick={{ fill: tickFill, fontSize: 10 }}
                                    tickFormatter={(n: number) => fmtRate(n)}
                                    width={44}
                                />
                                <Tooltip content={<OverviewTooltip currentTheme={currentTheme} />} />
                                <Bar dataKey="pct" name="Rate" radius={[3, 3, 0, 0]} maxBarSize={56}>
                                    {yearly.map((row) => (
                                        <Cell key={row.label} fill={row.color} fillOpacity={0.88} />
                                    ))}
                                    <LabelList dataKey="pct" position="top" content={RateBarLabel} />
                                </Bar>
                            </ComposedChart>
                        </ResponsiveContainer>
                    )
                ) : useYoY && monthlyYoY ? (
                    <ResponsiveContainer width="100%" height={208}>
                        <ComposedChart data={monthlyYoY} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                            <XAxis dataKey="label" tick={{ fill: tickFill, fontSize: 10 }} interval={0} />
                            <YAxis
                                tick={{ fill: tickFill, fontSize: 10 }}
                                tickFormatter={(n: number) => fmtRate(n)}
                                width={44}
                            />
                            <Tooltip content={<OverviewTooltip currentTheme={currentTheme} />} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            {yearSeries.map((series) => (
                                <Bar
                                    key={series.key}
                                    dataKey={series.key}
                                    name={series.label}
                                    fill={series.color}
                                    fillOpacity={0.88}
                                    maxBarSize={18}
                                    radius={[3, 3, 0, 0]}
                                />
                            ))}
                        </ComposedChart>
                    </ResponsiveContainer>
                ) : monthly.length === 0 ? (
                    <p className={`text-sm ${theme.textMuted} py-10 text-center`}>No history in this filter</p>
                ) : (
                    <ResponsiveContainer width="100%" height={208}>
                        <ComposedChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                            <XAxis dataKey="label" tick={{ fill: tickFill, fontSize: 10 }} interval={0} />
                            <YAxis
                                tick={{ fill: tickFill, fontSize: 10 }}
                                tickFormatter={(n: number) => fmtRate(n)}
                                width={44}
                            />
                            <Tooltip content={<OverviewTooltip currentTheme={currentTheme} />} />
                            <Bar dataKey="pct" name="Rate" radius={[3, 3, 0, 0]}>
                                {monthly.map((row) => (
                                    <Cell key={row.label} fill={row.color} fillOpacity={0.88} />
                                ))}
                            </Bar>
                        </ComposedChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}

export function ReasonsOverview({
    theme,
    currentTheme,
    accent,
    kind,
    loading,
    error,
    payload,
    onRetry,
    onOpenTone,
    onSelectRsn,
}: {
    theme: Theme;
    currentTheme: ThemeName;
    accent: string;
    kind: ReasonsKind;
    loading: boolean;
    error: string | null;
    payload: ReasonsOverviewResponse | null;
    onRetry: () => void;
    onOpenTone: (tone: ReasonsFocusTone) => void;
    onSelectRsn: (rsn: string, fromTone?: ReasonsFocusTone) => void;
}) {
    const [paretoView, setParetoView] = useState<'all' | 'top15'>('all');
    if (loading && !payload) {
        return (
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-2">
                <div className="flex gap-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className={`${theme.cardBg} border ${theme.borderColor} rounded-xl h-16 flex-1 animate-pulse`} />
                    ))}
                </div>
                <div className={`${theme.cardBg} border ${theme.borderColor} rounded-xl h-56 animate-pulse`} />
            </div>
        );
    }

    if (error && !payload) {
        return (
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center">
                    <p className={`text-sm font-semibold ${theme.textWhite} mb-1`}>Could not load overview</p>
                    <p className={`text-xs ${theme.textMuted} mb-4`}>{error}</p>
                    <button
                        type="button"
                        onClick={onRetry}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-white"
                        style={{ background: accent }}
                    >
                        <RefreshCw size={14} />
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!payload) return null;

    const kindLabel = kind === 'scrap' ? 'Scrap' : 'Reject';
    const kindColor = kind === 'scrap' ? SCRAP_COLOR : REJECT_COLOR;
    const rate = payload.meta.qtyproc > 0 ? (payload.meta.qty / payload.meta.qtyproc) * 100 : 0;
    const cards = (payload.cards || []).filter((card) => card.qtyproc > 0 || card.qty > 0);
    const trend = payload.trend || [];
    const peak = trend.reduce<{ label: string; qty: number } | null>((best, point) => {
        if (!best || point.qty > best.qty) return { label: point.label, qty: point.qty };
        return best;
    }, null);

    const yearStats = payload.yearStats || [];
    const compareYears = yearStats.length >= 2;
    const combinedTop = payload.top || [];
    const chartItems = paretoView === 'top15'
        ? paretoTopItems(combinedTop, REASONS_PARETO_CHART_N)
        : combinedTop;
    const top10Layout = paretoView === 'top15' ? 'side' : 'below';

    const paretoBlock = (
        <CombinedPareto
            theme={theme}
            currentTheme={currentTheme}
            items={chartItems}
            totalQty={payload.meta.qty}
            barColor={kindColor}
            family={payload.meta.family}
            view={paretoView}
            onView={setParetoView}
            height={paretoView === 'all' ? 400 : 320}
            onSelectRsn={(rsn) => onSelectRsn(rsn)}
        />
    );
    const top10Block = (
        <CombinedTop10
            theme={theme}
            items={combinedTop}
            totalQty={payload.meta.qty}
            accent={accent}
            layout={top10Layout}
            onSelectRsn={(rsn) => onSelectRsn(rsn)}
        />
    );

    return (
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col p-3 sm:p-4 md:p-6 gap-2">
            {compareYears ? (
                <div className="flex flex-wrap gap-2 min-w-0 shrink-0 items-stretch">
                    <YearCompareKpis theme={theme} kindLabel={kindLabel} stats={yearStats} />
                    {cards.length > 0 && (
                        <CategoryRatePie
                            theme={theme}
                            currentTheme={currentTheme}
                            cards={cards}
                            kindLabel={kindLabel}
                            onOpenTone={onOpenTone}
                        />
                    )}
                </div>
            ) : (
                <div className="flex flex-wrap gap-2 min-w-0 shrink-0 items-stretch">
                    <KpiCard
                        theme={theme}
                        label={`${kindLabel} qty`}
                        value={fmtQty(payload.meta.qty)}
                        hint={`${payload.meta.reasonCount.toLocaleString()} types · ${formatReasonsYearLabel(payload.meta.year)}`}
                        color={kindColor}
                    />
                    <KpiCard
                        theme={theme}
                        label="Rate vs qtyproc"
                        value={fmtRate(rate)}
                        hint={`${fmtQty(payload.meta.qtyproc)} process · ${kind === 'reject' ? 'qtyrjct' : 'qtyscrp'}/qtyproc`}
                        color={accent}
                    />
                    <KpiCard
                        theme={theme}
                        label="Peak month"
                        value={peak?.label || '—'}
                        hint={peak ? `${fmtQty(peak.qty)} pcs` : 'No volume yet'}
                        color="#64748b"
                    />
                    {cards.length > 0 && (
                        <CategoryRatePie
                            theme={theme}
                            currentTheme={currentTheme}
                            cards={cards}
                            kindLabel={kindLabel}
                            onOpenTone={onOpenTone}
                        />
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-2 items-stretch">
                <OverallTrend
                    theme={theme}
                    currentTheme={currentTheme}
                    cards={cards}
                    kindLabel={kindLabel}
                />
                <HistoryCompare
                    theme={theme}
                    currentTheme={currentTheme}
                    kindLabel={kindLabel}
                    accent={accent}
                    trend={trend}
                    yearStats={yearStats}
                    metaYear={payload.meta.year}
                    overallRate={rate}
                    compare={payload.compare}
                />
            </div>

            {paretoView === 'top15' ? (
                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-2 items-stretch">
                    {paretoBlock}
                    {top10Block}
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {paretoBlock}
                    {top10Block}
                </div>
            )}
        </div>
    );
}
