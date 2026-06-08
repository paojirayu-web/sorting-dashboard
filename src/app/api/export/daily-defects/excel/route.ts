import { NextResponse } from 'next/server';
import {
    buildDailyActivityTable,
    toExportRows,
    getDefaultReportDate,
} from '@/lib/daily-defects';
import { buildDailyDefectsWorkbook } from '@/lib/daily-defects-excel';
import { fetchSortDataForDate } from '@/lib/fetch-sort-data';
import { filterByCategory } from '@/lib/unit-filter';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date') || getDefaultReportDate();
        const category = searchParams.get('category') || 'WW';
        const cpFilter = searchParams.get('cp') || 'ALL';

        const raw = await fetchSortDataForDate(date);
        const data = filterByCategory(raw, category);

        const wwWhite = toExportRows(
            buildDailyActivityTable(data, {
                date,
                unitFilter: 'WW_WHITE',
                cpFilter,
                category,
            }),
        );
        const wwBlack = toExportRows(
            buildDailyActivityTable(data, {
                date,
                unitFilter: 'WW_BLACK',
                cpFilter,
                category,
            }),
        );

        const buffer = await buildDailyDefectsWorkbook({
            reportDate: date,
            wwWhite,
            wwBlack,
        });

        const safeDate = date.replace(/-/g, '');
        const filename = `Daily_Defects_${safeDate}.xlsx`;

        return new NextResponse(Buffer.from(buffer), {
            headers: {
                'Content-Type':
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (err) {
        console.error('excel export error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
