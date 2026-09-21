"use client";

import { useState } from 'react';
import {
    Area,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ComposedChart,
    LabelList,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ReferenceDot,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { Download, Loader2, RefreshCw } from 'lucide-react';
import type { Theme, ThemeName } from '@/lib/themes';
import {
    REASONS_CODEWARE_MIN_QTYPROC,
    REASONS_CODEWARE_TOP_N,
    REASONS_MONTH_LABELS,
    REASONS_TONE_COLOR,
    REASONS_TONE_LABEL,
    formatReasonsYearLabel,
    buildReasonsPareto,
    buildReasonsRatePareto,
    filterReasonsCodewareGroup,
    reasonsCodewareTotal,
    reasonsParetoGroupOptions,
    reasonsYearColor,
    sliceReasonsCodeware,
    sortReasonsCodeware,
    stratifyYearCompare,
    type ReasonsDetailResponse,
    type ReasonsFamily,
    type ReasonsFamilyShareItem,
    type ReasonsFocusTone,
    type ReasonsKind,
    type ReasonsNamedTrend,
    type ReasonsParetoItem,
    type ReasonsStratifySeries,
    type ReasonsStratifyYearRow,
    type ReasonsToneParam,
    type ReasonsTrendPoint,
    type ReasonsYearParam,
    type ReasonsYearStat,
} from '@/lib/reasons';

function fmtCompact(n: number): string {
    const v = Math.round(n || 0);
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`;
    if (v >= 10_000) return `${Math.round(v / 1_000)}k`;
    return v.toLocaleString('en-US');
}

function fmtQty(n: number): string {
    return Math.round(n).toLocaleString();
}

function fmtPct(n: number): string {
    return `${n.toFixed(1)}%`;
}

function fmtDelta(n: number | null | undefined): string {
    if (n == null || !Number.isFinite(n)) return '—';
    const rounded = Math.round(n);
    if (rounded === 0) return '0';
    return `${rounded > 0 ? '+' : ''}${rounded.toLocaleString()}`;
}

function YearStatRow({
    theme,
    stats,
    loading,
}: {
    theme: Theme;
    stats: ReasonsYearStat[];
    loading: boolean;
}) {
    if (stats.length < 2) return null;
    const latest = stats[0];
    const prev = stats[1];
    const dQty = latest.qty - prev.qty;
    const dRate = latest.pct - prev.pct;
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[latest, prev].map((stat, index) => (
                <div key={stat.year} className={`px-3 py-2 rounded-xl ${theme.inputBg} border ${theme.borderColor}`}>
                    <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: stat.color }}>
                        {stat.year} qty{index === 1 ? ' (ปีก่อน)' : ''}
                    </p>
                    <p className={`text-sm font-bold tabular-nums ${theme.textWhite}`}>
                        {loading ? '…' : fmtQty(stat.qty)}
                    </p>
                </div>
            ))}
            <div className={`px-3 py-2 rounded-xl ${theme.inputBg} border ${theme.borderColor}`}>
                <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: latest.color }}>{latest.year} rate</p>
                <p className={`text-sm font-bold tabular-nums ${theme.textWhite}`}>
                    {loading ? '…' : fmtPct(latest.pct)}
                </p>
            </div>
            <div className={`px-3 py-2 rounded-xl ${theme.inputBg} border ${theme.borderColor}`}>
                <p className={`text-[10px] font-bold uppercase tracking-wide ${theme.textMuted}`}>Δ vs {prev.year} (ปีก่อน)</p>
                <p className={`text-sm font-bold tabular-nums ${theme.textWhite}`}>
                    {loading ? '…' : `${fmtDelta(dQty)} · ${dRate >= 0 ? '+' : ''}${dRate.toFixed(1)} pp`}
                </p>
            </div>
        </div>
    );
}

const CODE_COLS = 'grid grid-cols-[1.1rem_minmax(0,1fr)_minmax(2.4rem,auto)_minmax(2.6rem,auto)_2.35rem] gap-x-1.5 items-center';
const CODE_ROW = `${CODE_COLS} px-2.5 py-1`;
const SKELETON_ROWS = 8;
const SCRAP_COLOR = '#ef4444';
const REJECT_COLOR = '#f97316';

function PaneError({
    theme,
    accent,
    title,
    error,
    onRetry,
}: {
    theme: Theme;
    accent: string;
    title: string;
    error: string;
    onRetry: () => void;
}) {
    return (
        <div className="px-4 py-12 text-center">
            <p className={`text-sm font-semibold ${theme.textWhite} mb-1`}>{title}</p>
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
    );
}

function SegmentedPills<T extends string>({
    theme,
    value,
    onChange,
    options,
    className = '',
    activeColor,
}: {
    theme: Theme;
    value: T;
    onChange: (value: T) => void;
    options: { value: T; label: string; disabled?: boolean }[];
    className?: string;
    activeColor?: string;
}) {
    return (
        <div className={`flex items-center ${theme.inputBg} rounded-xl p-1 border ${theme.borderColor} shrink-0 ${className}`}>
            {options.map((opt) => {
                const active = value === opt.value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        disabled={opt.disabled}
                        onClick={() => { if (!opt.disabled) onChange(opt.value); }}
                        className={`px-2 sm:px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold leading-tight transition-colors whitespace-nowrap ${
                            opt.disabled
                                ? `${theme.textMuted} opacity-40 cursor-not-allowed`
                                : active
                                    ? 'text-white shadow-md'
                                    : `${theme.textMuted} hover:${theme.textWhite}`
                        }`}
                        style={!opt.disabled && active ? { background: activeColor || '#2563eb' } : undefined}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}

function TrendSkeleton({ theme }: { theme: Theme }) {
    return (
        <div className="p-4 h-full min-h-[16rem] flex flex-col gap-3" aria-busy="true">
            <div className={`h-3 w-40 rounded ${theme.inputBg} animate-pulse`} />
            <div className={`flex-1 min-h-[12rem] rounded-xl ${theme.inputBg} animate-pulse`} />
        </div>
    );
}

function CodewareSkeleton({ theme }: { theme: Theme }) {
    return (
        <div aria-busy="true">
            {Array.from({ length: SKELETON_ROWS }, (_, i) => (
                <div key={i} className={`${CODE_ROW} border-b ${theme.borderColor}`}>
                    <div className={`h-2 w-4 rounded ${theme.inputBg} animate-pulse`} />
                    <div className={`h-2 w-full max-w-[10rem] rounded ${theme.inputBg} animate-pulse`} />
                    <div className={`h-2 w-8 justify-self-end rounded ${theme.inputBg} animate-pulse`} />
                    <div className={`h-2 w-8 justify-self-end rounded ${theme.inputBg} animate-pulse`} />
                    <div className={`h-2 w-6 justify-self-end rounded ${theme.inputBg} animate-pulse`} />
                </div>
            ))}
        </div>
    );
}

function ChartTip({
    currentTheme,
    label,
    rows,
}: {
    currentTheme: ThemeName;
    label?: string;
    rows: { name: string; value: string; color?: string }[];
}) {
    if (!rows.length) return null;
    const bg = currentTheme === 'dark' ? '#141414' : '#ffffff';
    const border = currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    return (
        <div className="rounded-xl px-3 py-2 text-xs shadow-lg" style={{ background: bg, border: `1px solid ${border}` }}>
            {label ? <p className="font-bold mb-1">{label}</p> : null}
            {rows.map((row) => (
                <p key={row.name} className="tabular-nums flex justify-between gap-4">
                    <span style={{ color: row.color }}>{row.name}</span>
                    <span>{row.value}</span>
                </p>
            ))}
        </div>
    );
}

function TrendTooltip({
    active,
    payload,
    currentTheme,
}: {
    active?: boolean;
    payload?: { payload?: ReasonsTrendPoint & Record<string, string | number>; name?: string; value?: number; color?: string; dataKey?: string }[];
    currentTheme: ThemeName;
}) {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload;
    const overlayKeys = [...new Set(
        payload.map((entry) => String(entry.dataKey || '').replace(/_(qty|pct)$/, '')).filter((key) => key && key !== 'qty' && key !== 'pct'),
    )];
    if (overlayKeys.length) {
        const rows = overlayKeys.map((key) => {
            const qty = Number(row?.[`${key}_qty`]) || 0;
            const pct = Number(row?.[`${key}_pct`]) || 0;
            const entry = payload.find((item) => String(item.dataKey || '').startsWith(`${key}_`));
            return {
                name: String(entry?.name || key).replace(/\s+%$/, ''),
                qty,
                pct,
                color: entry?.color,
            };
        }).filter((item) => item.qty > 0 || item.pct > 0).sort((a, b) => b.qty - a.qty || b.pct - a.pct);
        return (
            <ChartTip
                currentTheme={currentTheme}
                label={String(row?.label || '')}
                rows={rows.map((item) => ({
                    name: item.name,
                    value: `${fmtQty(item.qty)} · ${fmtPct(item.pct)}`,
                    color: item.color,
                }))}
            />
        );
    }
    if (!row) return null;
    const rows = [
        row.qty > 0 ? { name: 'Qty', value: fmtQty(row.qty) } : null,
        row.pct > 0 ? { name: 'Rate', value: fmtPct(row.pct) } : null,
        row.delta != null ? { name: 'Δ', value: fmtDelta(row.delta) } : null,
    ].filter((item): item is { name: string; value: string } => Boolean(item));
    return <ChartTip currentTheme={currentTheme} label={row.label} rows={rows} />;
}

type TrendMarkMode = 'lollipop' | 'solid' | 'ring';

function trendPointCount(points: { qty: number; pct: number }[], metric: 'qty' | 'pct') {
    return points.filter((point) => (metric === 'qty' ? point.qty : point.pct) > 0).length;
}

function trendModeForCount(count: number): TrendMarkMode {
    if (count <= 2) return 'lollipop';
    if (count <= 6) return 'solid';
    return 'ring';
}

function trendDotStyle(color: string, currentTheme: ThemeName, mode: TrendMarkMode = 'ring') {
    const ink = currentTheme === 'dark' ? '#141414' : '#ffffff';
    if (mode === 'ring') {
        return {
            r: 3,
            fill: ink,
            stroke: color,
            strokeWidth: 1.75,
            activeR: 5.5,
            activeFill: color,
            activeStroke: ink,
        };
    }
    const r = mode === 'lollipop' ? 6 : 4.5;
    return {
        r,
        fill: color,
        stroke: ink,
        strokeWidth: 2,
        activeR: r + 2,
        activeFill: color,
        activeStroke: ink,
    };
}

function TrendDot({
    cx,
    cy,
    payload,
    dataKey,
    r,
    fill,
    stroke,
    strokeWidth,
}: {
    cx?: number;
    cy?: number;
    payload?: Record<string, unknown>;
    dataKey: string;
    r: number;
    fill: string;
    stroke: string;
    strokeWidth: number;
}) {
    const value = Number(payload?.[dataKey]);
    if (!Number.isFinite(value) || value <= 0 || cx == null || cy == null) return <g />;
    return <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
}

function TrendValueLabel({
    x,
    y,
    value,
    fill,
    metric,
}: {
    x?: number;
    y?: number;
    value?: number;
    fill: string;
    metric: 'qty' | 'pct';
}) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0 || x == null || y == null) return <g />;
    return (
        <text x={x} y={y} dy={-10} textAnchor="middle" fontSize={10} fontWeight={700} fill={fill}>
            {metric === 'pct' ? fmtPct(n) : fmtQty(n)}
        </text>
    );
}

function TrendChart({
    trend,
    compare,
    accent,
    currentTheme,
    peakMo,
    metric,
    splitPanels = false,
}: {
    trend: ReasonsTrendPoint[];
    compare?: ReasonsNamedTrend[];
    accent: string;
    currentTheme: ThemeName;
    peakMo: number | null;
    metric: 'qty' | 'pct';
    splitPanels?: boolean;
}) {
    const tick = currentTheme === 'dark' ? '#9ca3af' : '#6b7280';
    const grid = currentTheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    const overlays = compare && compare.length >= 2 ? compare : null;
    if (splitPanels && compare && compare.length > 0) {
        return (
            <OverlayTrendChart
                overlays={compare}
                currentTheme={currentTheme}
                metric={metric}
            />
        );
    }
    if (overlays) {
        return (
            <CombinedOverlayChart
                trend={trend}
                overlays={overlays}
                currentTheme={currentTheme}
                metric={metric}
            />
        );
    }
    const values = trend.map((point) => (metric === 'qty' ? point.qty : point.pct));
    const avg = values.length ? values.reduce((sum, n) => sum + n, 0) / values.length : 0;
    const peak = peakMo != null ? trend.find((point) => point.mo === peakMo) : undefined;
    const peakY = peak ? (metric === 'qty' ? peak.qty : peak.pct) : null;
    const dataKey = metric === 'qty' ? 'qty' : 'pct';
    const mode = trendModeForCount(trendPointCount(trend, metric));
    const curve = mode === 'ring' ? 'monotone' : 'linear';
    const marks = trendDotStyle(accent, currentTheme, mode);
    const showArea = mode !== 'lollipop';
    const showLabels = mode !== 'ring';

    return (
        <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trend} margin={{ top: showLabels ? 18 : 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="reasonsFocusTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={accent} stopOpacity={0.22} />
                        <stop offset="95%" stopColor={accent} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: tick, fontSize: 11, fontWeight: 500 }}
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    width={44}
                    tick={{ fill: tick, fontSize: 11, fontWeight: 500 }}
                    tickFormatter={(value: number) => (
                        metric === 'pct'
                            ? (Math.abs(value) < 10 ? `${Number(value).toFixed(1)}%` : `${Number(value).toFixed(0)}%`)
                            : Number(value).toLocaleString()
                    )}
                />
                <Tooltip content={<TrendTooltip currentTheme={currentTheme} />} />
                {mode === 'lollipop' && (
                    <Bar
                        dataKey={dataKey}
                        name={metric === 'qty' ? 'Qty' : 'Rate'}
                        fill={accent}
                        fillOpacity={0.28}
                        maxBarSize={6}
                        legendType="none"
                        isAnimationActive={false}
                    />
                )}
                {showArea && (
                    <Area
                        type={curve}
                        dataKey={dataKey}
                        name={metric === 'qty' ? 'Qty' : 'Rate'}
                        stroke="none"
                        fill="url(#reasonsFocusTrend)"
                        legendType="none"
                    />
                )}
                <Line
                    type={curve}
                    dataKey={dataKey}
                    name={metric === 'qty' ? 'Qty' : 'Rate'}
                    stroke={accent}
                    strokeWidth={mode === 'lollipop' ? 0 : mode === 'solid' ? 2.75 : 2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    dot={(props) => (
                        <TrendDot
                            cx={props.cx}
                            cy={props.cy}
                            payload={props.payload}
                            dataKey={dataKey}
                            r={marks.r}
                            fill={marks.fill}
                            stroke={marks.stroke}
                            strokeWidth={marks.strokeWidth}
                        />
                    )}
                    activeDot={{
                        r: marks.activeR,
                        fill: marks.activeFill,
                        stroke: marks.activeStroke,
                        strokeWidth: 2,
                    }}
                >
                    {showLabels && (
                        <LabelList
                            dataKey={dataKey}
                            content={(props) => (
                                <TrendValueLabel
                                    x={Number(props.x) || 0}
                                    y={Number(props.y) || 0}
                                    value={Number(props.value)}
                                    fill={tick}
                                    metric={metric}
                                />
                            )}
                        />
                    )}
                </Line>
                <ReferenceLine y={avg} stroke={tick} strokeDasharray="4 4" strokeOpacity={0.7} />
                {peak && peakY != null && peakY > 0 && mode === 'ring' && (
                    <ReferenceDot
                        x={peak.label}
                        y={peakY}
                        r={5}
                        fill={accent}
                        stroke={currentTheme === 'dark' ? '#141414' : '#ffffff'}
                        strokeWidth={2}
                    />
                )}
            </ComposedChart>
        </ResponsiveContainer>
    );
}

function sparkPeakOf(trend: ReasonsTrendPoint[], metric: 'qty' | 'pct'): ReasonsTrendPoint | null {
    let peak: ReasonsTrendPoint | null = null;
    for (const point of trend) {
        const n = metric === 'qty' ? point.qty : point.pct;
        const best = peak ? (metric === 'qty' ? peak.qty : peak.pct) : -1;
        if (n > best) peak = point;
    }
    if (!peak) return null;
    return (metric === 'qty' ? peak.qty : peak.pct) > 0 ? peak : null;
}

function StratifyLineTooltip({
    active,
    payload,
    currentTheme,
}: {
    active?: boolean;
    payload?: { payload?: ReasonsTrendPoint }[];
    currentTheme: ThemeName;
}) {
    if (!active || !payload?.length) return null;
    const row = payload[0]?.payload;
    if (!row) return null;
    return (
        <ChartTip
            currentTheme={currentTheme}
            label={row.label}
            rows={[
                ...(row.qty > 0 ? [{ name: 'Qty', value: fmtQty(row.qty) }] : []),
                ...(row.pct > 0 ? [{ name: 'Share of month', value: fmtPct(row.pct) }] : []),
            ]}
        />
    );
}

function MiniTrendPanel({
    series,
    currentTheme,
    metric,
    share,
}: {
    series: ReasonsNamedTrend;
    currentTheme: ThemeName;
    metric: 'qty' | 'pct';
    share: number;
}) {
    const tick = currentTheme === 'dark' ? '#9ca3af' : '#6b7280';
    const grid = currentTheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
    const track = currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
    const frame = currentTheme === 'dark' ? 'border-white/10 bg-white/[0.03]' : 'border-black/[0.08] bg-black/[0.02]';
    const dataKey = metric === 'qty' ? 'qty' : 'pct';
    const totalQty = series.trend.reduce((sum, point) => sum + point.qty, 0);
    const last = [...series.trend].reverse().find((point) => (metric === 'pct' ? point.pct : point.qty) > 0)
        || series.trend[series.trend.length - 1];
    const lastVal = last ? (metric === 'pct' ? last.pct : last.qty) : 0;
    const peak = sparkPeakOf(series.trend, metric);
    return (
        <div className={`min-w-0 min-h-[6.25rem] flex-1 flex items-stretch gap-3 rounded-xl border ${frame} px-2.5 py-1.5`}>
            <div className="w-[11.25rem] shrink-0 flex flex-col justify-center gap-1 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: series.color }} />
                    <p className="text-[11px] font-bold truncate" style={{ color: series.color }}>{series.label}</p>
                </div>
                <div className="flex items-baseline gap-2 leading-none">
                    <p className="text-[12px] font-bold tabular-nums" style={{ color: tick }}>{fmtQty(totalQty)}</p>
                    <p className="text-[12px] font-bold tabular-nums ml-auto" style={{ color: series.color }}>{fmtPct(share)}</p>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: track }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, share))}%`, background: series.color }} />
                </div>
                <p className="text-[9px] font-semibold tabular-nums truncate" style={{ color: tick }}>
                    last {last?.label || '—'} · {metric === 'pct' ? fmtPct(lastVal) : fmtQty(lastVal)}
                    {peak ? ` · peak ${peak.label}` : ''}
                </p>
            </div>
            <div className="flex-1 min-w-0 h-[6.25rem] min-h-[6.25rem]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={series.trend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                        <XAxis
                            dataKey="label"
                            tick={{ fill: tick, fontSize: 8 }}
                            interval={1}
                            height={18}
                        />
                        <YAxis
                            tick={{ fill: tick, fontSize: 8 }}
                            tickFormatter={(value: number) => (
                                metric === 'pct' ? `${Number(value).toFixed(Number(value) < 10 ? 1 : 0)}%` : fmtCompact(value)
                            )}
                            width={30}
                            tickCount={3}
                            domain={['auto', 'auto']}
                            allowDecimals={false}
                        />
                        <Tooltip content={<StratifyLineTooltip currentTheme={currentTheme} />} />
                        <Line
                            type="linear"
                            dataKey={dataKey}
                            name={series.label}
                            stroke={series.color}
                            strokeWidth={1.75}
                            connectNulls
                            isAnimationActive={false}
                            dot={{ r: 2.5, fill: series.color, strokeWidth: 0 }}
                            activeDot={{ r: 4, fill: series.color, strokeWidth: 0 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

function CombinedOverlayChart({
    trend,
    overlays,
    currentTheme,
    metric,
}: {
    trend: ReasonsTrendPoint[];
    overlays: ReasonsNamedTrend[];
    currentTheme: ThemeName;
    metric: 'qty' | 'pct';
}) {
    const tick = currentTheme === 'dark' ? '#9ca3af' : '#6b7280';
    const grid = currentTheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    const mode = trendModeForCount(trendPointCount(
        trend.map((point, index) => ({
            qty: overlays.reduce((sum, series) => sum + (series.trend[index]?.qty || 0), 0),
            pct: overlays.reduce((sum, series) => sum + (series.trend[index]?.pct || 0), 0),
        })),
        metric,
    ));
    const curve = mode === 'ring' ? 'monotone' : 'linear';
    const data = trend.map((point, index) => {
        const row: Record<string, string | number> = { label: point.label };
        for (const series of overlays) {
            const item = series.trend[index];
            row[`${series.key}_qty`] = item?.qty || 0;
            row[`${series.key}_pct`] = item?.pct || 0;
        }
        return row;
    });
    return (
        <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: tick, fontSize: 11, fontWeight: 500 }}
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    width={44}
                    tick={{ fill: tick, fontSize: 11, fontWeight: 500 }}
                    tickFormatter={(value: number) => (
                        metric === 'pct'
                            ? (Math.abs(value) < 10 ? `${Number(value).toFixed(1)}%` : `${Number(value).toFixed(0)}%`)
                            : Number(value).toLocaleString()
                    )}
                />
                <Tooltip content={<TrendTooltip currentTheme={currentTheme} />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {overlays.map((series) => {
                    const dataKey = metric === 'qty' ? `${series.key}_qty` : `${series.key}_pct`;
                    const marks = trendDotStyle(series.color, currentTheme, mode);
                    return (
                        <Line
                            key={series.key}
                            type={curve}
                            dataKey={dataKey}
                            name={series.label}
                            stroke={series.color}
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            isAnimationActive={false}
                            dot={(props) => (
                                <TrendDot
                                    cx={props.cx}
                                    cy={props.cy}
                                    payload={props.payload}
                                    dataKey={dataKey}
                                    r={marks.r}
                                    fill={marks.fill}
                                    stroke={marks.stroke}
                                    strokeWidth={marks.strokeWidth}
                                />
                            )}
                            activeDot={{
                                r: marks.activeR,
                                fill: marks.activeFill,
                                stroke: marks.activeStroke,
                                strokeWidth: 2,
                            }}
                        />
                    );
                })}
            </ComposedChart>
        </ResponsiveContainer>
    );
}

function OverlayTrendChart({
    overlays,
    currentTheme,
    metric,
}: {
    overlays: ReasonsNamedTrend[];
    currentTheme: ThemeName;
    metric: 'qty' | 'pct';
}) {
    const totals = overlays.map((series) => series.trend.reduce((sum, point) => sum + point.qty, 0));
    const grand = totals.reduce((sum, n) => sum + n, 0);
    return (
        <div className="h-full min-h-0 overflow-y-auto px-2 py-1.5 flex flex-col gap-1.5">
            {overlays.map((series, index) => (
                <MiniTrendPanel
                    key={series.key}
                    series={series}
                    currentTheme={currentTheme}
                    metric={metric}
                    share={grand > 0 ? (totals[index] / grand) * 100 : 0}
                />
            ))}
        </div>
    );
}

function stratifyToNamedTrends(series: ReasonsStratifySeries[]): ReasonsNamedTrend[] {
    const ranked = [...series]
        .filter((item) => item.qty > 0)
        .sort((a, b) => b.qty - a.qty || a.label.localeCompare(b.label, 'th'));
    return ranked.map((item) => ({
        key: item.key,
        label: item.label,
        color: item.color,
        trend: REASONS_MONTH_LABELS.map((label, index) => {
            const qty = item.months[index] || 0;
            const monthTotal = ranked.reduce((sum, row) => sum + (row.months[index] || 0), 0);
            return {
                mo: index + 1,
                label,
                qty,
                pct: monthTotal > 0 ? (qty / monthTotal) * 100 : 0,
                delta: null,
            };
        }),
    }));
}

function StratifyYearChart({
    rows,
    currentTheme,
    currentLabel,
    prevLabel,
}: {
    rows: ReasonsStratifyYearRow[];
    currentTheme: ThemeName;
    currentLabel: string;
    prevLabel: string;
}) {
    const tick = currentTheme === 'dark' ? '#9ca3af' : '#6b7280';
    const track = currentTheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
    const frame = currentTheme === 'dark' ? 'border-white/10 bg-white/[0.03]' : 'border-black/[0.08] bg-black/[0.02]';
    const currentColor = reasonsYearColor(0);
    const prevColor = reasonsYearColor(1);
    const currentTotal = rows.reduce((sum, row) => sum + row.currentQty, 0);
    const maxQty = Math.max(...rows.flatMap((row) => [row.currentQty, row.prevQty]), 1);
    return (
        <div className="h-full min-h-0 overflow-y-auto px-2 py-1.5 flex flex-col gap-1.5">
            {rows.map((row) => {
                const share = currentTotal > 0 ? (row.currentQty / currentTotal) * 100 : 0;
                const delta = row.deltaPct;
                return (
                    <div key={row.key} className={`min-w-0 min-h-[5.5rem] flex-1 flex flex-col justify-center rounded-xl border ${frame} px-2.5 py-1.5`}>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: row.color }} />
                            <p className="text-[11px] font-bold truncate" style={{ color: row.color }}>{row.label}</p>
                            <p className="ml-auto text-[11px] font-bold tabular-nums shrink-0" style={{ color: tick }}>
                                {fmtQty(row.currentQty)}
                            </p>
                            <p className="text-[11px] font-bold tabular-nums shrink-0" style={{ color: row.color }}>
                                {fmtPct(share)}
                            </p>
                        </div>
                        <div className="h-1 rounded-full overflow-hidden mt-1 mb-1.5 shrink-0" style={{ background: track }}>
                            <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, share))}%`, background: row.color }} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <span className="w-[4.5rem] text-[9px] font-bold truncate shrink-0" style={{ color: currentColor }}>{currentLabel}</span>
                                <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: track }}>
                                    <div className="h-full rounded-full" style={{ width: `${(row.currentQty / maxQty) * 100}%`, background: currentColor }} />
                                </div>
                                <span className="w-14 text-right text-[10px] font-bold tabular-nums shrink-0" style={{ color: tick }}>{fmtQty(row.currentQty)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-[4.5rem] text-[9px] font-bold truncate shrink-0" style={{ color: prevColor }}>{prevLabel}</span>
                                <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: track }}>
                                    <div className="h-full rounded-full" style={{ width: `${(row.prevQty / maxQty) * 100}%`, background: prevColor }} />
                                </div>
                                <span className="w-14 text-right text-[10px] font-bold tabular-nums shrink-0" style={{ color: tick }}>{fmtQty(row.prevQty)}</span>
                            </div>
                        </div>
                        {delta != null && (
                            <p className="text-[10px] font-semibold tabular-nums mt-1" style={{ color: tick }}>
                                Δ {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
                            </p>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function ParetoTooltip({
    active,
    payload,
    currentTheme,
    metric,
}: {
    active?: boolean;
    payload?: { name?: string; value?: number; color?: string; dataKey?: string; payload?: ReasonsParetoItem }[];
    currentTheme: ThemeName;
    metric: 'qty' | 'rate';
}) {
    if (!active || !payload?.length) return null;
    const item = payload[0]?.payload;
    const barColor = payload.find((row) => row.dataKey === (metric === 'qty' ? 'qty' : 'pct'))?.color
        || payload[0]?.color;
    const rows = metric === 'qty'
        ? [
            { name: 'Qty', value: fmtQty(Number(item?.qty) || 0), color: barColor },
            { name: 'Share', value: fmtPct(Number(item?.share) || 0), color: barColor },
            { name: 'Cum', value: fmtPct(Number(item?.cum) || 0), color: barColor },
            ...(Number(item?.pct) > 0
                ? [{ name: 'Rate', value: fmtPct(Number(item?.pct) || 0), color: barColor }]
                : []),
        ]
        : [
            { name: 'Rate', value: fmtPct(Number(item?.pct) || 0), color: barColor },
            ...(Number(item?.qty) > 0
                ? [{ name: 'Qty', value: fmtQty(Number(item?.qty) || 0), color: barColor }]
                : []),
        ];
    return <ChartTip currentTheme={currentTheme} label={item?.name || item?.code} rows={rows} />;
}

function paretoTickLabel(name: string): string {
    return String(name || '').replace(/^W\/W\s+/i, '').trim() || name;
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
    data: { tick: string; name?: string; code: string }[];
    fill: string;
    fontSize: number;
    angle: number;
}) {
    const row = data[Number(payload?.value) - 1];
    const label = row?.tick || '';
    if (!label) return <g />;
    return (
        <text
            x={x}
            y={y}
            fill={fill}
            fontSize={fontSize}
            fontWeight={600}
            textAnchor="end"
            dominantBaseline="hanging"
            transform={`rotate(${angle} ${x} ${y})`}
            style={{ fontFamily: 'ui-sans-serif, system-ui, "Segoe UI", Tahoma, sans-serif' }}
        >
            <title>{row.name || row.code}</title>
            {label}
        </text>
    );
}

function CodewarePareto({
    items,
    currentTheme,
    accent,
    metric,
}: {
    items: ReasonsParetoItem[];
    currentTheme: ThemeName;
    accent: string;
    metric: 'qty' | 'rate';
}) {
    const tick = currentTheme === 'dark' ? '#ffffff' : '#111111';
    const grid = currentTheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const line = currentTheme === 'dark' ? '#e4e4e7' : '#3f3f46';
    if (!items.length) return null;
    const data = items.map((item, index) => ({
        ...item,
        rank: index + 1,
        tick: paretoTickLabel(item.name || item.code),
    }));
    const tickFont = data.length > 24 ? 9 : data.length > 14 ? 10 : 11;
    const longest = data.reduce((max, row) => Math.max(max, (row.tick || '').length), 8);
    const labelAngle = -42;
    const axisHeight = Math.min(132, Math.max(88, Math.round(longest * tickFont * 0.38) + 18));
    const minWidth = Math.max(data.length * 36, 280);
    const axisTick = (
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
                    fill={tick}
                    fontSize={tickFont}
                    angle={labelAngle}
                />
            )}
        />
    );
    const bars = (
        <Bar
            yAxisId={metric === 'qty' ? 'qty' : undefined}
            dataKey={metric === 'qty' ? 'qty' : 'pct'}
            name={metric === 'qty' ? 'Qty' : 'Rate'}
            radius={[3, 3, 0, 0]}
            maxBarSize={26}
        >
            {items.map((row) => (
                <Cell
                    key={`${row.tone || 'x'}-${row.code}`}
                    fill={row.tone ? REASONS_TONE_COLOR[row.tone] : accent}
                    fillOpacity={0.86}
                />
            ))}
        </Bar>
    );
    return (
        <div className="overflow-x-auto px-2 pt-2 h-full">
            <div style={{ minWidth }} className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                    {metric === 'qty' ? (
                        <ComposedChart data={data} margin={{ top: 12, right: 8, left: 4, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                            {axisTick}
                            <YAxis
                                yAxisId="qty"
                                tick={{ fill: tick, fontSize: 9 }}
                                tickFormatter={(n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n)))}
                                width={36}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                yAxisId="cum"
                                orientation="right"
                                domain={[0, 100]}
                                tick={{ fill: tick, fontSize: 9 }}
                                tickFormatter={(n: number) => `${Math.round(n)}%`}
                                width={32}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip content={<ParetoTooltip currentTheme={currentTheme} metric={metric} />} />
                            <ReferenceLine yAxisId="cum" y={80} stroke={accent} strokeDasharray="4 4" strokeOpacity={0.45} />
                            {bars}
                            <Line
                                yAxisId="cum"
                                type="monotone"
                                dataKey="cum"
                                name="Cumulative %"
                                stroke={line}
                                strokeWidth={data.length > 20 ? 1.2 : 1.8}
                                dot={data.length > 24 ? false : { r: 2.5, fill: line }}
                            />
                        </ComposedChart>
                    ) : (
                        <BarChart data={data} margin={{ top: 12, right: 8, left: 4, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                            {axisTick}
                            <YAxis
                                tick={{ fill: tick, fontSize: 9 }}
                                tickFormatter={(n: number) => `${n.toFixed(n >= 10 ? 0 : 1)}%`}
                                width={36}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip content={<ParetoTooltip currentTheme={currentTheme} metric={metric} />} />
                            {bars}
                        </BarChart>
                    )}
                </ResponsiveContainer>
            </div>
        </div>
    );
}

function CodewareList({
    theme,
    accent,
    family,
    items,
    other,
    total,
    metric,
    loading,
    error,
    empty,
    year,
    onRetry,
}: {
    theme: Theme;
    accent: string;
    family: ReasonsFamily;
    items: ReasonsDetailResponse['codeware'];
    other?: ReasonsDetailResponse['other'];
    total?: ReasonsDetailResponse['codeware'][number];
    metric: 'qty' | 'rate';
    loading: boolean;
    error: string | null;
    empty: boolean;
    year: ReasonsYearParam;
    onRetry: () => void;
}) {
    const totalQty = total?.qty || 0;
    const renderRow = (
        item: ReasonsDetailResponse['codeware'][number],
        i: number,
        opts: { isTotal?: boolean; isOther?: boolean },
    ) => {
        const isTotal = Boolean(opts.isTotal);
        const isOther = Boolean(opts.isOther);
        const toneColor = item.tone ? REASONS_TONE_COLOR[item.tone] : accent;
        const toneLabel = item.tone ? REASONS_TONE_LABEL[item.tone] : '';
        const desc1 = item.desc1 || item.code.replace(/\s+\([^()]+\)$/, '').trim() || item.code;
        const desc2 = item.desc2 || (/\s+\(([^()]+)\)$/.exec(item.code)?.[1] || '');
        const stackDw = !isTotal && !isOther && Boolean(desc2) && (
            family === 'dw'
            || item.tone === 'inglaze'
            || item.tone === 'onglaze'
        );
        const barPct = metric === 'qty'
            ? (totalQty > 0 ? (item.qty / totalQty) * 100 : 0)
            : item.pct;
        return (
            <div key={`${item.tone || 'x'}-${item.code}-${i}`} className={`relative ${CODE_ROW} border-b ${theme.borderColor} ${stackDw ? 'py-1.5 items-start' : ''} ${isTotal ? `${theme.inputBg}` : ''}`}>
                {!isTotal && (
                    <span
                        className="absolute inset-y-0 left-0 rounded-sm"
                        style={{ width: `${Math.min(100, Math.max(0, barPct))}%`, background: isOther ? accent : toneColor, opacity: 0.12 }}
                        aria-hidden
                    />
                )}
                <span className={`relative tabular-nums text-[10px] font-bold ${theme.textMuted} ${stackDw ? 'pt-0.5' : ''}`}>
                    {isTotal ? 'Σ' : isOther ? '—' : i + 1}
                </span>
                <span
                    className={`relative min-w-0 ${isTotal ? theme.textWhite : isOther ? theme.textSecondary : ''}`}
                    title={toneLabel ? `${toneLabel} · ${item.code}` : item.code}
                >
                    {stackDw ? (
                        <>
                            <span className="block text-[11px] font-semibold leading-tight truncate" style={{ color: toneColor }}>
                                {desc1}
                            </span>
                            <span className={`block text-[10px] font-medium leading-tight truncate ${theme.textWhite}`}>
                                {desc2}
                            </span>
                        </>
                    ) : (
                        <span
                            className={`block text-[11px] font-semibold leading-tight truncate ${isTotal ? 'font-bold' : ''}`}
                            style={isTotal || isOther ? undefined : { color: toneColor }}
                        >
                            {isTotal ? 'Total' : isOther ? 'Other' : item.code}
                        </span>
                    )}
                </span>
                <span className={`relative tabular-nums text-right text-[11px] font-semibold ${isTotal ? 'font-bold' : ''} ${stackDw ? 'pt-0.5' : ''}`} style={isTotal || isOther ? undefined : { color: toneColor }}>
                    {fmtQty(item.qty)}
                </span>
                <span className={`relative tabular-nums text-right text-[10px] ${isTotal ? `${theme.textWhite} font-bold` : theme.textMuted} ${stackDw ? 'pt-0.5' : ''}`}>
                    {fmtQty(item.qtyproc)}
                </span>
                <span
                    className={`relative tabular-nums text-right text-[10px] font-semibold ${isOther ? theme.textMuted : ''} ${stackDw ? 'pt-0.5' : ''}`}
                    style={isTotal || isOther ? undefined : { color: toneColor }}
                >
                    {item.pct.toFixed(1)}
                </span>
            </div>
        );
    };
    return (
        <>
            <div className={`${CODE_ROW} border-b ${theme.borderColor}`}>
                <span className={`text-[9px] font-bold uppercase tracking-wide ${theme.textMuted}`}>#</span>
                <span className={`text-[9px] font-bold uppercase tracking-wide ${theme.textMuted}`}>Code</span>
                <span className={`justify-self-end text-[9px] font-bold uppercase tracking-wide ${theme.textMuted}`}>Qty</span>
                <span className={`justify-self-end text-[9px] font-bold uppercase tracking-wide ${theme.textMuted}`}>Proc</span>
                <span className={`justify-self-end text-[9px] font-bold uppercase tracking-wide ${theme.textMuted}`}>Rate</span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
                {loading && <CodewareSkeleton theme={theme} />}
                {!loading && error && (
                    <PaneError theme={theme} accent={accent} title="Could not load codeware" error={error} onRetry={onRetry} />
                )}
                {!loading && !error && empty && (
                    <p className={`px-4 py-12 text-center text-sm ${theme.textMuted}`}>
                        No codeware for this defect in {formatReasonsYearLabel(year)}.
                    </p>
                )}
                {!loading && !error && items.map((item, i) => renderRow(item, i, {}))}
            </div>
            {!loading && !error && !empty && other && (
                <div className="shrink-0">
                    {renderRow(other, items.length, { isOther: true })}
                </div>
            )}
            {!loading && !error && !empty && total && (
                <div className="shrink-0 border-t-2">
                    {renderRow(total, items.length, { isTotal: true })}
                </div>
            )}
        </>
    );
}

function FamilyShareDonut({
    theme,
    items,
}: {
    theme: Theme;
    items: ReasonsFamilyShareItem[];
}) {
    const data = items
        .filter((item) => item.qty > 0)
        .map((item) => ({ ...item, color: REASONS_TONE_COLOR[item.tone] }));
    if (!data.length) return null;
    return (
        <section className={`${theme.cardBg} border ${theme.borderColor} rounded-xl shadow-sm px-2.5 py-1.5 flex items-center gap-2 min-h-0 h-full`}>
            <div className="h-14 w-14 sm:h-16 sm:w-16 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey="qty"
                            nameKey="label"
                            innerRadius={18}
                            outerRadius={28}
                            paddingAngle={1}
                            isAnimationActive={false}
                        >
                            {data.map((item) => (
                                <Cell key={item.tone} fill={item.color} />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="min-w-0 flex-1">
                <p className={`text-[9px] font-bold uppercase tracking-wide ${theme.textMuted} mb-0.5`}>Share</p>
                <div className="flex flex-col gap-0.5">
                    {data.map((item) => (
                        <span key={item.tone} className={`text-[11px] font-semibold ${theme.textSecondary} truncate`}>
                            <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" style={{ background: item.color }} />
                            {item.label} {fmtPct(item.pct)}
                        </span>
                    ))}
                </div>
            </div>
        </section>
    );
}

export function ReasonsFocus({
    theme,
    currentTheme,
    accent,
    rsn,
    kind,
    year,
    family: _family,
    tone: _tone,
    loading,
    error,
    payload,
    yearOptions,
    onYear,
    onRetry,
    onKindChange: _onKindChange,
    onFamilyChange: _onFamilyChange,
    onToneChange: _onToneChange,
    onOpenTone: _onOpenTone,
}: {
    theme: Theme;
    currentTheme: ThemeName;
    accent: string;
    rsn: string;
    kind: ReasonsKind;
    year: ReasonsYearParam;
    family: ReasonsFamily;
    tone: ReasonsToneParam;
    loading: boolean;
    error: string | null;
    payload: ReasonsDetailResponse | null;
    yearOptions: number[];
    onYear: (next: string) => void;
    onRetry: () => void;
    onKindChange: (kind: ReasonsKind) => void;
    onFamilyChange: (family: ReasonsFamily) => void;
    onToneChange: (tone: ReasonsToneParam) => void;
    onOpenTone: (tone: ReasonsFocusTone) => void;
}) {
    const [metric, setMetric] = useState<'qty' | 'pct'>('qty');
    const [paretoMetric, setParetoMetric] = useState<'qty' | 'rate'>('qty');
    const [paretoGroup, setParetoGroup] = useState('all');
    const [layer, setLayer] = useState<'all' | 'group' | 'forming' | 'size'>('all');
    const [stackPeriod, setStackPeriod] = useState<'month' | 'year'>('month');
    const [exporting, setExporting] = useState(false);
    const trend = payload?.trend || [];
    const compare = (payload?.compare || []).filter((series) => (
        series.trend.some((point) => (Number(point.qty) || 0) > 0)
    ));
    const pool = (payload?.paretoCodeware && payload.paretoCodeware.length > 0)
        ? payload.paretoCodeware
        : (payload?.codeware || []);
    const paretoGroupOptions = reasonsParetoGroupOptions(pool);
    const activeParetoGroup = paretoGroupOptions.some((opt) => opt.value === paretoGroup)
        ? paretoGroup
        : 'all';
    const filteredCodeware = filterReasonsCodewareGroup(pool, activeParetoGroup);
    const rankedCodeware = sortReasonsCodeware(filteredCodeware, paretoMetric);
    const sliced = sliceReasonsCodeware(rankedCodeware);
    const codeware = sliced.codeware;
    const codewareOther = sliced.other;
    const codewareTotal = reasonsCodewareTotal(filteredCodeware);
    const paretoItems = paretoMetric === 'qty'
        ? buildReasonsPareto(filteredCodeware)
        : buildReasonsRatePareto(filteredCodeware);
    const groupSeries = payload?.stratify?.group || [];
    const formingSeries = payload?.stratify?.forming || [];
    const sizeSeries = payload?.stratify?.size || [];
    const canGroup = groupSeries.length > 0;
    const canForming = formingSeries.length > 0;
    const canSize = sizeSeries.length > 0;
    const activeLayer = layer === 'group' && canGroup
        ? 'group'
        : layer === 'forming' && canForming
            ? 'forming'
            : layer === 'size' && canSize
                ? 'size'
                : 'all';
    const overlays = compare.length >= 2;
    const hasTrend = Boolean(
        trend.some((point) => point.qty > 0)
        || compare.some((series) => series.trend.some((point) => point.qty > 0)),
    );
    const kindAccent = kind === 'scrap' ? SCRAP_COLOR : REJECT_COLOR;
    const meta = payload?.meta;
    const yearLabel = formatReasonsYearLabel(year);
    const stratifySeries = (() => {
        const series = activeLayer === 'group'
            ? groupSeries
            : activeLayer === 'forming'
                ? formingSeries
                : activeLayer === 'size'
                    ? sizeSeries
                    : [];
        if (activeLayer === 'group' && activeParetoGroup !== 'all') {
            return series.filter((item) => item.key === activeParetoGroup || item.label === activeParetoGroup);
        }
        return series;
    })();
    const showStacks = activeLayer !== 'all' && stratifySeries.length > 0;
    const currentYearLabel = String(payload?.currentYear || (typeof year === 'number' ? year : payload?.meta.years?.[0] || ''));
    const prevYearLabel = payload?.prevYear ? `${payload.prevYear} (ปีก่อน)` : 'ปีก่อน';
    const yearStackRows = stratifyYearCompare(
        (payload?.stratifyLatest || payload?.stratify)?.[
            activeLayer === 'forming' ? 'forming' : activeLayer === 'size' ? 'size' : 'group'
        ] || [],
        payload?.stratifyPrev?.[
            activeLayer === 'forming' ? 'forming' : activeLayer === 'size' ? 'size' : 'group'
        ],
    );
    const showYearStacks = showStacks && stackPeriod === 'year' && yearStackRows.length > 0;
    const stratifyTrends = stratifyToNamedTrends(stratifySeries);
    const compareHint = overlays
        ? compare.map((series) => series.label).join(' vs ')
        : 'Average line · peak month marked';
    const hasShare = !loading && !error && (payload?.familyShare?.length || 0) > 0;
    const yearCompare = Boolean(payload?.yearStats && payload.yearStats.length >= 2);
    const exportCodeware = async () => {
        if (!pool.length || exporting) return;
        setExporting(true);
        try {
            const res = await fetch('/api/export/reasons-codeware/excel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rsn,
                    year,
                    kind,
                    family: _family,
                    group: 'all',
                    rows: pool,
                }),
            });
            if (!res.ok) throw new Error('Export failed');
            const blob = await res.blob();
            const disposition = res.headers.get('Content-Disposition') ?? '';
            const match = disposition.match(/filename="([^"]+)"/);
            const filename = match?.[1] ?? `Focus_Codeware.xlsx`;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('reasons codeware excel export failed:', err);
            window.alert('Export Excel failed. Please try again.');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="flex-1 min-h-0 flex flex-col p-3 sm:p-4 md:p-6 gap-3 overflow-y-auto">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <h2
                    className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight truncate leading-tight min-w-0 flex-1"
                    style={{ color: kindAccent }}
                    title={rsn}
                >
                    {rsn}
                </h2>
                <label className={`flex items-center gap-1.5 px-2.5 py-1.5 ${theme.inputBg} rounded-xl border ${theme.borderColor} shrink-0`}>
                    <span className={`text-[10px] font-bold ${theme.textMuted}`}>Year</span>
                    <select
                        value={year === 'all' ? 'all' : String(year)}
                        onChange={(e) => onYear(e.target.value)}
                        className={`bg-transparent text-xs font-bold ${theme.textWhite} outline-none cursor-pointer`}
                        title="Select year"
                        style={{ colorScheme: currentTheme }}
                    >
                        <option value="all" className={currentTheme === 'dark' ? 'bg-[#141414] text-white' : 'bg-white text-zinc-900'}>All</option>
                        {yearOptions.map((option) => (
                            <option
                                key={option}
                                value={option}
                                className={currentTheme === 'dark' ? 'bg-[#141414] text-white' : 'bg-white text-zinc-900'}
                            >
                                {option}
                            </option>
                        ))}
                        {year !== 'all' && !yearOptions.includes(year) && (
                            <option
                                value={year}
                                className={currentTheme === 'dark' ? 'bg-[#141414] text-white' : 'bg-white text-zinc-900'}
                            >
                                {year}
                            </option>
                        )}
                    </select>
                </label>
            </div>

            <div className={`grid gap-2 items-stretch ${hasShare ? 'grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(13rem,18rem)]' : ''}`}>
                {yearCompare && payload?.yearStats ? (
                    <YearStatRow theme={theme} stats={payload.yearStats} loading={loading} />
                ) : (
                    <div className="grid grid-cols-3 gap-2">
                        <div className={`px-3 py-2 rounded-xl ${theme.inputBg} border ${theme.borderColor}`}>
                            <p className={`text-[10px] font-bold uppercase tracking-wide ${theme.textMuted}`}>Qty</p>
                            <p className={`text-base font-bold tabular-nums ${theme.textWhite}`}>
                                {loading ? '…' : fmtQty(meta?.qty ?? 0)}
                            </p>
                        </div>
                        <div className={`px-3 py-2 rounded-xl ${theme.inputBg} border ${theme.borderColor}`}>
                            <p className={`text-[10px] font-bold uppercase tracking-wide ${theme.textMuted}`}>Rate vs qtyproc</p>
                            <p className={`text-base font-bold tabular-nums ${theme.textWhite}`}>
                                {loading ? '…' : fmtPct(meta?.pct ?? 0)}
                            </p>
                        </div>
                        <div className={`px-3 py-2 rounded-xl ${theme.inputBg} border ${theme.borderColor}`}>
                            <p className={`text-[10px] font-bold uppercase tracking-wide ${theme.textMuted}`}>Δ vs prev month</p>
                            <p className={`text-base font-bold tabular-nums ${theme.textWhite}`}>
                                {loading ? '…' : fmtDelta(meta?.delta ?? null)}
                            </p>
                        </div>
                    </div>
                )}
                {hasShare && payload?.familyShare && (
                    <FamilyShareDonut theme={theme} items={payload.familyShare} />
                )}
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-3 ${showStacks ? 'items-stretch' : 'items-start'}`}>
                        <div className={`flex flex-col gap-3 min-w-0 ${showStacks ? 'h-full min-h-0' : ''}`}>
                        <section className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl shadow-sm overflow-hidden flex flex-col ${showStacks ? 'h-full min-h-[22rem]' : 'h-[22rem]'}`}>
                            <div className={`px-3 py-2 border-b ${theme.borderColor} shrink-0`}>
                                <div className="flex items-center justify-between gap-2 min-h-[2.25rem]">
                                    <h2 className={`text-sm font-bold ${theme.textWhite} truncate`}>
                                        {showStacks ? 'Trend' : 'Monthly trend'}
                                    </h2>
                                    <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
                                        <SegmentedPills
                                            theme={theme}
                                            value={activeLayer}
                                            onChange={setLayer}
                                            options={[
                                                { value: 'all' as const, label: 'All' },
                                                { value: 'group' as const, label: 'Group', disabled: !canGroup },
                                                { value: 'forming' as const, label: 'Forming', disabled: !canForming },
                                                { value: 'size' as const, label: 'Size', disabled: !canSize },
                                            ]}
                                            activeColor={accent}
                                        />
                                        <div className="shrink-0">
                                            {activeLayer === 'all' ? (
                                                <SegmentedPills
                                                    theme={theme}
                                                    value={metric}
                                                    onChange={setMetric}
                                                    options={[
                                                        { value: 'qty', label: 'Qty' },
                                                        { value: 'pct', label: 'Rate' },
                                                    ]}
                                                    activeColor={accent}
                                                />
                                            ) : (
                                                <SegmentedPills
                                                    theme={theme}
                                                    value={stackPeriod}
                                                    onChange={setStackPeriod}
                                                    options={[
                                                        { value: 'month', label: 'Month' },
                                                        { value: 'year', label: 'Year' },
                                                    ]}
                                                    activeColor={accent}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <p className={`text-[11px] ${theme.textMuted} min-h-[1.25rem] leading-5`}>
                                    {showYearStacks
                                        ? `${currentYearLabel} vs ${prevYearLabel} · ranked ${activeLayer} · share %`
                                        : showStacks
                                            ? `Ranked ${activeLayer} · Mix-style line · own scale`
                                            : compareHint}
                                </p>
                            </div>
                            <div className="flex-1 min-h-0">
                                {loading && <TrendSkeleton theme={theme} />}
                                {!loading && error && (
                                    <PaneError
                                        theme={theme}
                                        accent={accent}
                                        title="Could not load trend"
                                        error={error}
                                        onRetry={onRetry}
                                    />
                                )}
                                {!loading && !error && !hasTrend && (
                                    <p className={`px-4 py-12 text-center text-sm ${theme.textMuted}`}>
                                        No monthly qty for this defect in {yearLabel}.
                                    </p>
                                )}
                                {!loading && !error && hasTrend && (
                                    <div className={`h-full min-h-0 ${showStacks ? 'p-1' : 'p-3 min-h-[16rem]'}`}>
                                        {showYearStacks ? (
                                            <StratifyYearChart
                                                rows={yearStackRows}
                                                currentTheme={currentTheme}
                                                currentLabel={currentYearLabel || 'Year'}
                                                prevLabel={prevYearLabel}
                                            />
                                        ) : showStacks ? (
                                            <TrendChart
                                                trend={stratifyTrends[0]?.trend || trend}
                                                compare={stratifyTrends}
                                                accent={accent}
                                                currentTheme={currentTheme}
                                                peakMo={null}
                                                metric="qty"
                                                splitPanels
                                            />
                                        ) : (
                                            <TrendChart
                                                trend={trend}
                                                compare={compare}
                                                accent={accent}
                                                currentTheme={currentTheme}
                                                peakMo={meta?.peakMo ?? null}
                                                metric={metric}
                                            />
                                        )}
                                    </div>
                                )}
                            </div>
                        </section>
                        </div>

                        <section className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[22rem] ${showStacks ? 'h-full' : ''}`}>
                            <div className={`px-3 py-2 border-b ${theme.borderColor} shrink-0`}>
                                <div className="flex items-center justify-between gap-2 min-h-[2.25rem]">
                                    <h2 className={`text-sm font-bold ${theme.textWhite} truncate`}>Pareto · codeware</h2>
                                    <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
                                        <SegmentedPills
                                            theme={theme}
                                            value={paretoMetric}
                                            onChange={setParetoMetric}
                                            options={[
                                                { value: 'qty', label: 'Qty' },
                                                { value: 'rate', label: 'Rate' },
                                            ]}
                                            activeColor={accent}
                                        />
                                        <label className={`flex items-center gap-1.5 px-2.5 py-1.5 ${theme.inputBg} rounded-xl border ${theme.borderColor} shrink-0 w-[10.75rem]`}>
                                            <span className={`text-[10px] font-bold ${theme.textMuted}`}>Group</span>
                                            <select
                                                value={activeParetoGroup}
                                                onChange={(e) => setParetoGroup(e.target.value)}
                                                className={`bg-transparent text-xs font-bold ${theme.textWhite} outline-none cursor-pointer min-w-0 flex-1`}
                                                title="Filter Pareto by codeware group"
                                                style={{ colorScheme: currentTheme }}
                                            >
                                                <option value="all" className={currentTheme === 'dark' ? 'bg-[#141414] text-white' : 'bg-white text-zinc-900'}>All</option>
                                                {paretoGroupOptions.map((opt) => (
                                                    <option
                                                        key={opt.value}
                                                        value={opt.value}
                                                        className={currentTheme === 'dark' ? 'bg-[#141414] text-white' : 'bg-white text-zinc-900'}
                                                    >
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={exportCodeware}
                                            disabled={exporting || loading || pool.length === 0}
                                            className={`p-1.5 rounded-lg ${theme.inputBg} border ${theme.borderColor} ${theme.textMuted} disabled:opacity-40`}
                                            title="Export all codeware Qty and Rate to Excel"
                                        >
                                            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                                        </button>
                                    </div>
                                </div>
                                <p className={`text-[11px] ${theme.textMuted} min-h-[1.25rem] leading-5 truncate`}>
                                    {paretoMetric === 'qty'
                                        ? `All by qty · 80% line · qtyproc ≥ ${REASONS_CODEWARE_MIN_QTYPROC.toLocaleString()}`
                                        : `Top ${REASONS_CODEWARE_TOP_N} by rate · qtyproc ≥ ${REASONS_CODEWARE_MIN_QTYPROC.toLocaleString()}`}
                                </p>
                            </div>
                            <div className="h-[16.5rem] shrink-0">
                            {!loading && !error && paretoItems.length > 0 && (
                                <CodewarePareto items={paretoItems} currentTheme={currentTheme} accent={accent} metric={paretoMetric} />
                            )}
                            </div>
                            <CodewareList
                                theme={theme}
                                accent={accent}
                                family={_family}
                                items={codeware}
                                other={codewareOther}
                                total={codewareTotal.qty > 0 ? codewareTotal : undefined}
                                metric={paretoMetric}
                                loading={loading}
                                error={error}
                                empty={!loading && !error && codeware.length === 0 && !codewareOther}
                                year={year}
                                onRetry={onRetry}
                            />
                            <div className={`px-3 py-2 border-t ${theme.borderColor}`}>
                                <p className={`text-[11px] ${theme.textMuted}`}>
                                    {payload
                                        ? `${payload.meta.generatedAt}${payload.meta.stale ? ' · stale' : ''}`
                                        : loading
                                            ? 'Loading…'
                                            : '—'}
                                </p>
                            </div>
                        </section>
                    </div>
        </div>
    );
}
