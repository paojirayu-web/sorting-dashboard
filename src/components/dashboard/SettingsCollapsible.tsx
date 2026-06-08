"use client";

import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Theme } from '@/lib/themes';

interface SettingsCollapsibleProps {
    title: string;
    subtitle?: string;
    icon?: ReactNode;
    theme: Theme;
    defaultOpen?: boolean;
    nested?: boolean;
    children: ReactNode;
}

export function SettingsCollapsible({
    title,
    subtitle,
    icon,
    theme,
    defaultOpen = false,
    nested = false,
    children,
}: SettingsCollapsibleProps) {
    const [open, setOpen] = useState(defaultOpen);

    const shell = nested
        ? `rounded-xl border ${theme.borderColor} overflow-hidden`
        : `${theme.cardBg} border ${theme.borderColor} rounded-2xl shadow-sm overflow-hidden`;

    const headerPad = nested ? 'p-3 sm:p-4' : 'p-4 sm:p-6';
    const bodyPad = nested ? 'px-3 pb-3 sm:px-4 sm:pb-4' : 'px-4 pb-4 sm:px-6 sm:pb-6';

    return (
        <div className={shell}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className={`w-full flex items-start gap-3 text-left ${headerPad} hover:opacity-90 transition-opacity`}
                aria-expanded={open}
            >
                <span className={`mt-0.5 shrink-0 ${theme.textMuted}`}>
                    {open ? <ChevronDown size={nested ? 18 : 20} /> : <ChevronRight size={nested ? 18 : 20} />}
                </span>
                {icon && <span className="shrink-0">{icon}</span>}
                <span className="min-w-0 flex-1">
                    <span
                        className={`block font-bold ${theme.textWhite} ${nested ? 'text-sm' : 'text-xl'}`}
                    >
                        {title}
                    </span>
                    {subtitle && (
                        <span className={`block text-xs ${theme.textSecondary} mt-0.5`}>
                            {subtitle}
                        </span>
                    )}
                </span>
            </button>
            {open && <div className={`${bodyPad} pt-0 space-y-4`}>{children}</div>}
        </div>
    );
}
