"use client";

import { useState } from 'react';
import {
    Area,
    CartesianGrid,
    Cell,
    ComposedChart,
    Legend,
    Line,
    Pie,
    PieChart,
    ReferenceDot,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { RefreshCw } from 'lucide-react';
import type { Theme, ThemeName } from '@/lib/themes';
import {
    REASONS_CODEWARE_MIN_QTYPROC,
    REASONS_TONE_COLOR,
    REASONS_TONE_LABEL,
    formatReasonsYearLabel,
    type ReasonsDetailResponse,
    type ReasonsFamily,
    type ReasonsFamilyShareItem,
    type ReasonsFocusTone,
    type ReasonsKind,
    type ReasonsNamedTrend,
    type ReasonsToneParam,
    type ReasonsTrendPoint,
    type ReasonsYearParam,
    type ReasonsYearStat,
} from '@/lib/reasons';

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
    options: { value: T; label: string }[];
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
                        onClick={() => onChange(opt.value)}
                        className={`px-2 sm:px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold leading-tight transition-colors whitespace-nowrap ${
                            active ? 'text-white shadow-md' : `${theme.textMuted} hover:${theme.textWhite}`
                        }`}
                        style={active ? { background: activeColor || '#2563eb' } : undefined}
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

function TrendTooltip({
    active,
    payload,
    currentTheme,
}: {
    active?: boolean;
    payload?: { payload?: ReasonsTrendPoint; name?: string; value?: number; color?: string; dataKey?: string }[];
    currentTheme: ThemeName;
}) {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload;
    const bg = currentTheme === 'dark' ? '#141414' : '#ffffff';
    const border = currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    const muted = currentTheme === 'dark' ? '#9ca3af' : '#6b7280';
    const dataKey = String(payload[0]?.dataKey || '');
    const isSingle = dataKey === 'qty' || dataKey === 'pct';
    return (
        <div className="rounded-xl px-3 py-2 text-xs shadow-lg" style={{ background: bg, border: `1px solid ${border}` }}>
            <p className="font-bold mb-1">{row?.label}</p>
            {!isSingle ? payload.map((entry) => {
                const key = String(entry.dataKey || '');
                const asPct = key === 'pct' || key.endsWith('_pct') || (!key.endsWith('_qty') && key !== 'qty');
                return (
                    <p key={key} className="tabular-nums flex justify-between gap-4">
                        <span style={{ color: entry.color }}>{entry.name}</span>
                        <span>{asPct ? fmtPct(Number(entry.value) || 0) : fmtQty(Number(entry.value) || 0)}</span>
                    </p>
                );
            }) : row ? (
                <>
                    <p>Qty {fmtQty(row.qty)}</p>
                    <p>% {fmtPct(row.pct)}</p>
                    <p style={{ color: muted }}>Δ {fmtDelta(row.delta)}</p>
                </>
            ) : null}
        </div>
    );
}

function TrendChart({
    trend,
    compare,
    accent,
    currentTheme,
    metric,
    peakMo,
}: {
    trend: ReasonsTrendPoint[];
    compare?: ReasonsNamedTrend[];
    accent: string;
    currentTheme: ThemeName;
    metric: 'qty' | 'pct';
    peakMo: number | null;
}) {
    const tick = currentTheme === 'dark' ? '#9ca3af' : '#6b7280';
    const grid = currentTheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    const overlays = compare && compare.length >= 2 ? compare : null;
    if (overlays) {
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
                            metric === 'pct' ? `${Number(value).toFixed(0)}%` : Number(value).toLocaleString()
                        )}
                    />
                    <Tooltip content={<TrendTooltip currentTheme={currentTheme} />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {overlays.map((series) => (
                        <Line
                            key={series.key}
                            type="monotone"
                            dataKey={metric === 'qty' ? `${series.key}_qty` : `${series.key}_pct`}
                            name={series.label}
                            stroke={series.color}
                            strokeWidth={2.2}
                            dot={{ r: 3.5, fill: series.color, strokeWidth: 0 }}
                            activeDot={{ r: 5, fill: series.color, strokeWidth: 0 }}
                        />
                    ))}
                </ComposedChart>
            </ResponsiveContainer>
        );
    }
    const values = trend.map((point) => (metric === 'qty' ? point.qty : point.pct));
    const avg = values.length ? values.reduce((sum, n) => sum + n, 0) / values.length : 0;
    const peak = peakMo != null ? trend.find((point) => point.mo === peakMo) : undefined;
    const peakY = peak ? (metric === 'qty' ? peak.qty : peak.pct) : null;
    const dataKey = metric === 'qty' ? 'qty' : 'pct';

    return (
        <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="reasonsFocusTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={accent} stopOpacity={0.35} />
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
                        metric === 'pct' ? `${Number(value).toFixed(0)}%` : Number(value).toLocaleString()
                    )}
                />
                <Tooltip content={<TrendTooltip currentTheme={currentTheme} />} />
                <Area
                    type="monotone"
                    dataKey={dataKey}
                    name={metric === 'qty' ? 'Qty' : '%'}
                    stroke={accent}
                    strokeWidth={2}
                    fill="url(#reasonsFocusTrend)"
                />
                <ReferenceLine y={avg} stroke={tick} strokeDasharray="4 4" strokeOpacity={0.7} />
                {peak && peakY != null && peakY > 0 && (
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

function CodewareList({
    theme,
    accent,
    family,
    items,
    other,
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
    loading: boolean;
    error: string | null;
    empty: boolean;
    year: ReasonsYearParam;
    onRetry: () => void;
}) {
    const rows = other ? [...items, other] : items;
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
                {!loading && !error && rows.map((item, i) => {
                    const isOther = item.code === 'Other';
                    const toneColor = item.tone ? REASONS_TONE_COLOR[item.tone] : accent;
                    const toneLabel = item.tone ? REASONS_TONE_LABEL[item.tone] : '';
                    const desc1 = item.desc1 || item.code.replace(/\s+\([^()]+\)$/, '').trim() || item.code;
                    const desc2 = item.desc2 || (/\s+\(([^()]+)\)$/.exec(item.code)?.[1] || '');
                    const stackDw = !isOther && Boolean(desc2) && (
                        family === 'dw'
                        || item.tone === 'inglaze'
                        || item.tone === 'onglaze'
                    );
                    return (
                        <div key={`${item.tone || 'x'}-${item.code}-${i}`} className={`relative ${CODE_ROW} border-b ${theme.borderColor} ${stackDw ? 'py-1.5 items-start' : ''}`}>
                            <span
                                className="absolute inset-y-0 left-0 rounded-sm"
                                style={{ width: `${Math.min(100, Math.max(0, item.pct))}%`, background: toneColor, opacity: 0.12 }}
                                aria-hidden
                            />
                            <span className={`relative tabular-nums text-[10px] font-bold ${theme.textMuted} ${stackDw ? 'pt-0.5' : ''}`}>
                                {isOther ? '—' : i + 1}
                            </span>
                            <span
                                className={`relative min-w-0 ${isOther ? theme.textSecondary : ''}`}
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
                                        className="block text-[11px] font-semibold leading-tight truncate"
                                        style={isOther ? undefined : { color: toneColor }}
                                    >
                                        {item.code}
                                    </span>
                                )}
                            </span>
                            <span className={`relative tabular-nums text-right text-[11px] font-semibold ${stackDw ? 'pt-0.5' : ''}`} style={{ color: toneColor }}>
                                {fmtQty(item.qty)}
                            </span>
                            <span className={`relative tabular-nums text-right text-[10px] ${theme.textMuted} ${stackDw ? 'pt-0.5' : ''}`}>
                                {fmtQty(item.qtyproc)}
                            </span>
                            <span
                                className={`relative tabular-nums text-right text-[10px] font-semibold ${isOther ? theme.textMuted : ''} ${stackDw ? 'pt-0.5' : ''}`}
                                style={isOther ? undefined : { color: toneColor }}
                            >
                                {item.pct.toFixed(1)}
                            </span>
                        </div>
                    );
                })}
            </div>
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
    const trend = payload?.trend || [];
    const compare = (payload?.compare || []).filter((series) => (
        series.trend.some((point) => (Number(point.qty) || 0) > 0)
    ));
    const codeware = payload?.codeware || [];
    const hasTrend = Boolean(
        trend.some((point) => point.qty > 0)
        || compare.some((series) => series.trend.some((point) => point.qty > 0)),
    );
    const kindAccent = kind === 'scrap' ? SCRAP_COLOR : REJECT_COLOR;
    const meta = payload?.meta;
    const yearLabel = formatReasonsYearLabel(year);
    const compareHint = compare && compare.length >= 2
        ? compare.map((series) => series.label).join(' vs ')
        : 'Average line · peak month marked';
    const hasShare = !loading && !error && (payload?.familyShare?.length || 0) > 0;
    const yearCompare = Boolean(payload?.yearStats && payload.yearStats.length >= 2);

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

            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-3">
                        <section className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[18rem]`}>
                            <div className={`px-3 py-2.5 border-b ${theme.borderColor} flex flex-wrap items-center justify-between gap-2`}>
                                <div>
                                    <h2 className={`text-sm font-bold ${theme.textWhite}`}>Monthly trend</h2>
                                    <p className={`text-[11px] ${theme.textMuted}`}>{compareHint}</p>
                                </div>
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
                                    <div className="h-full min-h-[16rem] p-3">
                                        <TrendChart
                                            trend={trend}
                                            compare={compare}
                                            accent={accent}
                                            currentTheme={currentTheme}
                                            metric={metric}
                                            peakMo={meta?.peakMo ?? null}
                                        />
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[18rem]`}>
                            <div className={`px-3 py-2.5 border-b ${theme.borderColor}`}>
                                <h2 className={`text-sm font-bold ${theme.textWhite}`}>Top codeware</h2>
                                <p className={`text-[11px] ${theme.textMuted}`}>
                                    Top 10 + Other · qtyproc ≥ {REASONS_CODEWARE_MIN_QTYPROC.toLocaleString()}
                                </p>
                            </div>
                            <CodewareList
                                theme={theme}
                                accent={accent}
                                family={_family}
                                items={codeware}
                                other={payload?.other}
                                loading={loading}
                                error={error}
                                empty={!loading && !error && codeware.length === 0 && !payload?.other}
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
