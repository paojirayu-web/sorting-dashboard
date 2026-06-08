import { NextResponse } from 'next/server';
import {
    buildProductSortingLogFilename,
    buildProductSortingLogWorkbook,
    type ProductSortingLogExcelInput,
} from '@/lib/product-sorting-log-excel';

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as ProductSortingLogExcelInput;

        if (!body?.productLabel || !body?.startDate || !body?.endDate || !Array.isArray(body.rows)) {
            return NextResponse.json({ error: 'Invalid export payload' }, { status: 400 });
        }

        const buffer = await buildProductSortingLogWorkbook({
            productLabel: body.productLabel,
            startDate: body.startDate,
            endDate: body.endDate,
            cpFilters: body.cpFilters ?? ['ALL'],
            kilnFilters: body.kilnFilters ?? ['ALL'],
            rows: body.rows,
        });

        const filename = buildProductSortingLogFilename(body);

        return new NextResponse(Buffer.from(buffer), {
            headers: {
                'Content-Type':
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (err) {
        console.error('product sorting log excel export error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
