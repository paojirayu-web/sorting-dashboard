"use client";

import type { Theme } from '@/lib/themes';

interface ReasonDetailListProps {
    entries: [string, number][];
    qtyp: number;
    theme: Theme;
    valueClass: string;
    pctClass: string;
}

export function ReasonDetailList({ entries, qtyp, theme, valueClass, pctClass }: ReasonDetailListProps) {
    return (
        <ul className={`md:hidden divide-y ${theme.tableDivide}`}>
            {[...entries]
                .sort((a, b) => b[1] - a[1])
                .map(([reason, qty], i) => (
                    <li key={i} className={`py-3 ${theme.tableRowHover}`}>
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <span className={`text-[10px] font-bold ${theme.textMuted}`}>#{i + 1}</span>
                                <p className={`text-sm ${theme.textSecondary} break-words mt-0.5`}>{reason}</p>
                            </div>
                            <div className="text-right shrink-0">
                                <p className={`text-sm font-bold ${valueClass}`}>{qty.toLocaleString()}</p>
                                <p className={`text-xs ${pctClass}`}>
                                    {qtyp > 0 ? ((qty / qtyp) * 100).toFixed(1) : 0}% of process
                                </p>
                            </div>
                        </div>
                    </li>
                ))}
        </ul>
    );
}
