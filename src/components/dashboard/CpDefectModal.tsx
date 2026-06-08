"use client";

import type { ReactNode } from 'react';
import { X, AlertCircle, XCircle } from 'lucide-react';
import type { Theme } from '@/lib/themes';
import { isMergedPCard } from '@/lib/cp-card-grouping';
import type { CPData, SelectedReason } from '@/types/dashboard';
import { ReasonDetailList } from '@/components/dashboard/ReasonDetailList';

interface CpDefectModalProps {
    cp: CPData;
    theme: Theme;
    currentTheme: string;
    showReject: boolean;
    onClose: () => void;
    onReasonClick?: (r: SelectedReason) => void;
}

function buildReasonClickPayload(cp: CPData, rsn_desc: string, sub_type: 'C' | 'P'): SelectedReason {
    if (isMergedPCard(cp.m_cp)) {
        return {
            rsn_desc,
            m_cp: '',
            display_cp: cp.m_cp,
            sub_type,
            combined_p: true,
            combined_p_cps: cp.mergedFromCp,
        };
    }
    const isFritOrRound1 = cp.m_cp === 'C1' || / \(Round 1\)$/.test(cp.m_cp);
    const rawMcp = cp.m_cp === 'C1' ? 'C' : cp.m_cp.replace(/ \(Round 1\)$/, '');
    return {
        rsn_desc,
        m_cp: rawMcp,
        display_cp: cp.m_cp,
        sub_type,
        is_round1: isFritOrRound1,
    };
}

