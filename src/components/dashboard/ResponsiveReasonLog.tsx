"use client";

import type { Theme, ThemeName } from '@/lib/themes';
import type { ReasonLogEntry } from '@/types/dashboard';
import { formatDateDisplay } from '@/lib/utils';

interface ResponsiveReasonLogProps {
    rows: ReasonLogEntry[];
    theme: Theme;
    currentTheme: ThemeName;
    isReject: boolean;
    label: string;
    subtitle?: string;
}

export function ResponsiveReasonLog({ rows, theme, currentTheme, isReject, label, subtitle }: ResponsiveReasonLogProps) {
    const totalColor = isReject ? 'text-yellow-500' : 'text-red-500';
    const defectColor = 'text-blue-500';
    const totalLabel = isReject ? 'Reject' : 'Scrap';
    const headBg = currentTheme === 'dark' ? 'bg-white/[0.03]' : 'bg-gray-50';
    const labelColor = label === 'Production' ? 'text-blue-400' : 'text-yellow-400';

    if (rows.length === 0) return null;

    return (
        <div className="flex-1 min-w-0">
            <p className={`text-xs font-bold uppercase mb-2 ${labelColor}`}>
                {label} — {rows.length} records{subtitle ? ` ${subtitle}` : ''}
            </p>
            <div className={`border ${theme.borderColor} rounded-xl overflow-hidden`}>
                {/* Mobile cards */}
                <ul className="md:hidden divide-y divide-white/5 max-h-[min(420px,55vh)] overflow-y-auto">
                    {rows.map((row, i) => {
                        const totalPct = row.qtyp > 0 ? ((row.total_defect_qty / row.qtyp) * 100).toFixed(1) : '0.0';
                        return (
                            <li key={i} className={`p-3 ${theme.tableRowHover}`}>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <span className={`text-xs font-bold ${theme.textWhite}`}>{formatDateDisplay(row.m_date)}</span>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${theme.badgeBg} border ${theme.borderColor} ${theme.textMuted}`}>
                                        {row.m_kiln} · {row.m_cp}
                                    </span>
                                </div>
                                <p className={`text-[10px] ${theme.textMuted} mb-2`}>Doc: {row.m_doc}</p>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className={`rounded-lg p-1.5 ${theme.inputBg} border ${theme.borderColor}`}>
                                        <p className={`text-[8px] uppercase font-bold ${theme.textMuted}`}>Qty(P)</p>
                                        <p className={`text-xs font-bold ${theme.textWhite}`}>{row.qtyp.toLocaleString()}</p>
                                    </div>
                                    <div className={`rounded-lg p-1.5 ${theme.inputBg} border ${theme.borderColor}`}>
                                        <p className={`text-[8px] uppercase font-bold ${theme.textMuted}`}>{totalLabel}</p>
                                        <p className={`text-xs font-bold ${totalColor}`}>{row.total_defect_qty.toLocaleString()}</p>
                                        <p className={`text-[9px] ${totalColor}`}>{totalPct}%</p>
                                    </div>
                                    <div className={`rounded-lg p-1.5 ${theme.inputBg} border ${theme.borderColor}`}>
                                        <p className={`text-[8px] uppercase font-bold ${theme.textMuted}`}>Defect</p>
                                        <p className={`text-xs font-bold ${defectColor}`}>{row.rsn_qty.toLocaleString()}</p>
                                        <p className={`text-[9px] ${defectColor}`}>{Number(row.pct).toFixed(1)}%</p>
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto max-h-[min(420px,55vh)]">
                    <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 z-10">
                            <tr className={`border-b ${theme.borderColor} ${headBg}`}>
                                <th className={`px-3 py-2 font-bold uppercase tracking-wider ${theme.textMuted}`}>Date</th>
                                <th className={`px-3 py-2 font-bold uppercase tracking-wider ${theme.textMuted}`}>Doc</th>
                                <th className={`px-3 py-2 font-bold uppercase tracking-wider ${theme.textMuted}`}>Kiln</th>
                                <th className={`px-3 py-2 font-bold uppercase tracking-wider ${theme.textMuted}`}>CP</th>
                                <th className={`px-3 py-2 font-bold uppercase tracking-wider ${theme.textMuted} text-right`}>Qty(P)</th>
                                <th className={`px-3 py-2 font-bold uppercase tracking-wider text-right ${totalColor}`}>{isReject ? 'Reject(%)' : 'Scrap(%)'}</th>
                                <th className={`px-3 py-2 font-bold uppercase tracking-wider text-right ${defectColor}`}>Defect(%)</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${theme.tableDivide}`}>
                            {rows.map((row, i) => {
                                const totalPct = row.qtyp > 0 ? ((row.total_defect_qty / row.qtyp) * 100).toFixed(1) : '0.0';
                                return (
                                    <tr key={i} className={theme.tableRowHover}>
                                        <td className={`px-2 py-2 whitespace-nowrap text-[11px] ${theme.textWhite}`}>{formatDateDisplay(row.m_date)}</td>
                                        <td className={`px-2 py-2 ${theme.textSecondary}`}>{row.m_doc}</td>
                                        <td className={`px-2 py-2 ${theme.textSecondary}`}>{row.m_kiln}</td>
                                        <td className="px-2 py-2">
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${theme.inputBg} border ${theme.borderColor} ${theme.textMuted}`}>{row.m_cp}</span>
                                        </td>
                                        <td className={`px-2 py-2 text-right font-medium ${theme.textWhite}`}>{row.qtyp.toLocaleString()}</td>
                                        <td className={`px-2 py-2 text-right font-bold ${totalColor}`}>
                                            {row.total_defect_qty.toLocaleString()}
                                            <span className={`ml-1 text-[10px] font-normal ${theme.textMuted}`}>({totalPct}%)</span>
                                        </td>
                                        <td className={`px-2 py-2 text-right font-bold ${defectColor}`}>
                                            {row.rsn_qty.toLocaleString()}
                                            <span className={`ml-1 text-[10px] font-normal ${theme.textMuted}`}>({Number(row.pct).toFixed(1)}%)</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
