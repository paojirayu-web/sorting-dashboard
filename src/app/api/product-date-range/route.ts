import { NextResponse } from 'next/server';
import {
    ANALYSIS_AUTO_LOOKBACK_YEARS,
    queryProductDateRange,
} from '@/lib/analysis-date-range';
import { parseUnitFilterParam } from '@/lib/unit-filter';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const product = searchParams.get('product');

        if (!product) {
            return NextResponse.json({ error: 'Product is required' }, { status: 400 });
        }

        const lookbackYears = Number(searchParams.get('lookbackYears') || ANALYSIS_AUTO_LOOKBACK_YEARS);
        const safeYears =
            Number.isFinite(lookbackYears) && lookbackYears >= 1 && lookbackYears <= 5
                ? Math.floor(lookbackYears)
                : ANALYSIS_AUTO_LOOKBACK_YEARS;

        const range = await queryProductDateRange(
            product,
            safeYears,
            parseUnitFilterParam(searchParams.get('unit')),
        );
        return NextResponse.json(range);
    } catch (err) {
        console.error('SQL error (product-date-range):', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
