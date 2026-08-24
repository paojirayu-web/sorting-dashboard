import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { queryDefectReasonList } from '@/lib/defect-reason-query';
import { PRODUCT_LIST_CACHE_SECONDS } from '@/lib/product-list';
import type { UnitFilter } from '@/lib/unit-filter';

const getCachedDefectReasonList = unstable_cache(
    async (startDate: string, endDate: string, category: string, mode: 'scrap' | 'reject', unit: UnitFilter) =>
        queryDefectReasonList(startDate, endDate, category, mode, unit),
    ['defect-reason-list'],
    { revalidate: PRODUCT_LIST_CACHE_SECONDS },
);

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const category = searchParams.get('category') || 'ALL';
        const mode = searchParams.get('mode') || 'scrap';
        const unit = (searchParams.get('unit') || 'ALL') as UnitFilter;

        if (!startDate || !endDate) {
            return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
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
        if (!['ALL', 'WW_WHITE', 'WW_BLACK'].includes(unit)) {
            return NextResponse.json({ error: 'Invalid unit' }, { status: 400 });
        }

        const items =
            searchParams.get('refresh') === '1'
                ? await queryDefectReasonList(startDate, endDate, category, mode as 'scrap' | 'reject', unit)
                : await getCachedDefectReasonList(startDate, endDate, category, mode as 'scrap' | 'reject', unit);

        return NextResponse.json(items, {
            headers: {
                'Cache-Control':
                    searchParams.get('refresh') === '1'
                        ? 'no-store'
                        : `private, max-age=${PRODUCT_LIST_CACHE_SECONDS}`,
            },
        });
    } catch (error) {
        console.error('defect-reasons API error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
