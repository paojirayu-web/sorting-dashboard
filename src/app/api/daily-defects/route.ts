import { NextResponse } from 'next/server';
import {
    buildDailyActivityTable,
    toExportRows,
    getDefaultReportDate,
} from '@/lib/daily-defects';
import { fetchSortDataForDate } from '@/lib/fetch-sort-data';
import { filterByCategory } from '@/lib/unit-filter';
import type { UnitFilter } from '@/lib/unit-filter';
import { UNIT_LABELS } from '@/lib/unit-filter';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date') || getDefaultReportDate();
        const unit = (searchParams.get('unit') || 'WW_WHITE') as UnitFilter;
        const category = searchParams.get('category') || 'WW';
        const cpFilter = searchParams.get('cp') || 'ALL';

        if (!['WW_WHITE', 'WW_BLACK', 'ALL'].includes(unit)) {
            return NextResponse.json({ error: 'Invalid unit' }, { status: 400 });
        }

        const raw = await fetchSortDataForDate(date);
        const data = filterByCategory(raw, category);
        const table = buildDailyActivityTable(data, {
            date,
            unitFilter: unit,
            cpFilter,
            category,
        });

        return NextResponse.json({
            date,
            unit,
            unitLabel: UNIT_LABELS[unit],
            category,
            cpFilter,
            count: table.length,
            rows: toExportRows(table),
        });
    } catch (err) {
        console.error('daily-defects API error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
