"use client";

import type { Theme } from '@/lib/themes';
import type { GroupedRow } from '@/types/dashboard';
import { formatProductDescription, formatDateDisplay } from '@/lib/utils';
import { getSortingLogMetrics } from './sorting-log-utils';

interface SortingLogCardProps {
    item: GroupedRow;
    theme: Theme;
    currentTheme: string;
    onClick?: () => void;
    showJobPart?: boolean;
    scrapLabel?: string;
    rejectLabel?: string;
    showDefectColumns?: boolean;
}

function MetricPill({
    label,
    value,
    pct,
    color,
    theme,
}: {
    label: string;
    value: string;
    pct: string;
    color: string;
    theme: Theme;
}) {
    return (
        <div className={`rounded-lg p-2 text-center ${theme.inputBg} border ${theme.borderColor}`}>
            <p className={`text-[9px] font-bold uppercase ${theme.textMuted}`}>{label}</p>
            <p className={`text-sm font-bold ${color}`}>{value}</p>
            {pct ? <p className={`text-[10px] font-bold ${color} opacity-80`}>{pct}</p> : null}
        </div>
    );
}

export function SortingLogCard({
    item,
    theme,
    currentTheme,
    onClick,
    showJobPart = true,
    scrapLabel = 'Top Scrap',
    rejectLabel = 'Top Reject',
    showDefectColumns = true,
}: SortingLogCardProps) {
    const { compRate, scrapRate, rejectRate, cdTop2, pjTop2 } = getSortingLogMetrics(item);
    const isDw = (item.pt_desc1 || '').startsWith('143') || (item.m_part || '').startsWith('143');

    return (
        <button
            type="button"
            onClick={onClick}
            className={`w-full text-left p-3 sm:p-4 rounded-xl border ${theme.borderColor} ${theme.cardBg} ${onClick ? `cursor-pointer active:opacity-90 ${theme.tableRowHover}` : ''} transition-colors touch-manipulation`}
        >
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0 flex-1">
                    <p className={`text-sm font-bold ${theme.textWhite} break-words`} title={item.pt_desc1}>
                        {formatProductDescription(item.pt_desc1)}
                    </p>
                    {isDw && item.pt_desc2 && (
                        <p className={`text-xs mt-0.5 font-medium break-words ${currentTheme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`}>
                            {item.pt_desc2}
                        </p>
                    )}
                    {showJobPart ? (
                        <p className={`text-[10px] ${theme.textMuted} mt-1 break-all`}>{item.m_job} | {item.m_part}</p>
                    ) : (
                        <p className={`text-[10px] ${theme.textMuted} mt-1`}>{item.m_doc}</p>
                    )}
                </div>
                <div className="shrink-0 text-right">
                    <div className="flex items-center gap-1 justify-end flex-wrap">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${theme.badgeBg} ${theme.accentText} border ${theme.badgeBorder}`}>
                            {item.m_kiln}
                        </span>
                        <span className={`text-xs font-bold ${theme.textSecondary}`}>{item.m_cp}</span>
                    </div>
                    <p className={`text-[10px] ${theme.textMuted} mt-0.5`}>{formatDateDisplay(item.m_date)}</p>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5 mb-3">
                <MetricPill label="Process" value={item.qtyp.toLocaleString()} pct="" color={theme.textSecondary} theme={theme} />
                <MetricPill label="Good" value={item.qtycomp.toLocaleString()} pct={`${compRate.toFixed(0)}%`} color="text-green-500" theme={theme} />
                <MetricPill label="Scrap" value={item.totalScrap.toLocaleString()} pct={`${scrapRate.toFixed(0)}%`} color="text-red-500" theme={theme} />
                <MetricPill label="Reject" value={item.totalReject.toLocaleString()} pct={`${rejectRate.toFixed(0)}%`} color="text-orange-400" theme={theme} />
            </div>

            {showDefectColumns && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <DefectBlock label={scrapLabel} entries={cdTop2} qtyp={item.qtyp} theme={theme} valueClass="text-red-400" pctClass="text-red-500/80" />
                    <DefectBlock label={rejectLabel} entries={pjTop2} qtyp={item.qtyp} theme={theme} valueClass="text-yellow-600" pctClass="text-yellow-500/80" />
                </div>
            )}
        </button>
    );
}

function DefectBlock({
    label,
    entries,
    qtyp,
    theme,
    valueClass,
    pctClass,
}: {
    label: string;
    entries: [string, number][];
    qtyp: number;
    theme: Theme;
    valueClass: string;
    pctClass: string;
}) {
    return (
        <div className={`rounded-lg p-2 ${theme.inputBg} border ${theme.borderColor}`}>
            <p className={`text-[9px] font-bold uppercase ${theme.textMuted} mb-1`}>{label}</p>
            {entries.length > 0 ? (
                <ul className="space-y-1">
                    {entries.map(([reason, qty], i) => (
                        <li key={i} className="flex items-start justify-between gap-2 text-[11px]">
                            <span className={`${theme.textSecondary} break-words flex-1 min-w-0`}>{reason}</span>
                            <span className={`font-bold shrink-0 ${valueClass}`}>
                                {qty.toLocaleString()}
                                <span className={`ml-0.5 ${pctClass}`}>
                                    ({qtyp > 0 ? ((qty / qtyp) * 100).toFixed(0) : 0}%)
                                </span>
                            </span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className={`text-[10px] ${theme.textMuted}`}>—</p>
            )}
        </div>
    );
}
