import { NextResponse } from 'next/server';
import { verifyAutomationAuth } from '@/lib/automation-auth';
import { runDailyReport } from '@/lib/daily-report-runner';

/**
 * POST /api/automation/daily-report
 * Body: { date?, category?, cp?, sendLine?, sendLineAsImage?, includeExcel? }
 * Auth: x-cron-secret or Authorization: Bearer <CRON_SECRET>
 */
export async function POST(request: Request) {
    const authError = verifyAutomationAuth(request);
    if (authError) return authError;

    try {
        let body: Record<string, unknown> = {};
        try {
            body = await request.json();
        } catch {
            /* empty body ok */
        }

        const date = typeof body.date === 'string' ? body.date : undefined;
        const category = typeof body.category === 'string' ? body.category : 'WW';
        const cpFilter = typeof body.cp === 'string' ? body.cp : 'ALL';
        const sendLine = body.sendLine !== false;
        const sendLineAsImage = body.sendLineAsImage !== false;
        const includeExcel = body.includeExcel === true;
        const result = await runDailyReport({
            date,
            category,
            cpFilter,
            sendLine,
            sendLineAsImage,
            includeExcel,
        });

        return NextResponse.json({ success: true, ...result });
    } catch (err) {
        console.error('daily-report automation error:', err);
        return NextResponse.json(
            { success: false, error: String(err) },
            { status: 500 },
        );
    }
}

/** GET for cron: ?secret=...&date=... */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    if (secret) {
        const fake = new Request(request.url, {
            headers: { 'x-cron-secret': secret },
        });
        const authError = verifyAutomationAuth(fake);
        if (authError) return authError;
    } else {
        const authError = verifyAutomationAuth(request);
        if (authError) return authError;
    }

    const date = searchParams.get('date') || undefined;
    const category = searchParams.get('category') || 'WW';

    try {
        const useToday = searchParams.get('useToday') === '1' || searchParams.get('useToday') === 'true';

        const result = await runDailyReport({
            date,
            category,
            useToday: useToday || !date,
            sendLine: true,
            sendLineAsImage: true,
            includeExcel: false,
        });
        return NextResponse.json({ success: true, ...result });
    } catch (err) {
        console.error('daily-report GET error:', err);
        return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
    }
}
