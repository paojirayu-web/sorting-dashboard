"use client";

import { useMemo, useState } from 'react';
import {
    Area,
    CartesianGrid,
    Cell,
    ComposedChart,
    Pie,
    PieChart,
    ReferenceDot,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import type { Theme, ThemeName } from '@/lib/themes';
import {
    REASONS_DW_TONE_OPTIONS,
    REASONS_FAMILY_OPTIONS,
    REASONS_FOCUS_TONES,
    REASONS_TONE_LABEL,
    REASONS_WW_TONE_OPTIONS,
    type ReasonsDetailResponse,
    type ReasonsFamily,
    type ReasonsFamilyShareItem,
    type ReasonsFocusTone,
    type ReasonsKind,
    type ReasonsToneParam,
    type ReasonsToneSeries,
    type ReasonsTrendPoint,
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

const CODE_COLS = 'grid grid-cols-[1.25rem_minmax(0,1fr)_minmax(3rem,auto)_2.25rem] gap-x-2 items-center';
const SKELETON_ROWS = 8;
const SCRAP_COLOR = '#ef4444';
const REJECT_COLOR = '#f97316';

export const REASONS_TONE_COLOR: Record<ReasonsFocusTone, string> = {
    white: '#0d9488',
    black: '#db2777',
    inglaze: '#d97706',
    onglaze: '#9333ea',
};

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
                <div key={i} className={`${CODE_COLS} px-3 py-2.5 border-b ${theme.borderColor}`}>
                    <div className={`h-3 w-5 rounded ${theme.inputBg} animate-pulse`} />
                    <div className={`h-3 w-full max-w-[10rem] rounded ${theme.inputBg} animate-pulse`} />
                    <div className={`h-3 w-10 justify-self-end rounded ${theme.inputBg} animate-pulse`} />
                    <div className={`h-3 w-7 justify-self-end rounded ${theme.inputBg} animate-pulse`} />
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
    payload?: { payload?: ReasonsTrendPoint }[];
    currentTheme: ThemeName;
}) {
    if (!active || !payload?.[0]?.payload) return null;
    const row = payload[0].payload;
    const bg = currentTheme === 'dark' ? '#141414' : '#ffffff';
    const border = currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    const muted = currentTheme === 'dark' ? '#9ca3af' : '#6b7280';
    return (
        <div className="rounded-xl px-3 py-2 text-xs shadow-lg" style={{ background: bg, border: `1px solid ${border}` }}>
            <p className="font-bold mb-1">{row.label}</p>
            <p>Qty {fmtQty(row.qty)}</p>
            <p>% {fmtPct(row.pct)}</p>
            <p style={{ color: muted }}>Δ {fmtDelta(row.delta)}</p>
        </div>
    );
}

function TrendChart({
    trend,
    accent,
    currentTheme,
    metric,
    peakMo,
}: {
    trend: ReasonsTrendPoint[];
    accent: string;
    currentTheme: ThemeName;
    metric: 'qty' | 'pct';
    peakMo: number | null;
}) {
    const tick = currentTheme === 'dark' ? '#9ca3af' : '#6b7280';
    const grid = currentTheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
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

function MiniPctChart({
    trend,
    color,
    yMax,
    currentTheme,
}: {
    trend: ReasonsTrendPoint[];
    color: string;
    yMax: number;
    currentTheme: ThemeName;
}) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <YAxis domain={[0, Math.max(yMax, 1)]} hide />
                <XAxis dataKey="label" hide />
                <Tooltip content={<TrendTooltip currentTheme={currentTheme} />} />
                <Area type="monotone" dataKey="pct" stroke={color} strokeWidth={1.5} fill={color} fillOpacity={0.18} />
            </ComposedChart>
        </ResponsiveContainer>
    );
}

