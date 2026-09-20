import { NextResponse } from 'next/server';
import { parseReasonsDetailParams } from '@/lib/reasons';
import { getReasonsDetailResponse } from '@/lib/reasons-query';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** Read-only QC reasons Focus detail. GET only — no writes. */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const input = {
            rsn: searchParams.get('rsn'),
            year: searchParams.get('year'),
            kind: searchParams.get('kind'),
            family: searchParams.get('family'),
            tone: searchParams.get('tone'),
            unit: searchParams.get('unit'),
            forming: searchParams.get('forming'),
            customer: searchParams.get('customer'),
            glaze: searchParams.get('glaze'),
            group: searchParams.get('group'),
            cp: searchParams.get('cp'),
        };
        const params = parseReasonsDetailParams(input);
        if (!params.rsn) {
            return NextResponse.json({ error: 'rsn is required' }, { status: 400 });
        }
        const payload = await getReasonsDetailResponse(input, searchParams.get('refresh') === '1');
        return NextResponse.json(payload, {
            headers: { 'Cache-Control': 'no-store' },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Reasons detail query failed';
        console.error('reasons detail API error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
