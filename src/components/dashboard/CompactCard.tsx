"use client";

import { AlertCircle, XCircle } from 'lucide-react';
import type { Theme } from '@/lib/themes';
import { isMergedPCard } from '@/lib/cp-card-grouping';
import type { CPData, SelectedReason } from '@/types/dashboard';

interface CompactCardProps {
    cp: CPData;
    theme: Theme;
    currentTheme: string;
    showReject: boolean;
    onCardClick?: () => void;
    onReasonClick?: (r: SelectedReason) => void;
}

export function CompactCard({ cp, theme, showReject, onCardClick, onReasonClick }: CompactCardProps) {
    const total = cp.metrics.totalQtyp || 1;
    const aPct = (cp.metrics.totalQtycomp / total) * 100;
    const sPct = (cp.metrics.totalScrap / total) * 100;
    const rPct = (cp.metrics.totalReject / total) * 100;
    const otherQty = Math.max(
        0,
        cp.metrics.totalQtyp - cp.metrics.totalQtycomp - cp.metrics.totalScrap - cp.metrics.totalReject,
    );
    const oPct = (otherQty / total) * 100;

    const isMergedP = isMergedPCard(cp.m_cp);
    const isRound1 = !isMergedP && (cp.m_cp.includes('Round 1') || cp.m_cp === 'C1');
    const gradeLabel = isRound1 ? 'SPRAY&BAND' : 'Completed';

    const reasonList = showReject ? cp.reasons.P : cp.reasons.C;
    const visibleReasons = reasonList.slice(0, 5);

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onCardClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onCardClick?.();
                }
            }}
            className={`${theme.cardBg} border ${theme.borderColor} rounded-xl p-2.5 shadow hover:shadow-md transition-all cursor-pointer h-full ${isMergedP ? 'min-w-0' : ''}`}
            title="Click to view all defects"
        >
            {/* Compact Header */}
            <div
                className={
                    isMergedP
                        ? 'mb-2 space-y-1'
                        : 'flex justify-between items-center gap-2 mb-2'
                }
            >
                <h3
                    className={`text-sm font-bold ${theme.textWhite} flex gap-1.5 min-w-0 ${isMergedP ? 'items-start leading-snug' : 'items-center truncate'}`}
                    title={isMergedP ? undefined : cp.m_cp}
                >
                    <div
                        className={`w-1 h-3.5 rounded-full shrink-0 mt-0.5 ${parseFloat(cp.metrics.scrapRate) > 5 ? 'bg-red-500' : 'bg-green-500'}`}
                    />
                    <span className={isMergedP ? 'whitespace-normal break-words' : 'truncate'}>
                        {cp.m_cp}
                    </span>
                </h3>
                <span
                    className={`text-[15px] ${theme.textMuted} shrink-0 ${isMergedP ? 'block text-right' : ''}`}
                >
                    Qty.Proc: <span className={theme.textPrimary}>{cp.metrics.totalQtyp.toLocaleString()}</span>
                </span>
            </div>

            {/* Inline Visual Metrics Bar */}
            <div
                className="w-full h-1.5 flex rounded-full overflow-hidden mb-1.5 bg-gray-100 dark:bg-zinc-800"
                title={
                    oPct > 0
                        ? `Other ${oPct.toFixed(1)}% — Process qty ที่ยังไม่ครบ Good + Scrap + Reject (${otherQty.toLocaleString()} pcs)`
                        : undefined
                }
            >
                <div className="h-full bg-green-500" style={{ width: `${aPct}%` }} />
                <div className="h-full bg-red-500" style={{ width: `${sPct}%` }} />
                <div className="h-full bg-orange-500" style={{ width: `${rPct}%` }} />
                {oPct > 0.05 && (
                    <div
                        className="h-full bg-zinc-400 dark:bg-zinc-600"
                        style={{ width: `${oPct}%` }}
                        title={`Other ${oPct.toFixed(1)}% (${otherQty.toLocaleString()})`}
                    />
                )}
            </div>

            {/* Inline Metrics Text */}
            <div className="flex justify-between items-start gap-1 mb-2.5 px-0.5">
                <div className="flex flex-col items-start leading-none">
                    <span className={`text-[8px] uppercase ${theme.textSecondary} font-bold mb-0.5`}>{gradeLabel}</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-[10px] font-bold text-green-500">{cp.metrics.compRate}%</span>
                        <span className={`text-[10px] ${theme.textMuted} font-medium`}>({cp.metrics.totalQtycomp.toLocaleString()})</span>
                    </div>
                </div>
                <div className="w-px h-6 bg-gray-100 dark:bg-zinc-800 self-center" />
                <div className="flex flex-col items-center leading-none">
                    <span className={`text-[8px] uppercase ${theme.textSecondary} font-bold mb-0.5`}>Scrap</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-[10px] font-bold text-red-500">{cp.metrics.scrapRate}%</span>
                        <span className={`text-[10px] ${theme.textMuted} font-medium`}>({cp.metrics.totalScrap.toLocaleString()})</span>
                    </div>
                </div>
                <div className="w-px h-6 bg-gray-100 dark:bg-zinc-800 self-center" />
                <div className="flex flex-col items-end leading-none">
                    <span className={`text-[8px] uppercase ${theme.textSecondary} font-bold mb-0.5`}>Reject</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-[10px] font-bold text-orange-400">{cp.metrics.rejectRate}%</span>
                        <span className={`text-[10px] ${theme.textMuted} font-medium`}>({cp.metrics.totalReject.toLocaleString()})</span>
                    </div>
                </div>
            </div>

            {/* Ultra Compact Defects List with Toggle */}
            <div className="space-y-1">
                <div className="flex justify-between items-center mb-1.5">
                    <h4 className={`text-[11px] font-bold uppercase ${theme.textMuted} flex items-center gap-1.5`}>
                        {showReject ? <XCircle size={12} className="text-orange-400" /> : <AlertCircle size={12} className="text-red-500" />}
                        Top 5 {showReject ? 'Reject' : 'Scrap'}
                    </h4>
                </div>

                <div className="space-y-1.5">
                    {visibleReasons.map((r, i) => {
                        const rate = cp.metrics.totalQtyp > 0 ? (r.qty / cp.metrics.totalQtyp) * 100 : 0;
                        return (
                            <div
                                key={i}
                                className={`flex justify-between items-start gap-2 text-[11px] rounded px-1 -mx-1 cursor-pointer transition-all ${showReject ? 'hover:bg-orange-500/10' : 'hover:bg-red-500/10'}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (isMergedP) {
                                        onReasonClick?.({
                                            rsn_desc: r.rsn_desc,
                                            m_cp: '',
                                            display_cp: cp.m_cp,
                                            sub_type: showReject ? 'P' : 'C',
                                            combined_p: true,
                                            combined_p_cps: cp.mergedFromCp,
                                        });
                                        return;
                                    }
                                    const isFritOrRound1 = cp.m_cp === 'C1' || / \(Round 1\)$/.test(cp.m_cp);
                                    const rawMcp = cp.m_cp === 'C1' ? 'C' : cp.m_cp.replace(/ \(Round 1\)$/, '');
                                    onReasonClick?.({
                                        rsn_desc: r.rsn_desc,
                                        m_cp: rawMcp,
                                        display_cp: cp.m_cp,
                                        sub_type: showReject ? 'P' : 'C',
                                        is_round1: isFritOrRound1,
                                    });
                                }}
                                title={`Click to filter log by: ${r.rsn_desc}`}
                            >
                                <div className="flex items-start gap-1.5 min-w-0 flex-1">
                                    <span className={`text-[10px] font-black ${theme.textMuted} w-3 shrink-0 pt-0.5`}>{i + 1}.</span>
                                    <span className={`${theme.textSecondary} text-[11px] font-bold leading-snug whitespace-normal break-words`}>{r.rsn_desc}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                                    <span className={`text-[11px] font-black leading-none ${showReject ? 'text-orange-400' : 'text-red-500'}`}>{rate.toFixed(1)}%</span>
                                    <span className={`text-[10px] font-bold ${theme.textMuted} leading-none`}>({r.qty})</span>
                                </div>
                            </div>
                        );
                    })}
                    {reasonList.length === 0 && (
                        <div className={`py-4 text-center border border-dashed ${theme.borderColor} rounded mt-2`}>
                            <p className={`text-[11px] ${theme.textMuted}`}>No {showReject ? 'Reject' : 'Scrap'} Data</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
