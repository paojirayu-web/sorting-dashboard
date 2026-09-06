import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import {
    queryDefectBreakdownForMonth,
    queryDefectJobMetrics,
    queryDefectTrendChartPayload,
    queryDefectTrendOnly,
    queryDefectTrendPayload,
    queryDefectWareKilnsForWare,
} from '@/lib/defect-reason-query';
import { PRODUCT_LIST_CACHE_SECONDS } from '@/lib/product-list';
import type { UnitFilter } from '@/lib/unit-filter';
import { isValidCategory } from '@/lib/sort-source';

const getCachedDefectJobMetrics = unstable_cache(
    async (startDate: string, endDate: string, category: string, unit: UnitFilter) =>
        queryDefectJobMetrics(startDate, endDate, category, unit),
    ['defect-job-metrics'],
    { revalidate: PRODUCT_LIST_CACHE_SECONDS },
);

const getCachedDefectTrendOnly = unstable_cache(
    async (
        startDate: string,
        endDate: string,
        category: string,
        rsnDesc: string,
        mode: 'scrap' | 'reject',
        unit: UnitFilter,
    ) => queryDefectTrendOnly(startDate, endDate, category, rsnDesc, mode, unit),
    ['defect-trend-only'],
    { revalidate: PRODUCT_LIST_CACHE_SECONDS },
);

const getCachedDefectTrendChart = unstable_cache(
    async (
        startDate: string,
        endDate: string,
        category: string,
        rsnDesc: string,
        mode: 'scrap' | 'reject',
        unit: UnitFilter,
    ) => queryDefectTrendChartPayload(startDate, endDate, category, rsnDesc, mode, unit),
    ['defect-trend-chart'],
    { revalidate: PRODUCT_LIST_CACHE_SECONDS },
);

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const category = searchParams.get('category') || 'ALL';
        const rsnDesc = searchParams.get('rsn_desc');
        const mode = searchParams.get('mode') || 'scrap';
        const unit = (searchParams.get('unit') || 'ALL') as UnitFilter;
        const part = searchParams.get('part') || 'all';
        const skipCache = searchParams.get('refresh') === '1';

        if (!startDate || !endDate) {
            return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
        }
        if (startDate > endDate) {
            return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
        }
        if (!isValidCategory(category)) {
            return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
        }
        if (!['scrap', 'reject'].includes(mode)) {
            return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
        }
        if (!['ALL', 'WW_WHITE', 'WW_BLACK'].includes(unit)) {
            return NextResponse.json({ error: 'Invalid unit' }, { status: 400 });
        }
        if (!['all', 'chart', 'trend', 'job-metrics', 'breakdown', 'kilns'].includes(part)) {
            return NextResponse.json({ error: 'Invalid part' }, { status: 400 });
        }

        const scopeArgs = [startDate, endDate, category, unit] as const;
        const cacheControl = skipCache
            ? 'no-store'
            : `private, max-age=${PRODUCT_LIST_CACHE_SECONDS}`;

        if (part === 'job-metrics') {
            const jobMetrics = skipCache
                ? await queryDefectJobMetrics(...scopeArgs)
                : await getCachedDefectJobMetrics(...scopeArgs);
            return NextResponse.json({ jobMetrics }, { headers: { 'Cache-Control': cacheControl } });
        }

        if (!rsnDesc) {
            return NextResponse.json({ error: 'rsn_desc is required' }, { status: 400 });
        }

        const trendArgs = [startDate, endDate, category, rsnDesc, mode as 'scrap' | 'reject', unit] as const;

        if (part === 'trend') {
            const payload = skipCache
                ? await queryDefectTrendOnly(...trendArgs)
                : await getCachedDefectTrendOnly(...trendArgs);
            return NextResponse.json(payload, { headers: { 'Cache-Control': cacheControl } });
        }

        if (part === 'chart') {
            if (skipCache) {
                const [trendPayload, jobMetrics] = await Promise.all([
                    queryDefectTrendOnly(...trendArgs),
                    queryDefectJobMetrics(...scopeArgs),
                ]);
                return NextResponse.json(
                    { trend: trendPayload.trend, jobMetrics },
                    { headers: { 'Cache-Control': cacheControl } },
                );
            }
            const [trendPayload, jobMetrics] = await Promise.all([
                getCachedDefectTrendOnly(...trendArgs),
                getCachedDefectJobMetrics(...scopeArgs),
            ]);
            return NextResponse.json(
                { trend: trendPayload.trend, jobMetrics },
                { headers: { 'Cache-Control': cacheControl } },
            );
        }
        if (part === 'breakdown') {
            const month = searchParams.get('month');
            if (!month) {
                return NextResponse.json({ error: 'month is required for breakdown' }, { status: 400 });
            }
            // Per-month product rows can exceed Next.js unstable_cache 2MB limit — client caches instead.
            const payload = await queryDefectBreakdownForMonth(
                startDate,
                endDate,
                category,
                rsnDesc,
                mode as 'scrap' | 'reject',
                unit,
                month,
            );
            return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } });
        }
        if (part === 'kilns') {
            const month = searchParams.get('month');
            const ptDesc1 = searchParams.get('pt_desc1');
            const ptDesc2 = searchParams.get('pt_desc2') ?? '';
            if (!month || !ptDesc1) {
                return NextResponse.json({ error: 'month and pt_desc1 are required for kilns' }, { status: 400 });
            }
            return NextResponse.json(
                await queryDefectWareKilnsForWare(
                    startDate,
                    endDate,
                    category,
                    rsnDesc,
                    mode as 'scrap' | 'reject',
                    unit,
                    month,
                    ptDesc1,
                    ptDesc2,
                ),
                { headers: { 'Cache-Control': 'no-store' } },
            );
        }

        return NextResponse.json(await queryDefectTrendPayload(...trendArgs), {
            headers: { 'Cache-Control': 'no-store' },
        });
    } catch (error) {
        console.error('defect-trend API error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
