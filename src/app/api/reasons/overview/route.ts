import { NextResponse } from 'next/server';
import { getReasonsOverviewResponse } from '@/lib/reasons-query';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** Read-only QC reasons Layer A overview. GET only — no writes. */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const payload = await getReasonsOverviewResponse(
            {
                year: searchParams.get('year'),
                kind: searchParams.get('kind'),
                family: searchParams.get('family'),
                tone: searchParams.get('tone'),
                cp: searchParams.get('cp'),
                group: searchParams.get('group'),
                forming: searchParams.get('forming'),
                glaze: searchParams.get('glaze'),
            },
            searchParams.get('refresh') === '1',
        );
        return NextResponse.json(payload, {
            headers: { 'Cache-Control': 'no-store' },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Reasons overview failed';
        console.error('reasons overview API error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}