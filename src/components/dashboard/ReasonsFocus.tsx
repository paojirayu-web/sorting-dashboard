"use client";

import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import type { Theme, ThemeName } from '@/lib/themes';
import type { ReasonsDetailResponse, ReasonsKind } from '@/lib/reasons';

function fmtQty(n: number): string {
    return Math.round(n).toLocaleString();
}

const CODE_COLS = 'grid grid-cols-[1.25rem_minmax(0,1fr)_minmax(3rem,auto)_2.25rem] gap-x-2 items-center';
const SKELETON_ROWS = 8;

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

export function ReasonsFocus({
    theme,
    currentTheme,
    accent,
    rsn,
    kind,
    year,
    loading,
    error,
    payload,
    onBack,
    onRetry,
}: {
    theme: Theme;
    currentTheme: ThemeName;
    accent: string;
    rsn: string;
    kind: ReasonsKind;
    year: number;
    loading: boolean;
    error: string | null;
    payload: ReasonsDetailResponse | null;
    onBack: () => void;
    onRetry: () => void;
}) {
    const tick = currentTheme === 'dark' ? '#9ca3af' : '#6b7280';
    const grid = currentTheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    const trend = payload?.trend || [];
    const codeware = payload?.codeware || [];
    const hasTrend = trend.some((point) => point.qty > 0);
    const qty = payload?.meta.qty ?? 0;

    return (
        <div className="flex-1 min-h-0 flex flex-col p-3 sm:p-4 md:p-6 gap-3">
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
                    style={{ background: accent }}
                    title={rsn}
                >
                    <span className="truncate">{rsn}</span>
                    <span className="opacity-80 font-semibold shrink-0">
                        {kind === 'scrap' ? 'Scrap' : 'Reject'}
                        {payload && !loading ? ` · ${fmtQty(qty)}` : ''}
                    </span>
                </span>
                <span className={`text-[11px] ${theme.textMuted}`}>
                    Reasons Focus · {year} · not Mix, not the main dashboard
                </span>
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-3">
                <section className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[18rem]`}>
                    <div className={`px-3 py-2.5 border-b ${theme.borderColor}`}>
                        <h2 className={`text-sm font-bold ${theme.textWhite}`}>Monthly trend</h2>
                        <p className={`text-[11px] ${theme.textMuted}`}>Qty by month for this defect</p>
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
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={trend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
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
                                            tickFormatter={(value: number) => Number(value).toLocaleString()}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: currentTheme === 'dark' ? '#141414' : '#ffffff',
                                                border: `1px solid ${currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                                                borderRadius: '12px',
                                                fontSize: 12,
                                            }}
                                            formatter={(value) => [fmtQty(Number(value) || 0), 'Qty']}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="qty"
                                            name="Qty"
                                            stroke={accent}
                                            strokeWidth={2}
                                            fill="url(#reasonsFocusTrend)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </section>

                <section className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[18rem]`}>
                    <div className={`px-3 py-2.5 border-b ${theme.borderColor}`}>
                        <h2 className={`text-sm font-bold ${theme.textWhite}`}>Top codeware</h2>
                        <p className={`text-[11px] ${theme.textMuted}`}>Share of this defect</p>
                    </div>
                    <div className={`${CODE_COLS} px-3 py-2 border-b ${theme.borderColor}`}>
                        <span className={`text-[10px] font-bold uppercase tracking-wide ${theme.textMuted}`}>#</span>
                        <span className={`text-[10px] font-bold uppercase tracking-wide ${theme.textMuted}`}>Code</span>
                        <span className={`justify-self-end text-[10px] font-bold uppercase tracking-wide ${theme.textMuted}`}>Qty</span>
                        <span className={`justify-self-end text-[10px] font-bold uppercase tracking-wide ${theme.textMuted}`}>%</span>
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto">
                        {loading && <CodewareSkeleton theme={theme} />}
                        {!loading && error && (
                            <PaneError
                                theme={theme}
                                accent={accent}
                                title="Could not load codeware"
                                error={error}
                                onRetry={onRetry}
                            />
                        )}
                        {!loading && !error && codeware.length === 0 && (
                            <p className={`px-4 py-12 text-center text-sm ${theme.textMuted}`}>
                                No codeware for this defect in {year}.
                            </p>
                        )}
                        {!loading && !error && codeware.map((item, i) => (
                            <div key={item.code} className={`${CODE_COLS} px-3 py-2.5 border-b ${theme.borderColor}`}>
                                <span className={`tabular-nums text-xs font-bold ${theme.textMuted}`}>{i + 1}</span>
                                <span className={`text-xs sm:text-sm font-bold leading-snug whitespace-normal break-words ${theme.textSecondary}`}>
                                    {item.code}
                                </span>
                                <span className="tabular-nums text-right text-xs font-semibold" style={{ color: accent }}>
                                    {fmtQty(item.qty)}
                                </span>
                                <span className={`tabular-nums text-right text-xs ${theme.textMuted}`}>
                                    {item.pct.toFixed(1)}
                                </span>
                            </div>
                        ))}
                    </div>
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
