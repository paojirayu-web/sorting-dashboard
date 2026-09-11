import { NextResponse } from 'next/server';
import { getReasonsListResponse } from '@/lib/reasons-query';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** Read-only QC reasons list. GET only — no writes. */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const payload = await getReasonsListResponse(
            {
                year: searchParams.get('year'),
                kind: searchParams.get('kind'),
                q: searchParams.get('q'),
                page: searchParams.get('page'),
                pageSize: searchParams.get('pageSize'),
                rsn: searchParams.get('rsn'),
                sort: searchParams.get('sort'),
                dir: searchParams.get('dir'),
            },
            searchParams.get('refresh') === '1',
        );
        return NextResponse.json(payload, {
            headers: { 'Cache-Control': 'no-store' },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Reasons query failed';
        console.error('reasons API error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