function DefectSection({
    title,
    icon,
    entries,
    qtyp,
    theme,
    currentTheme,
    badgeClass,
    headerBgClass,
    valueClass,
    pctClass,
    onReasonClick,
}: {
    title: string;
    icon: ReactNode;
    entries: [string, number][];
    qtyp: number;
    theme: Theme;
    currentTheme: string;
    badgeClass: string;
    headerBgClass: string;
    valueClass: string;
    pctClass: string;
    onReasonClick?: (rsn_desc: string) => void;
}) {
    const totalQty = entries.reduce((sum, [, qty]) => sum + qty, 0);

    return (
        <div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
                {icon}
                <h3 className={`text-sm font-bold ${theme.textWhite}`}>{title}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${badgeClass}`}>
                    {totalQty.toLocaleString()} pcs · {entries.length} reasons
                </span>
            </div>
            {entries.length === 0 ? (
                <div className={`py-10 text-center border border-dashed ${theme.borderColor} rounded-xl ${theme.textMuted} text-sm`}>
                    No {title.toLowerCase()} data
                </div>
            ) : (
                <>
                    <ReasonDetailList
                        entries={entries}
                        qtyp={qtyp}
                        theme={theme}
                        valueClass={valueClass}
                        pctClass={pctClass}
                    />
                    <div className={`hidden md:block border ${theme.borderColor} rounded-2xl overflow-hidden`}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className={`border-b ${theme.borderColor} ${headerBgClass}`}>
                                        <th className={`px-3 sm:px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider ${theme.textMuted} w-8`}>#</th>
                                        <th className={`px-3 sm:px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider ${theme.textMuted}`}>Reason Description</th>
                                        <th className={`px-3 sm:px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider ${theme.textMuted} text-right whitespace-nowrap`}>Qty</th>
                                        <th className={`px-3 sm:px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider ${theme.textMuted} text-right whitespace-nowrap`}>% of Process</th>
                                    </tr>
                                </thead>
                                <tbody className={theme.tableDivide}>
                                    {[...entries]
                                        .sort((a, b) => b[1] - a[1])
                                        .map(([reason, qty], i) => (
                                            <tr
                                                key={i}
                                                className={`${theme.tableRowHover} ${onReasonClick ? 'cursor-pointer' : ''}`}
                                                onClick={() => onReasonClick?.(reason)}
                                                title={onReasonClick ? `View log: ${reason}` : undefined}
                                            >
                                                <td className={`px-3 sm:px-4 py-3 text-xs ${theme.textMuted}`}>{i + 1}</td>
                                                <td className={`px-3 sm:px-4 py-3 text-xs sm:text-sm ${theme.textSecondary} break-words`}>{reason}</td>
                                                <td className={`px-3 sm:px-4 py-3 text-sm font-bold ${valueClass} text-right whitespace-nowrap`}>{qty.toLocaleString()}</td>
                                                <td className={`px-3 sm:px-4 py-3 text-xs ${pctClass} text-right font-medium whitespace-nowrap`}>
                                                    {qtyp > 0 ? ((qty / qtyp) * 100).toFixed(1) : 0}%
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export function CpDefectModal({ cp, theme, currentTheme, showReject, onClose, onReasonClick }: CpDefectModalProps) {
    const qtyp = cp.metrics.totalQtyp || 0;
    const scrapEntries: [string, number][] = cp.reasons.C.map((r) => [r.rsn_desc, r.qty]);
    const rejectEntries: [string, number][] = cp.reasons.P.map((r) => [r.rsn_desc, r.qty]);
    const activeEntries = showReject ? rejectEntries : scrapEntries;
    const subType = showReject ? 'P' : 'C';

    const handleReasonClick = (rsn_desc: string) => {
        onReasonClick?.(buildReasonClickPayload(cp, rsn_desc, subType));
        onClose();
    };

    return (
        <>
            <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className={`fixed inset-0 sm:inset-x-4 sm:top-6 sm:bottom-6 z-[201] ${theme.cardBg} border-0 sm:border ${theme.borderColor} sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[min(780px,92vw)] md:max-h-[90vh]`}>
                <div className={`flex items-start justify-between px-4 sm:px-6 py-4 sm:py-5 border-b ${theme.borderColor} shrink-0 gap-3`}>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className={`text-base sm:text-lg font-bold ${theme.textWhite}`}>
                                CP: <span className={theme.accentText}>{cp.m_cp}</span>
                            </h2>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${showReject ? 'bg-orange-500/15 text-orange-400 border-orange-500/30' : 'bg-red-500/15 text-red-400 border-red-500/30'}`}>
                                {showReject ? 'Reject' : 'Scrap'}
                            </span>
                        </div>
                        <p className={`text-xs ${theme.textMuted} mt-1`}>
                            All {showReject ? 'reject' : 'scrap'} reasons ({activeEntries.length})
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className={`p-2 shrink-0 rounded-xl ${theme.inputBg} border ${theme.borderColor} ${theme.textSecondary} hover:opacity-80 transition-all touch-manipulation`}
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className={`grid grid-cols-2 sm:grid-cols-4 border-b ${theme.borderColor} shrink-0`}>
                    {[
                        { label: 'Process', value: qtyp.toLocaleString(), sub: '', color: theme.textWhite },
                        { label: 'Good', value: cp.metrics.totalQtycomp.toLocaleString(), sub: `${cp.metrics.compRate}%`, color: 'text-green-500' },
                        { label: 'Scrap', value: cp.metrics.totalScrap.toLocaleString(), sub: `${cp.metrics.scrapRate}%`, color: 'text-red-500' },
                        { label: 'Reject', value: cp.metrics.totalReject.toLocaleString(), sub: `${cp.metrics.rejectRate}%`, color: 'text-orange-400' },
                    ].map((s, i) => (
                        <div key={i} className={`py-3 sm:py-4 text-center ${i % 2 === 0 ? `border-r sm:border-r-0 ${i < 2 ? 'border-b sm:border-b-0' : ''} ${theme.borderColor}` : ''} sm:border-r ${i < 3 ? theme.borderColor : ''} last:border-r-0`}>
                            <p className={`text-[10px] uppercase tracking-wider ${theme.textMuted} mb-1`}>{s.label}</p>
                            <p className={`text-base sm:text-lg font-bold ${s.color}`}>{s.value}</p>
                            {s.sub && <p className={`text-xs font-bold ${s.color} opacity-80`}>{s.sub}</p>}
                        </div>
                    ))}
                </div>

                <div className="flex-1 overflow-auto p-4 sm:p-5 min-h-0">
                    {showReject ? (
                        <DefectSection
                            title="Reject Reasons"
                            icon={<XCircle size={14} className="text-orange-500 shrink-0" />}
                            entries={rejectEntries}
                            qtyp={qtyp}
                            theme={theme}
                            currentTheme={currentTheme}
                            badgeClass="bg-orange-500/15 text-orange-400 border-orange-500/25"
                            headerBgClass={currentTheme === 'dark' ? 'bg-orange-500/5' : 'bg-orange-50'}
                            valueClass="text-orange-400"
                            pctClass="text-orange-400/70"
                            onReasonClick={onReasonClick ? handleReasonClick : undefined}
                        />
                    ) : (
                        <DefectSection
                            title="Scrap Reasons"
                            icon={<AlertCircle size={14} className="text-red-500 shrink-0" />}
                            entries={scrapEntries}
                            qtyp={qtyp}
                            theme={theme}
                            currentTheme={currentTheme}
                            badgeClass="bg-red-500/15 text-red-400 border-red-500/25"
                            headerBgClass={currentTheme === 'dark' ? 'bg-red-500/5' : 'bg-red-50'}
                            valueClass="text-red-400"
                            pctClass="text-red-400/70"
                            onReasonClick={onReasonClick ? handleReasonClick : undefined}
                        />
                    )}
                </div>
            </div>
        </>
    );
}
