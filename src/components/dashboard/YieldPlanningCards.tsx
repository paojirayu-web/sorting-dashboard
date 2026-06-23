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
}

function formatPct(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
}

function KpiCard({
    label,
    value,
    subtitle,
    icon: Icon,
    accentClass,
    theme,
}: {
    label: string;
    value: string;
    subtitle?: string;
    icon: typeof TrendingUp;
    accentClass: string;
    theme: Theme;
}) {
    return (
        <div
            className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col gap-2 min-h-[108px]`}
        >
            <div className="flex items-start justify-between gap-2">
                <p className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${theme.textMuted}`}>
                    {label}
                </p>
                <div className={`p-1.5 rounded-lg shrink-0 ${accentClass}`}>
                    <Icon size={16} />
                </div>
            </div>
            <p className={`text-2xl sm:text-3xl font-black tabular-nums leading-none ${theme.textWhite}`}>
                {value}
            </p>
            {subtitle && (
                <p className={`text-[10px] sm:text-xs leading-snug ${theme.textMuted}`}>{subtitle}</p>
            )}
        </div>
    );
}

export function YieldPlanningCards({ data, theme, currentTheme }: YieldPlanningCardsProps) {
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

    return (
        <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p className={`text-[10px] font-bold uppercase tracking-wider ${theme.textMuted}`}>
                    Actual Yield
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

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <KpiCard
                    label={`Baseline Process (${divisorCp})`}
                    value={divisorProcess.toLocaleString()}
                    subtitle="Input at base firing round"
                    icon={Package}
                    accentClass="bg-violet-500/15 text-violet-400"
                    theme={theme}
                />
                <KpiCard
                    label="Actual Yield (Total)"
                    value={formatPct(metrics.pctA)}
                    subtitle={`${metrics.good.toLocaleString()} Good through ${selectedMcp}`}
                    icon={TrendingUp}
                    accentClass="bg-green-500/15 text-green-500"
                    theme={theme}
                />
                <KpiCard
                    label="Reject Total"
                    value={formatPct(metrics.pctP)}
                    subtitle={`${metrics.reject.toLocaleString()} pcs · through ${selectedMcp}`}
                    icon={AlertTriangle}
                    accentClass="bg-amber-500/15 text-amber-400"
                    theme={theme}
                />
                <KpiCard
                    label="Scrap Total"
                    value={formatPct(metrics.pctC)}
                    subtitle={`${metrics.scrap.toLocaleString()} pcs · through ${selectedMcp}`}
                    icon={Trash2}
                    accentClass="bg-red-500/15 text-red-500"
                    theme={theme}
                />
            </div>
            <p className={`text-[10px] ${theme.textMuted}`}>
                Cumulative through {selectedMcp} along {roundLabel} · vs Process({divisorCp})
            </p>
        </div>
    );
}
