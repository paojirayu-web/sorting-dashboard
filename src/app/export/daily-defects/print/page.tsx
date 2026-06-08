import { notFound } from 'next/navigation';
import { themes } from '@/lib/themes';
import { DailyDefectsPrintView } from '@/components/export/DailyDefectsPrintView';
import { buildDailyActivityTable } from '@/lib/daily-defects';
import { fetchSortDataForDate } from '@/lib/fetch-sort-data';
import { filterByCategory } from '@/lib/unit-filter';
import type { UnitFilter } from '@/lib/unit-filter';
import '@/app/globals.css';

interface PageProps {
    searchParams: Promise<{
        date?: string;
        unit?: string;
        category?: string;
        key?: string;
        offset?: string;
        limit?: string;
        part?: string;
        totalRows?: string;
    }>;
}

export default async function DailyDefectsPrintPage({ searchParams }: PageProps) {
    const { date, unit = 'WW_WHITE', category = 'WW', key, offset, limit, part, totalRows } =
        await searchParams;

    const secret = process.env.CRON_SECRET;
    if (!secret || key !== secret) {
        notFound();
    }
    if (!date || !['WW_WHITE', 'WW_BLACK'].includes(unit)) {
        notFound();
    }

    const raw = await fetchSortDataForDate(date);
    const data = filterByCategory(raw, category);
    const allRows = buildDailyActivityTable(data, {
        date,
        unitFilter: unit as UnitFilter,
        cpFilter: 'ALL',
        category,
    });

    const offsetN = Math.max(0, parseInt(offset ?? '0', 10) || 0);
    const limitN = limit ? Math.max(1, parseInt(limit, 10) || allRows.length) : allRows.length;
    const rows = allRows.slice(offsetN, offsetN + limitN);
    const total = parseInt(totalRows ?? String(allRows.length), 10) || allRows.length;

    const theme = themes.dark;

    return (
        <DailyDefectsPrintView
            rows={rows}
            theme={theme}
            currentTheme="dark"
            date={date}
            unit={unit as UnitFilter}
            partLabel={part}
            rowRange={{
                from: allRows.length === 0 ? 0 : offsetN + 1,
                to: allRows.length === 0 ? 0 : offsetN + rows.length,
                total,
            }}
        />
    );
}
