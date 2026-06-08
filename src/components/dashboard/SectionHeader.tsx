import type { Theme } from '@/lib/themes';

export function SectionHeader({ title, subtitle, theme }: { title: string; subtitle?: string; theme: Theme }) {
    return (
        <div className="mb-4 sm:mb-6">
            <h2 className={`text-base sm:text-lg md:text-xl font-bold ${theme.textWhite}`}>{title}</h2>
            {subtitle && <p className={`${theme.textMuted} text-xs sm:text-sm mt-0.5 sm:mt-1`}>{subtitle}</p>}
        </div>
    );
}
