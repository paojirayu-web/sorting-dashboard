"use client";

import { X, AlertCircle, XCircle, Loader2 } from 'lucide-react';
import type { Theme } from '@/lib/themes';
import type { GroupedRow } from '@/types/dashboard';
import { formatProductDescription, formatDateDisplay } from '@/lib/utils';
import { ReasonDetailList } from '@/components/dashboard/ReasonDetailList';
import { KilnName } from '@/components/dashboard/KilnBadge';
import { dwDesc1Color } from '@/lib/sort-source';

interface DailyDetailModalProps {
    row: GroupedRow;
    theme: Theme;
    currentTheme: string;
    onClose: () => void;
    reasonsLoading?: boolean;
}

export function DailyDetailModal({ row, theme, currentTheme, onClose, reasonsLoading = false }: DailyDetailModalProps) {
    const desc1Color = dwDesc1Color(row, currentTheme === 'light');
    return (
        <>
            <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className={`fixed inset-0 sm:inset-x-4 sm:top-6 sm:bottom-6 z-[201] ${theme.cardBg} border-0 sm:border ${theme.borderColor} sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[min(780px,92vw)] md:max-h-[90vh]`}>
                {/* Modal Header */}
                <div className={`flex items-start justify-between px-4 sm:px-6 py-4 sm:py-5 border-b ${theme.borderColor} shrink-0 gap-3`}>
                    <div className="min-w-0 flex-1">
                        <h2
                            className={`text-sm sm:text-base font-bold break-words ${desc1Color ? '' : theme.textWhite}`}
                            style={desc1Color ? { color: desc1Color } : undefined}
                        >
                            {formatProductDescription(row.pt_desc1)}
                        </h2>
                        {row.pt_desc2 && (
                            <p className={`text-xs ${theme.textWhite} font-medium mt-0.5 break-words`}>{row.pt_desc2}</p>
                        )}
                        <p className={`text-[10px] sm:text-xs ${theme.textMuted} mt-1.5 flex flex-wrap gap-x-2 gap-y-1`}>
                            <span>{row.m_doc}</span>
                            <KilnName item={row} isLight={currentTheme === 'light'} />
                            <span>CP: <span className="font-bold">{row.m_cp}</span></span>
                            <span>{formatDateDisplay(row.m_date)}</span>
                            <span className="break-all">{row.m_job} | {row.m_part}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-2 shrink-0 rounded-xl ${theme.inputBg} border ${theme.borderColor} ${theme.textSecondary} hover:opacity-80 transition-all touch-manipulation`}
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Summary Stats */}
                <div className={`grid grid-cols-2 sm:grid-cols-4 border-b ${theme.borderColor} shrink-0`}>
                    {[
                        { label: 'Process', value: row.qtyp.toLocaleString(), sub: '', color: theme.textWhite },
                        { label: 'Good', value: row.qtycomp.toLocaleString(), sub: `${row.qtyp > 0 ? ((row.qtycomp / row.qtyp) * 100).toFixed(1) : 0}%`, color: 'text-green-500' },
                        { label: 'Scrap', value: row.totalScrap.toLocaleString(), sub: `${row.qtyp > 0 ? ((row.totalScrap / row.qtyp) * 100).toFixed(1) : 0}%`, color: 'text-red-500' },
                        { label: 'Reject', value: row.totalReject.toLocaleString(), sub: `${row.qtyp > 0 ? ((row.totalReject / row.qtyp) * 100).toFixed(1) : 0}%`, color: 'text-orange-400' },
                    ].map((s, i) => (
                        <div key={i} className={`py-3 sm:py-4 text-center ${i % 2 === 0 ? `border-r sm:border-r-0 ${i < 2 ? 'border-b sm:border-b-0' : ''} ${theme.borderColor}` : ''} sm:border-r ${i < 3 ? theme.borderColor : ''} last:border-r-0`}>
                            <p className={`text-[10px] uppercase tracking-wider ${theme.textMuted} mb-1`}>{s.label}</p>
                            <p className={`text-base sm:text-lg font-bold ${s.color}`}>{s.value}</p>
                            {s.sub && <p className={`text-xs font-bold ${s.color} opacity-80`}>{s.sub}</p>}
                        </div>
                    ))}
                </div>

                {/* Detail Breakdown */}
                <div className="flex-1 overflow-auto p-4 sm:p-5 space-y-5 sm:space-y-6 min-h-0">
                    {/* Scrap Reasons */}
                    {row.cdReasons.size > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                                <AlertCircle size={14} className="text-red-500 shrink-0" />
                                <h3 className={`text-sm font-bold ${theme.textWhite}`}>Scrap Reasons</h3>
                                <span className={`text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25 font-bold`}>
                                    {[...row.cdReasons.values()].reduce((a, b) => a + b, 0).toLocaleString()} pcs
                                </span>
                            </div>
                            <ReasonDetailList
                                entries={[...row.cdReasons.entries()]}
                                qtyp={row.qtyp}
                                theme={theme}
                                valueClass="text-red-400"
                                pctClass="text-red-400/70"
                            />
                            <div className={`hidden md:block border ${theme.borderColor} rounded-2xl overflow-hidden`}>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className={`border-b ${theme.borderColor} ${currentTheme === 'dark' ? 'bg-red-500/5' : 'bg-red-50'}`}>
                                                <th className={`px-3 sm:px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider ${theme.textMuted} w-8`}>#</th>
                                                <th className={`px-3 sm:px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider ${theme.textMuted}`}>Reason Description</th>
                                                <th className={`px-3 sm:px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider ${theme.textMuted} text-right whitespace-nowrap`}>Qty</th>
                                                <th className={`px-3 sm:px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider ${theme.textMuted} text-right whitespace-nowrap`}>% of Process</th>
                                            </tr>
                                        </thead>
                                        <tbody className={theme.tableDivide}>
                                            {[...row.cdReasons.entries()]
                                                .sort((a, b) => b[1] - a[1])
                                                .map(([reason, qty], i) => (
                                                    <tr key={i} className={theme.tableRowHover}>
                                                        <td className={`px-3 sm:px-4 py-3 text-xs ${theme.textMuted}`}>{i + 1}</td>
                                                        <td className={`px-3 sm:px-4 py-3 text-xs sm:text-sm ${theme.textSecondary} break-words`}>{reason}</td>
                                                        <td className="px-3 sm:px-4 py-3 text-sm font-bold text-red-400 text-right whitespace-nowrap">{qty.toLocaleString()}</td>
                                                        <td className={`px-3 sm:px-4 py-3 text-xs text-red-400/70 text-right font-medium whitespace-nowrap`}>
                                                            {row.qtyp > 0 ? ((qty / row.qtyp) * 100).toFixed(1) : 0}%
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Reject Reasons */}
                    {row.pjReasons.size > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                                <XCircle size={14} className="text-orange-500 shrink-0" />
                                <h3 className={`text-sm font-bold ${theme.textWhite}`}>Reject Reasons</h3>
                                <span className={`text-xs px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/25 font-bold`}>
                                    {[...row.pjReasons.values()].reduce((a, b) => a + b, 0).toLocaleString()} pcs
                                </span>
                            </div>
                            <ReasonDetailList
                                entries={[...row.pjReasons.entries()]}
                                qtyp={row.qtyp}
                                theme={theme}
                                valueClass="text-orange-400"
                                pctClass="text-orange-400/70"
                            />
                            <div className={`hidden md:block border ${theme.borderColor} rounded-2xl overflow-hidden`}>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className={`border-b ${theme.borderColor} ${currentTheme === 'dark' ? 'bg-orange-500/5' : 'bg-orange-50'}`}>
                                                <th className={`px-3 sm:px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider ${theme.textMuted} w-8`}>#</th>
                                                <th className={`px-3 sm:px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider ${theme.textMuted}`}>Reason Description</th>
                                                <th className={`px-3 sm:px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider ${theme.textMuted} text-right whitespace-nowrap`}>Qty</th>
                                                <th className={`px-3 sm:px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider ${theme.textMuted} text-right whitespace-nowrap`}>% of Process</th>
                                            </tr>
                                        </thead>
                                        <tbody className={theme.tableDivide}>
                                            {[...row.pjReasons.entries()]
                                                .sort((a, b) => b[1] - a[1])
                                                .map(([reason, qty], i) => (
                                                    <tr key={i} className={theme.tableRowHover}>
                                                        <td className={`px-3 sm:px-4 py-3 text-xs ${theme.textMuted}`}>{i + 1}</td>
                                                        <td className={`px-3 sm:px-4 py-3 text-xs sm:text-sm ${theme.textSecondary} break-words`}>{reason}</td>
                                                        <td className="px-3 sm:px-4 py-3 text-sm font-bold text-orange-400 text-right whitespace-nowrap">{qty.toLocaleString()}</td>
                                                        <td className={`px-3 sm:px-4 py-3 text-xs text-orange-400/70 text-right font-medium whitespace-nowrap`}>
                                                            {row.qtyp > 0 ? ((qty / row.qtyp) * 100).toFixed(1) : 0}%
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {reasonsLoading && row.cdReasons.size === 0 && row.pjReasons.size === 0 && (
                        <div className={`py-12 text-center ${theme.textMuted} text-sm flex flex-col items-center gap-2`}>
                            <Loader2 size={20} className={`animate-spin ${theme.accentText}`} />
                            Loading defect details…
                        </div>
                    )}
                    {!reasonsLoading && row.cdReasons.size === 0 && row.pjReasons.size === 0 && (
                        <div className={`py-12 text-center ${theme.textMuted} text-sm`}>No defect detail data available</div>
                    )}
                </div>
            </div>
        </>
    );
}
