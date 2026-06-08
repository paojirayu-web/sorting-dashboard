import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import {
    getProductListStartDate,
    PRODUCT_LIST_CACHE_SECONDS,
    queryProductListFromDb,
    type ProductListItem,
} from '@/lib/product-list';

const getCachedProductList = unstable_cache(
    async (startDate: string): Promise<ProductListItem[]> => queryProductListFromDb(startDate),
    ['product-list'],
    {
        revalidate: PRODUCT_LIST_CACHE_SECONDS,
        tags: ['product-list'],
    },
);

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const startDate = getProductListStartDate();
        const items =
            searchParams.get('refresh') === '1'
                ? await queryProductListFromDb(startDate)
                : await getCachedProductList(startDate);

        const isRefresh = searchParams.get('refresh') === '1';
        return NextResponse.json(items, {
            headers: {
                'Cache-Control': isRefresh
                    ? 'no-store'
                    : `private, max-age=${PRODUCT_LIST_CACHE_SECONDS}`,
                'X-Product-List-Since': startDate,
            },
        });
    } catch (err) {
        console.error('SQL error (products):', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
