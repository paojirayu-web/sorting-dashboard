import { NextResponse } from 'next/server';
import { getQtyProcResponse } from '@/lib/qtyproc-server';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const refresh = searchParams.get('refresh') === '1';
        const payload = await getQtyProcResponse(refresh);
        return NextResponse.json(payload);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Qty Process query failed';
        console.error('qtyproc error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
