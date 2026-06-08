import { NextResponse } from 'next/server';
import {
    buildDailyActivityTable,
    toExportRows,
    getDefaultReportDate,
} from '@/lib/daily-defects';
import { renderDailyDefectsTablePng } from '@/lib/daily-defects-image';
import { fetchSortDataForDate } from '@/lib/fetch-sort-data';
import { filterByCategory } from '@/lib/unit-filter';
import { UNIT_LABELS, type UnitFilter } from '@/lib/unit-filter';

export const runtime = 'nodejs';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date') || getDefaultReportDate();
        const unit = (searchParams.get('unit') || 'WW_WHITE') as UnitFilter;
        const category = searchParams.get('category') || 'WW';

        if (!['WW_WHITE', 'WW_BLACK'].includes(unit)) {
            return NextResponse.json({ error: 'Invalid unit' }, { status: 400 });
        }

        const raw = await fetchSortDataForDate(date);
        const data = filterByCategory(raw, category);
        const rows = toExportRows(
            buildDailyActivityTable(data, {
                date,
                unitFilter: unit,
                cpFilter: 'ALL',
                category,
            }),
        );

        const png = await renderDailyDefectsTablePng({
            unitLabel: UNIT_LABELS[unit],
            reportDate: date,
            rows,
        });

        const safeDate = date.replace(/-/g, '');
        return new NextResponse(new Uint8Array(png), {
            headers: {
                'Content-Type': 'image/png',
                'Content-Disposition': `inline; filename="daily_defects_${safeDate}_${unit}.png"`,
                'Cache-Control': 'public, max-age=300',
            },
        });
    } catch (err) {
        console.error('daily-defects image error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
