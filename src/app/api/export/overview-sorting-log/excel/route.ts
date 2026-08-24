import { NextResponse } from 'next/server';
import {
    buildOverviewSortingLogFilename,
    buildOverviewSortingLogWorkbook,
    type OverviewSortingLogExcelInput,
} from '@/lib/overview-sorting-log-excel';

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as OverviewSortingLogExcelInput;

        if (!Array.isArray(body?.rows)) {
            return NextResponse.json({ error: 'Invalid export payload' }, { status: 400 });
        }

        const payload: OverviewSortingLogExcelInput = {
            selectedDate: body.selectedDate ?? '',
            cpFilter: body.cpFilter ?? 'ALL',
            unitFilter: body.unitFilter ?? 'ALL',
            rows: body.rows,
        };

        const buffer = await buildOverviewSortingLogWorkbook(payload);
        const filename = buildOverviewSortingLogFilename(payload);

        return new NextResponse(Buffer.from(buffer), {
            headers: {
                'Content-Type':
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (err) {
        console.error('overview sorting log excel export error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
