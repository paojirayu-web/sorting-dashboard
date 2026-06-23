import { NextResponse } from 'next/server';
import { queryDefectTrendPayload } from '@/lib/defect-reason-query';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const category = searchParams.get('category') || 'ALL';
        const rsnDesc = searchParams.get('rsn_desc');
        const mode = searchParams.get('mode') || 'scrap';

        if (!startDate || !endDate) {
            return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
        }
        if (!rsnDesc) {
            return NextResponse.json({ error: 'rsn_desc is required' }, { status: 400 });
        }
        if (startDate > endDate) {
            return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
        }
        if (!['ALL', 'WW', 'DW'].includes(category)) {
            return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
        }
        if (!['scrap', 'reject'].includes(mode)) {
            return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
        }

        const payload = await queryDefectTrendPayload(
            startDate,
            endDate,
            category,
            rsnDesc,
            mode as 'scrap' | 'reject',
        );
        return NextResponse.json(payload);
    } catch (error) {
        console.error('defect-trend API error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
