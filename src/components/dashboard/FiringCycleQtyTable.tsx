"use client";

import type { Theme, ThemeName } from '@/lib/themes';
import type { FiringCycleQtyRow } from '@/lib/firing-cycle-labels';

interface FiringCycleQtyTableProps {
    rows: FiringCycleQtyRow[];
    theme: Theme;
    currentTheme: ThemeName;
}

function PctCell({
    value,
    barClass,
    textClass,
}: {
    value: number;
    barClass: string;
    textClass: string;
}) {
    const pct = Math.min(100, Math.max(0, value));
    return (
        <td className="p-0 align-middle min-w-[56px]">
            <div
                className={`relative w-full min-h-[36px] flex items-center justify-center text-xs font-bold ${textClass}`}
            >
                <div
                    className={`absolute inset-y-1 left-1 rounded-sm ${barClass}`}
                    style={{ width: `calc(${pct}% - 4px)` }}
                />
                <span className="relative z-10">{pct}%</span>
            </div>
        </td>
    );
}

function Dash() {
    return <span className="text-gray-400">-</span>;
}

export function FiringCycleQtyTable({ rows, theme, currentTheme }: FiringCycleQtyTableProps) {
    const isDark = currentTheme === 'dark';
    const headerSub = isDark ? 'text-gray-200' : 'text-gray-900';
    const border = isDark ? 'border-zinc-600' : 'border-gray-300';
    const gradeAHeader = isDark
        ? 'bg-green-600/25 text-green-300'
        : 'bg-green-100 text-green-900';
    const gradeBHeader = isDark
        ? 'bg-red-500/20 text-red-300'
        : 'bg-red-100 text-red-900';
    const gradePHeader = isDark
        ? 'bg-amber-500/25 text-amber-200'
        : 'bg-amber-100 text-amber-900';
    const pctText = isDark ? theme.textPrimary : 'text-gray-900';

    return (
        <div className={`overflow-x-auto rounded-xl border ${border} shadow-inner`}>
            <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                    <tr className={isDark ? 'bg-zinc-800' : 'bg-gray-100'}>
                        <th
                            rowSpan={2}
                            className={`border ${border} px-3 py-2 text-left font-bold ${headerSub}`}
                        >
                            Firing Cycle
                        </th>
                        <th
                            rowSpan={2}
                            className={`border ${border} px-3 py-2 text-center font-bold ${headerSub}`}
                        >
                            Qty.Process
                        </th>
                        <th
                            colSpan={2}
                            className={`border ${border} px-2 py-1.5 text-center font-bold ${gradeAHeader}`}
                        >
                            Grade A
                        </th>
                        <th
                            colSpan={2}
                            className={`border ${border} px-2 py-1.5 text-center font-bold ${gradeBHeader}`}
                        >
                            Grade B
                        </th>
                        <th
                            colSpan={2}
                            className={`border ${border} px-2 py-1.5 text-center font-bold ${gradePHeader}`}
                        >
                            Grade P
                        </th>
                    </tr>
                    <tr className={isDark ? 'bg-zinc-800/80' : 'bg-gray-50'}>
                        {['QtyA', '%A', 'QtyB', '%B', 'QtyP', '%P'].map((h) => (
                            <th
                                key={h}
                                className={`border ${border} px-2 py-1 text-center text-xs font-bold ${headerSub}`}
                            >
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => {
                        const hasProcess = row.qtyProcess > 0;
                        const cell = `border ${border} px-2 py-2 text-center ${isDark ? theme.textPrimary : 'text-gray-900'}`;
                        const labelCell = `border ${border} px-3 py-2 text-left font-semibold ${isDark ? theme.textWhite : 'text-gray-900'} whitespace-nowrap`;

                        return (
                            <tr
                                key={`${row.label}-${row.mCp ?? ''}`}
                                className={isDark ? 'bg-zinc-900/40' : 'bg-white'}
                            >
                                <td className={labelCell}>{row.label}</td>
                                <td className={`${cell} font-bold`}>
                                    {hasProcess ? row.qtyProcess.toLocaleString() : <Dash />}
                                </td>
                                <td className={`${cell} bg-green-500/5`}>
                                    {hasProcess ? row.qtyA.toLocaleString() : <Dash />}
                                </td>
                                {hasProcess ? (
                                    <PctCell value={row.pctA} barClass="bg-green-500" textClass={pctText} />
                                ) : (
                                    <td className={cell}>
                                        <Dash />
                                    </td>
                                )}
                                <td className={`${cell} bg-red-500/5`}>
                                    {hasProcess ? row.qtyB.toLocaleString() : <Dash />}
                                </td>
                                {hasProcess ? (
                                    <PctCell value={row.pctB} barClass="bg-red-500" textClass={pctText} />
                                ) : (
                                    <td className={cell}>
                                        <Dash />
                                    </td>
                                )}
                                <td className={`${cell} bg-amber-500/5`}>
                                    {hasProcess ? row.qtyP.toLocaleString() : <Dash />}
                                </td>
                                {hasProcess ? (
                                    <PctCell value={row.pctP} barClass="bg-amber-500" textClass={pctText} />
                                ) : (
                                    <td className={cell}>
                                        <Dash />
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
