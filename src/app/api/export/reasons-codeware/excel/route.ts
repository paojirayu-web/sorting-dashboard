import { NextResponse } from 'next/server';
import {
    buildReasonsCodewareDisposition,
    buildReasonsCodewareFilename,
    buildReasonsCodewareWorkbook,
    type ReasonsCodewareExcelInput,
} from '@/lib/reasons-codeware-excel';

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as ReasonsCodewareExcelInput;
        if (!body?.rsn || !Array.isArray(body.rows)) {
            return NextResponse.json({ error: 'Invalid export payload' }, { status: 400 });
        }
        const payload: ReasonsCodewareExcelInput = {
            rsn: String(body.rsn),
            year: body.year ?? 'all',
            kind: body.kind === 'reject' ? 'reject' : 'scrap',
            family: body.family === 'dw' || body.family === 'all' ? body.family : 'ww',
            group: body.group,
            rows: body.rows,
        };
        const buffer = await buildReasonsCodewareWorkbook(payload);
        const filename = buildReasonsCodewareFilename(payload);
        return new NextResponse(Buffer.from(buffer), {
            headers: {
                'Content-Type':
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': buildReasonsCodewareDisposition(filename),
                'Cache-Control': 'no-store',
            },
        });
    } catch (err) {
        console.error('reasons codeware excel export error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
