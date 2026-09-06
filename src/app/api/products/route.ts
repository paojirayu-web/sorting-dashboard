import { NextResponse } from 'next/server';
import { getProductListResponse } from '@/lib/product-list-cache';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const payload = await getProductListResponse(searchParams.get('refresh') === '1');
        return NextResponse.json(payload, {
            headers: {
                'Cache-Control': 'no-store',
                'X-Product-List-Since': payload.since,
            },
        });
    } catch (err) {
        console.error('SQL error (products):', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
