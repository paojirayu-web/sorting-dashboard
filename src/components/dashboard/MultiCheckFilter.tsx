'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Theme, ThemeName } from '@/lib/themes';

interface MultiCheckFilterProps {
    label: string;
    options: string[];
    selected: string[];
    onChange: (next: string[]) => void;
    theme: Theme;
    currentTheme: ThemeName;
}

function isAllSelected(selected: string[]): boolean {
    return selected.length === 0 || selected.includes('ALL');
}

function displayLabel(selected: string[]): string {
    if (isAllSelected(selected)) return 'ALL';
    if (selected.length === 1) return selected[0];
    if (selected.length === 2) return selected.join(', ');
    return `${selected.length} selected`;
}

export function MultiCheckFilter({
    label,
    options,
    selected,
    onChange,
    theme,
    currentTheme,
}: MultiCheckFilterProps) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const isAll = isAllSelected(selected);
    const panelBg = currentTheme === 'dark' ? 'bg-[#141414]' : 'bg-white';

    useEffect(() => {
        if (!open) return;
        const onDoc = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [open]);

    const toggleAll = () => {
        onChange(['ALL']);
    };

    const toggleOption = (value: string) => {
        let next = selected.filter((s) => s !== 'ALL');
        if (next.includes(value)) {
            next = next.filter((s) => s !== value);
        } else {
            next = [...next, value];
        }
        onChange(next.length === 0 ? ['ALL'] : next);
    };

    return (
        <div ref={rootRef} className="relative">
            <div
                className={`flex items-center gap-2 px-3 py-2 ${theme.inputBg} rounded-xl border ${theme.borderColor}`}
            >
                <span className={`text-xs font-bold ${theme.textMuted} shrink-0`}>{label}:</span>
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    className={`flex items-center gap-1.5 bg-transparent outline-none text-xs font-bold ${theme.textWhite} cursor-pointer min-w-[4.5rem]`}
                    title={`Filter ${label}`}
                    aria-expanded={open}
                    aria-haspopup="listbox"
                >
                    <span className="truncate max-w-[140px] text-left">{displayLabel(selected)}</span>
                    <ChevronDown
                        className={`w-3.5 h-3.5 shrink-0 opacity-70 transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                </button>
            </div>

            {open && (
                <div
                    role="listbox"
                    className={`absolute right-0 top-full z-50 mt-1 min-w-full w-max max-w-[220px] max-h-[240px] overflow-y-auto rounded-xl border ${theme.borderColor} ${panelBg} shadow-2xl py-1`}
                >
                    <label
                        className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:opacity-80 ${isAll ? theme.accentText : theme.textSecondary}`}
                    >
                        <input
                            type="checkbox"
                            checked={isAll}
                            onChange={toggleAll}
                            className="rounded border-gray-500 accent-blue-600"
                        />
                        <span className="text-xs font-bold">ALL</span>
                    </label>
                    <div className={`border-t ${theme.borderColor} my-0.5`} />
                    {options.map((opt) => {
                        const checked = !isAll && selected.includes(opt);
                        return (
                            <label
                                key={opt}
                                className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:opacity-80 ${checked ? theme.accentText : theme.textSecondary}`}
                            >
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleOption(opt)}
                                    className="rounded border-gray-500 accent-blue-600"
                                />
                                <span className="text-xs font-bold">{opt}</span>
                            </label>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
