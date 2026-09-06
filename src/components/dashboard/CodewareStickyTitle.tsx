import type { ReactNode } from 'react';
import type { Theme } from '@/lib/themes';

export function CodewareStickyTitle({
    theme,
    kicker = 'Codeware',
    title,
    subtitle,
    actions,
}: {
    theme: Theme;
    kicker?: string;
    title: string;
    subtitle?: string;
    actions?: ReactNode;
}) {
    return (
        <div
            className={`sticky top-0 z-30 -mx-3 sm:-mx-4 md:-mx-8 px-3 sm:px-4 md:px-6 py-2 ${theme.cardBg} border-b ${theme.borderColor}`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${theme.textMuted}`}>{kicker}</p>
                    <h1 className={`text-sm sm:text-base md:text-lg font-black ${subtitle ? theme.accentText : theme.textWhite} break-words leading-snug`}>
                        {title}
                    </h1>
                    {subtitle ? (
                        <p className={`text-xs sm:text-sm font-bold ${theme.textWhite} truncate`}>{subtitle}</p>
                    ) : null}
                </div>
                {actions ? <div className="shrink-0 self-center">{actions}</div> : null}
            </div>
        </div>
    );
}
