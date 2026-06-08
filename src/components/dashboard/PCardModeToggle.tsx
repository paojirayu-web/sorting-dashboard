'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Theme, ThemeName } from '@/lib/themes';

export type PCardMode = 'separate' | 'combine';

interface PCardModeToggleProps {
    options: string[];
    mode: PCardMode;
    combineSelection: string[];
    onModeChange: (mode: PCardMode) => void;
    onCombineSelectionChange: (next: string[]) => void;
    theme: Theme;
    currentTheme: ThemeName;
}

function selectionLabel(options: string[], selected: string[]): string {
    if (selected.length === options.length) return 'All';
    if (selected.length === 1) return selected[0];
    if (selected.length === 2) return selected.join(', ');
    return `${selected.length}`;
}

const rowClass = 'flex items-center gap-2 px-2.5 py-1.5 w-full cursor-pointer hover:opacity-90';

export function PCardModeToggle({
    options,
    mode,
    combineSelection,
    onModeChange,
    onCombineSelectionChange,
    theme,
    currentTheme,
}: PCardModeToggleProps) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const panelBg = currentTheme === 'dark' ? 'bg-[#141414]' : 'bg-white';
    const allSelected = options.length > 0 && combineSelection.length === options.length;
    const isCombine = mode === 'combine';

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

    useEffect(() => {
        if (mode === 'separate') setOpen(false);
    }, [mode]);

    if (options.length < 2) return null;

    const activateCombine = () => {
        if (mode !== 'combine') {
            onModeChange('combine');
            onCombineSelectionChange([...options]);
        }
        setOpen((v) => (mode === 'combine' ? !v : true));
    };

    const toggleOption = (value: string) => {
        if (combineSelection.includes(value)) {
            onCombineSelectionChange(combineSelection.filter((s) => s !== value));
        } else {
            onCombineSelectionChange([...combineSelection, value]);
        }
    };

    return (
        <div ref={rootRef} className="relative inline-flex flex-col">
            <div
                className={`flex rounded-lg border ${theme.borderColor} overflow-hidden ${open && isCombine ? 'rounded-b-none border-b-0' : ''}`}
            >
                <button
                    type="button"
                    onClick={() => onModeChange('separate')}
                    className={`text-xs px-2.5 py-1.5 font-bold transition-all whitespace-nowrap ${!isCombine
                        ? `${theme.accentBg} text-white`
                        : `${theme.inputBg} ${theme.textMuted}`
                        }`}
                >
                    Separate
                </button>
                <button
                    type="button"
                    onClick={activateCombine}
                    className={`text-xs px-2.5 py-1.5 font-bold transition-all border-l ${theme.borderColor} flex items-center gap-1 min-w-0 flex-1 ${isCombine
                        ? `${theme.accentBg} text-white`
                        : `${theme.inputBg} ${theme.textMuted}`
                        }`}
                    title="Combine P — choose which firing cycles"
                    aria-expanded={open}
                    aria-haspopup="listbox"
                >
                    <span className="shrink-0">Combine</span>
                    {isCombine && (
                        <span className="truncate opacity-90 font-semibold min-w-0">
                            ({selectionLabel(options, combineSelection)})
                        </span>
                    )}
                    <ChevronDown
                        className={`w-3.5 h-3.5 shrink-0 opacity-80 transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                </button>
            </div>

            {open && isCombine && (
                <div
                    role="listbox"
                    className={`absolute left-0 right-0 top-full z-50 border ${theme.borderColor} ${panelBg} shadow-lg rounded-b-lg overflow-hidden divide-y ${theme.borderColor}`}
                >
                    <label
                        className={`${rowClass} ${allSelected ? theme.accentText : theme.textMuted}`}
                    >
                        <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={() => onCombineSelectionChange(allSelected ? [] : [...options])}
                            className="shrink-0 rounded border-gray-500 accent-blue-600"
                        />
                        <span className="text-xs font-bold leading-none flex-1">All</span>
                    </label>
                    {options.map((opt) => {
                        const checked = combineSelection.includes(opt);
                        return (
                            <label
                                key={opt}
                                className={`${rowClass} ${checked ? theme.accentText : theme.textSecondary}`}
                            >
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleOption(opt)}
                                    className="shrink-0 rounded border-gray-500 accent-blue-600"
                                />
                                <span className="text-xs font-bold leading-none flex-1">{opt}</span>
                            </label>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
