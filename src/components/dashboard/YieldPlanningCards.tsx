'use client';

import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, Package, AlertTriangle, Trash2 } from 'lucide-react';
import type { Theme, ThemeName } from '@/lib/themes';
import type { YieldPlanningResult } from '@/lib/product-yield-planning';
import {
    computeYieldThroughRound,
    getDefaultThroughRoundIndex,
    getYieldRoundOptions,
} from '@/lib/product-yield-planning';

interface YieldPlanningCardsProps {
    data: YieldPlanningResult;
    theme: Theme;
    currentTheme: ThemeName;
    /** Planning yield % from shipment (0–100). null = not found / loading handled by parent. */
    planningYieldPct?: number | null;
    planningMeta?: {
        loading?: boolean;
        source?: string | null;
        match?: string | null;
        sampleRows?: number;
        error?: string | null;
    };
}

function formatPctRatio(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
}

function formatPctPoints(value: number): string {
    return `${value.toFixed(1)}%`;
}

/**
 * One line: actual% (↑/↓diff%) / plan%
 * Diff sits after actual, smaller type. Numbers use theme text color.
 * invertDiff: for scrap — lower actual is better (↓ green, ↑ amber).
 */
function PctCompareLine({
    actualPct,
    planPct,
    loading,
    theme,
    invertDiff = false,
}: {
    actualPct: number;
    planPct: number | null;
    loading?: boolean;
    theme: Theme;
    invertDiff?: boolean;
}) {
    const actualStr = formatPctPoints(actualPct);
    const planStr =
        loading ? '…' : planPct != null && Number.isFinite(planPct) ? formatPctPoints(planPct) : '—';

    let diffNode: React.ReactNode = null;
    if (!loading && planPct != null && Number.isFinite(planPct)) {
        const diff = actualPct - planPct;
        const abs = Math.abs(diff).toFixed(1);
        if (Math.abs(diff) < 0.05) {
            diffNode = (
                <span className={`text-xs sm:text-sm font-bold tabular-nums shrink-0 ${theme.textMuted}`}>
                    (→0.0%)
                </span>
            );
        } else {
            const better = invertDiff ? diff < 0 : diff > 0;
            const arrow = diff > 0 ? '↑' : '↓';
            diffNode = (
                <span
                    className={`text-xs sm:text-sm font-bold tabular-nums shrink-0 ${
                        better ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                >
                    ({arrow}{abs}%)
                </span>
            );
        }
    }

    return (
        <p
            className={`flex flex-nowrap items-baseline gap-x-1 text-xl sm:text-2xl font-black tabular-nums leading-none ${theme.textWhite}`}
        >
            <span className="shrink-0">{actualStr}</span>
            {diffNode}
            <span className={`font-bold shrink-0 ${theme.textMuted}`}>/</span>
            <span className="shrink-0">{planStr}</span>
        </p>
    );
}

function CompareKpiCard({
    label,
    actualPct,
    planPct,
    loading,
    subtitle,
    icon: Icon,
    accentClass,
    theme,
    invertDiff,
    className = '',
}: {
    label: string;
    actualPct: number;
    planPct: number | null;
    loading?: boolean;
    subtitle?: string;
    icon: typeof TrendingUp;
    accentClass: string;
    theme: Theme;
    invertDiff?: boolean;
    className?: string;
}) {
    return (
        <div
            className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl p-3 sm:p-4 shadow-lg flex flex-col gap-2 min-h-[108px] min-w-0 ${className}`}
        >
            <div className="flex items-start justify-between gap-2">
                <p className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${theme.textMuted}`}>
                    {label}
                </p>
                <div className={`p-1.5 rounded-lg shrink-0 ${accentClass}`}>
                    <Icon size={16} />
                </div>
            </div>
            <PctCompareLine
                actualPct={actualPct}
                planPct={planPct}
                loading={loading}
                theme={theme}
                invertDiff={invertDiff}
            />
            {subtitle && (
                <p className={`text-[10px] sm:text-xs leading-snug ${theme.textMuted}`}>{subtitle}</p>
            )}
        </div>
    );
}

function KpiCard({
    label,
    value,
    subtitle,
    icon: Icon,
    accentClass,
    theme,
    className = '',
    compact = false,
}: {
    label: string;
    value: string;
    subtitle?: string;
    icon: typeof TrendingUp;
    accentClass: string;
    theme: Theme;
    className?: string;
    compact?: boolean;
}) {
    return (
        <div
            className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl ${
                compact ? 'p-2.5 sm:p-3' : 'p-3 sm:p-4'
            } shadow-lg flex flex-col gap-2 min-h-[108px] min-w-0 ${className}`}
        >
            <div className="flex items-start justify-between gap-2">
                <p className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${theme.textMuted}`}>
                    {label}
                </p>
                <div className={`p-1.5 rounded-lg shrink-0 ${accentClass}`}>
                    <Icon size={compact ? 14 : 16} />
                </div>
            </div>
            <p
                className={`font-black tabular-nums leading-none ${theme.textWhite} ${
                    compact ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'
                }`}
            >
                {value}
            </p>
            {subtitle && (
                <p className={`text-[10px] sm:text-xs leading-snug ${theme.textMuted}`}>{subtitle}</p>
            )}
        </div>
    );
}

export function YieldPlanningCards({
    data,
    theme,
    currentTheme,
    planningYieldPct = null,
    planningMeta,
}: YieldPlanningCardsProps) {
    const { rows, divisorCp, divisorProcess } = data;
    const roundOptions = useMemo(() => getYieldRoundOptions(rows), [rows]);
    const [throughIndex, setThroughIndex] = useState(() => getDefaultThroughRoundIndex(roundOptions));

    useEffect(() => {
        setThroughIndex(getDefaultThroughRoundIndex(roundOptions));
    }, [roundOptions]);

    const metrics = useMemo(
        () => computeYieldThroughRound(rows, throughIndex, divisorProcess),
        [rows, throughIndex, divisorProcess],
    );

    if (rows.length === 0) {
        return null;
    }

    if (!divisorCp || !divisorProcess || !metrics) {
        return (
            <div className={`rounded-xl border ${theme.borderColor} px-4 py-3 text-sm ${theme.textMuted}`}>
                No baseline round (C or C1) with Process qty — yield KPIs cannot be calculated.
            </div>
        );
    }

    const roundLabel = roundOptions.map((o) => o.mCp).join(' → ');
    const selectedMcp = metrics.throughMcp;
    const isDark = currentTheme === 'dark';
    const selectClass = isDark
        ? 'bg-[#1f1f1f] text-white'
        : 'bg-white text-gray-900';

    const actualYieldPct = metrics.pctA * 100;
    const actualScrapPct = metrics.pctC * 100;
    const hasPlan = planningYieldPct != null && Number.isFinite(planningYieldPct);
    const planningScrapPct = hasPlan ? 100 - planningYieldPct : null;

    return (
        <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p className={`text-[10px] font-bold uppercase tracking-wider ${theme.textMuted}`}>
                    Actual vs Planning Yield
                </p>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${theme.borderColor} ${theme.inputBg}`}>
                    <label
                        htmlFor="yield-through-round"
                        className={`text-[10px] font-bold whitespace-nowrap ${isDark ? 'text-gray-300' : theme.textMuted}`}
                    >
                        Through round
                    </label>
                    <select
                        id="yield-through-round"
                        value={throughIndex}
                        onChange={(e) => setThroughIndex(Number(e.target.value))}
                        style={{ colorScheme: currentTheme }}
                        className={`outline-none text-xs font-bold cursor-pointer min-w-[72px] rounded-md px-1 py-0.5 ${selectClass}`}
                    >
                        {roundOptions.map((opt) => (
                            <option
                                key={`${opt.mCp}-${opt.index}`}
                                value={opt.index}
                                className={selectClass}
                            >
                                {opt.mCp}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[1.15fr_1.45fr_1.45fr_0.75fr] gap-3">
                <KpiCard
                    label={`Baseline Process (${divisorCp})`}
                    value={divisorProcess.toLocaleString()}
                    subtitle="Input at base firing round"
                    icon={Package}
                    accentClass="bg-violet-500/15 text-violet-400"
                    theme={theme}
                />
                <CompareKpiCard
                    label="Actual / Planning Yield"
                    actualPct={actualYieldPct}
                    planPct={hasPlan ? planningYieldPct : null}
                    loading={planningMeta?.loading}
                    subtitle={`${metrics.good.toLocaleString()} Good through ${selectedMcp}`}
                    icon={TrendingUp}
                    accentClass="bg-green-500/15 text-green-500"
                    theme={theme}
                />
                <CompareKpiCard
                    label="Actual / Planning Scrap"
                    actualPct={actualScrapPct}
                    planPct={planningScrapPct}
                    loading={planningMeta?.loading}
                    subtitle={`${metrics.scrap.toLocaleString()} pcs · through ${selectedMcp}`}
                    icon={Trash2}
                    accentClass="bg-red-500/15 text-red-500"
                    theme={theme}
                    invertDiff
                />
                <KpiCard
                    label="Reject"
                    value={formatPctRatio(metrics.pctP)}
                    subtitle={`${metrics.reject.toLocaleString()} pcs`}
                    icon={AlertTriangle}
                    accentClass="bg-amber-500/15 text-amber-400"
                    theme={theme}
                    compact
                />
            </div>
            <p className={`text-[10px] ${theme.textMuted}`}>
                Actual (↑/↓diff) / Planning · through {selectedMcp} along {roundLabel} · vs Process({divisorCp})
            </p>
        </div>
    );
}