function CodewareList({
    theme,
    accent,
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
    items: ReasonsDetailResponse['codeware'];
    other?: ReasonsDetailResponse['other'];
    loading: boolean;
    error: string | null;
    empty: boolean;
    year: number;
    onRetry: () => void;
}) {
    const rows = other ? [...items, other] : items;
    return (
        <>
            <div className={`${CODE_COLS} px-3 py-2 border-b ${theme.borderColor}`}>
                <span className={`text-[10px] font-bold uppercase tracking-wide ${theme.textMuted}`}>#</span>
                <span className={`text-[10px] font-bold uppercase tracking-wide ${theme.textMuted}`}>Code</span>
                <span className={`justify-self-end text-[10px] font-bold uppercase tracking-wide ${theme.textMuted}`}>Qty</span>
                <span className={`justify-self-end text-[10px] font-bold uppercase tracking-wide ${theme.textMuted}`}>%</span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
                {loading && <CodewareSkeleton theme={theme} />}
                {!loading && error && (
                    <PaneError theme={theme} accent={accent} title="Could not load codeware" error={error} onRetry={onRetry} />
                )}
                {!loading && !error && empty && (
                    <p className={`px-4 py-12 text-center text-sm ${theme.textMuted}`}>
                        No codeware for this defect in {year}.
                    </p>
                )}
                {!loading && !error && rows.map((item, i) => {
                    const isOther = item.code === 'Other';
                    return (
                        <div key={`${item.code}-${i}`} className={`relative ${CODE_COLS} px-3 py-2.5 border-b ${theme.borderColor}`}>
                            <span
                                className="absolute inset-y-0 left-0 rounded-sm"
                                style={{ width: `${Math.min(100, Math.max(0, item.pct))}%`, background: accent, opacity: 0.12 }}
                                aria-hidden
                            />
                            <span className={`relative tabular-nums text-xs font-bold ${theme.textMuted}`}>
                                {isOther ? '—' : i + 1}
                            </span>
                            <span className={`relative text-xs sm:text-sm font-bold leading-snug whitespace-normal break-words ${theme.textSecondary}`}>
                                {item.code}
                            </span>
                            <span className="relative tabular-nums text-right text-xs font-semibold" style={{ color: accent }}>
                                {fmtQty(item.qty)}
                            </span>
                            <span className={`relative tabular-nums text-right text-xs ${theme.textMuted}`}>
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
    const data = items.map((item) => ({ ...item, color: REASONS_TONE_COLOR[item.tone] }));
    return (
        <section className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl shadow-sm px-3 py-2 flex flex-wrap items-center gap-3`}>
            <div className="h-24 w-24 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey="qty"
                            nameKey="label"
                            innerRadius={28}
                            outerRadius={40}
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
                <p className={`text-[10px] font-bold uppercase tracking-wide ${theme.textMuted} mb-1`}>Share within family</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {data.map((item) => (
                        <span key={item.tone} className={`text-xs font-semibold ${theme.textSecondary}`}>
                            <span className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle" style={{ background: item.color }} />
                            {item.label} {fmtPct(item.pct)}
                            <span className={`ml-1 font-medium ${theme.textMuted}`}>{fmtQty(item.qty)}</span>
                        </span>
                    ))}
                </div>
            </div>
        </section>
    );
}

function AllMode({
    theme,
    currentTheme,
    loading,
    error,
    payload,
    year,
    accent,
    onRetry,
    onOpenTone,
}: {
    theme: Theme;
    currentTheme: ThemeName;
    loading: boolean;
    error: string | null;
    payload: ReasonsDetailResponse | null;
    year: number;
    accent: string;
    onRetry: () => void;
    onOpenTone: (tone: ReasonsFocusTone) => void;
}) {
    const series = payload?.series || [];
    const byTone = useMemo(() => {
        const map = new Map<ReasonsFocusTone, ReasonsToneSeries>();
        for (const item of series) map.set(item.tone, item);
        return map;
    }, [series]);
    const sharedPctMax = useMemo(() => {
        let max = 0;
        for (const item of series) {
            for (const point of item.trend) max = Math.max(max, point.pct);
        }
        return Math.max(1, max);
    }, [series]);
    const activeTone = payload?.activeTone || 'white';
    const codeware = payload?.codeware || [];

    return (
        <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {REASONS_FOCUS_TONES.map((tone) => {
                    const item = byTone.get(tone);
                    const color = REASONS_TONE_COLOR[tone];
                    const selected = tone === activeTone;
                    return (
                        <button
                            key={tone}
                            type="button"
                            onClick={() => onOpenTone(tone)}
                            className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl shadow-sm text-left overflow-hidden`}
                            style={selected ? { outline: `2px solid ${color}` } : undefined}
                            aria-label={`Open ${REASONS_TONE_LABEL[tone]} Focus`}
                        >
                            <div className={`px-3 py-2 border-b ${theme.borderColor} flex items-center justify-between gap-2`}>
                                <span className={`text-sm font-bold ${theme.textWhite}`}>{REASONS_TONE_LABEL[tone]}</span>
                                <span className={`text-[11px] tabular-nums ${theme.textMuted}`}>
                                    {item ? `${fmtPct(item.meta.pct)} · Δ ${fmtDelta(item.meta.delta)}` : '—'}
                                </span>
                            </div>
                            <div className="h-28 px-1">
                                {loading && <div className={`h-full m-2 rounded-xl ${theme.inputBg} animate-pulse`} />}
                                {!loading && item && (
                                    <MiniPctChart trend={item.trend} color={color} yMax={sharedPctMax} currentTheme={currentTheme} />
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            <section className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl shadow-sm overflow-hidden`}>
                <div className={`px-3 py-2.5 border-b ${theme.borderColor}`}>
                    <h2 className={`text-sm font-bold ${theme.textWhite}`}>Tone comparison</h2>
                    <p className={`text-[11px] ${theme.textMuted}`}>Shared % scale · do not compare raw qty across lines</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className={`border-b ${theme.borderColor}`}>
                                <th className={`px-3 py-2 font-bold uppercase tracking-wide ${theme.textMuted} text-left`}>Tone</th>
                                <th className={`px-3 py-2 font-bold uppercase tracking-wide ${theme.textMuted} text-right`}>Qty</th>
                                <th className={`px-3 py-2 font-bold uppercase tracking-wide ${theme.textMuted} text-right`}>%</th>
                                <th className={`px-3 py-2 font-bold uppercase tracking-wide ${theme.textMuted} text-right`}>Δ</th>
                                <th className={`px-3 py-2 font-bold uppercase tracking-wide ${theme.textMuted} text-right`}>Peak</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr><td colSpan={5} className={`px-3 py-6 ${theme.textMuted}`}>Loading…</td></tr>
                            )}
                            {!loading && error && (
                                <tr>
                                    <td colSpan={5}>
                                        <PaneError theme={theme} accent={accent} title="Could not load comparison" error={error} onRetry={onRetry} />
                                    </td>
                                </tr>
                            )}
                            {!loading && !error && REASONS_FOCUS_TONES.map((tone) => {
                                const item = byTone.get(tone);
                                return (
                                    <tr
                                        key={tone}
                                        className={`border-b ${theme.borderColor} ${theme.tableRowHover} cursor-pointer`}
                                        onClick={() => onOpenTone(tone)}
                                    >
                                        <td className={`px-3 py-2 font-bold ${theme.textSecondary}`}>
                                            <span className="inline-block w-2 h-2 rounded-full mr-2 align-middle" style={{ background: REASONS_TONE_COLOR[tone] }} />
                                            {REASONS_TONE_LABEL[tone]}
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums">{item ? fmtQty(item.meta.qty) : '—'}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{item ? fmtPct(item.meta.pct) : '—'}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{item ? fmtDelta(item.meta.delta) : '—'}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{item?.meta.peakLabel || '—'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[16rem]`}>
                <div className={`px-3 py-2.5 border-b ${theme.borderColor}`}>
                    <h2 className={`text-sm font-bold ${theme.textWhite}`}>
                        Top codeware · {REASONS_TONE_LABEL[activeTone]}
                    </h2>
                    <p className={`text-[11px] ${theme.textMuted}`}>Click a tone card to open single-tone Focus</p>
                </div>
                <CodewareList
                    theme={theme}
                    accent={REASONS_TONE_COLOR[activeTone]}
                    items={codeware}
                    other={payload?.other}
                    loading={loading}
                    error={error}
                    empty={!loading && !error && codeware.length === 0 && !payload?.other}
                    year={year}
                    onRetry={onRetry}
                />
            </section>
        </div>
    );
}

export function ReasonsFocus({
    theme,
    currentTheme,
    accent,
    rsn,
    kind,
    year,
    family,
    tone,
    loading,
    error,
    payload,
    onBack,
    onRetry,
    onKindChange,
    onFamilyChange,
    onToneChange,
    onOpenTone,
}: {
    theme: Theme;
    currentTheme: ThemeName;
    accent: string;
    rsn: string;
    kind: ReasonsKind;
    year: number;
    family: ReasonsFamily;
    tone: ReasonsToneParam;
    loading: boolean;
    error: string | null;
    payload: ReasonsDetailResponse | null;
    onBack: () => void;
    onRetry: () => void;
    onKindChange: (kind: ReasonsKind) => void;
    onFamilyChange: (family: ReasonsFamily) => void;
    onToneChange: (tone: ReasonsToneParam) => void;
    onOpenTone: (tone: ReasonsFocusTone) => void;
}) {
    const [metric, setMetric] = useState<'qty' | 'pct'>('qty');
    const trend = payload?.trend || [];
    const codeware = payload?.codeware || [];
    const hasTrend = trend.some((point) => point.qty > 0);
    const isAll = family === 'all';
    const kindAccent = kind === 'scrap' ? SCRAP_COLOR : REJECT_COLOR;
    const meta = payload?.meta;
    const toneOptions = family === 'ww' ? REASONS_WW_TONE_OPTIONS : REASONS_DW_TONE_OPTIONS;

    return (
        <div className="flex-1 min-h-0 flex flex-col p-3 sm:p-4 md:p-6 gap-3 overflow-y-auto">
            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={onBack}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl ${theme.inputBg} border ${theme.borderColor} text-xs font-bold ${theme.textSecondary}`}
                >
                    <ArrowLeft size={14} />
                    Overview
                </button>
                <span
                    className="inline-flex items-center gap-2 max-w-full px-2.5 py-1.5 rounded-xl text-xs font-bold text-white"
                    style={{ background: kindAccent }}
                    title={rsn}
                >
                    <span className="truncate">{rsn}</span>
                </span>
                <SegmentedPills
                    theme={theme}
                    value={kind}
                    onChange={onKindChange}
                    options={[
                        { value: 'scrap', label: 'Scrap' },
                        { value: 'reject', label: 'Reject' },
                    ]}
                    activeColor={kind === 'scrap' ? SCRAP_COLOR : REJECT_COLOR}
                />
                <SegmentedPills
                    theme={theme}
                    value={family}
                    onChange={onFamilyChange}
                    options={REASONS_FAMILY_OPTIONS}
                    activeColor="#2563eb"
                />
                {family !== 'all' && (
                    <SegmentedPills
                        theme={theme}
                        value={tone}
                        onChange={onToneChange}
                        options={toneOptions}
                        className="dash-subfade"
                        activeColor={kindAccent}
                    />
                )}
                <span className={`text-[11px] ${theme.textMuted}`}>
                    Reasons Focus · {year}
                </span>
            </div>

            {isAll ? (
                <AllMode
                    theme={theme}
                    currentTheme={currentTheme}
                    loading={loading}
                    error={error}
                    payload={payload}
                    year={year}
                    accent={accent}
                    onRetry={onRetry}
                    onOpenTone={onOpenTone}
                />
            ) : (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className={`px-3 py-2 rounded-xl ${theme.inputBg} border ${theme.borderColor}`}>
                            <p className={`text-[10px] font-bold uppercase tracking-wide ${theme.textMuted}`}>Qty</p>
                            <p className={`text-sm font-bold tabular-nums ${theme.textWhite}`}>
                                {loading ? '…' : fmtQty(meta?.qty ?? 0)}
                            </p>
                        </div>
                        <div className={`px-3 py-2 rounded-xl ${theme.inputBg} border ${theme.borderColor}`}>
                            <p className={`text-[10px] font-bold uppercase tracking-wide ${theme.textMuted}`}>% of kind</p>
                            <p className={`text-sm font-bold tabular-nums ${theme.textWhite}`}>
                                {loading ? '…' : fmtPct(meta?.pct ?? 0)}
                            </p>
                        </div>
                        <div className={`px-3 py-2 rounded-xl ${theme.inputBg} border ${theme.borderColor}`}>
                            <p className={`text-[10px] font-bold uppercase tracking-wide ${theme.textMuted}`}>Rank</p>
                            <p className={`text-sm font-bold tabular-nums ${theme.textWhite}`}>
                                {loading ? '…' : meta?.rank != null ? `#${meta.rank}` : '—'}
                            </p>
                        </div>
                        <div className={`px-3 py-2 rounded-xl ${theme.inputBg} border ${theme.borderColor}`}>
                            <p className={`text-[10px] font-bold uppercase tracking-wide ${theme.textMuted}`}>Δ vs prev month</p>
                            <p className={`text-sm font-bold tabular-nums ${theme.textWhite}`}>
                                {loading ? '…' : fmtDelta(meta?.delta ?? null)}
                            </p>
                        </div>
                    </div>

                    <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-3">
                        <section className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[18rem]`}>
                            <div className={`px-3 py-2.5 border-b ${theme.borderColor} flex flex-wrap items-center justify-between gap-2`}>
                                <div>
                                    <h2 className={`text-sm font-bold ${theme.textWhite}`}>Monthly trend</h2>
                                    <p className={`text-[11px] ${theme.textMuted}`}>Average line · peak month marked</p>
                                </div>
                                <SegmentedPills
                                    theme={theme}
                                    value={metric}
                                    onChange={setMetric}
                                    options={[
                                        { value: 'qty', label: 'Qty' },
                                        { value: 'pct', label: '%' },
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
                                        No monthly qty for this defect in {year}.
                                    </p>
                                )}
                                {!loading && !error && hasTrend && (
                                    <div className="h-full min-h-[16rem] p-3">
                                        <TrendChart
                                            trend={trend}
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
                                <p className={`text-[11px] ${theme.textMuted}`}>Top 15 + Other · share of this defect</p>
                            </div>
                            <CodewareList
                                theme={theme}
                                accent={accent}
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

                    {!loading && !error && payload?.familyShare && payload.familyShare.length > 0 && (
                        <FamilyShareDonut theme={theme} items={payload.familyShare} />
                    )}
                </>
            )}
        </div>
    );
}
