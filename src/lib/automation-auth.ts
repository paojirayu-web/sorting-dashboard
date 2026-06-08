import { NextResponse } from 'next/server';

/** Validates cron/manual automation requests via Bearer token or x-cron-secret header. */
export function verifyAutomationAuth(request: Request): NextResponse | null {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
        return NextResponse.json(
            { error: 'CRON_SECRET is not configured on server' },
            { status: 503 },
        );
    }

    const authHeader = request.headers.get('authorization');
    const headerSecret = request.headers.get('x-cron-secret');
    const bearer = authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null;

    if (bearer !== secret && headerSecret !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return null;
}
