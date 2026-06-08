import ExcelJS from 'exceljs';
import { formatDateDisplay, formatProductDescription } from '@/lib/utils';
import type { ProductSortingLogExportRow } from '@/lib/product-sorting-log';

const FONT = { name: 'Arial', size: 9 } as const;

const COLUMNS = [
    { header: 'Description', width: 22 },
    { header: 'Date', width: 10 },
    { header: 'CP', width: 5 },
    { header: 'เตา', width: 5 },
    { header: 'Proc', width: 8 },
    { header: 'Good', width: 8 },
    { header: 'Good %', width: 7 },
    { header: 'Scrap', width: 8 },
    { header: 'Scrap %', width: 7 },
    { header: 'Reject', width: 8 },
    { header: 'Reject %', width: 7 },
] as const;

const QTY_COLS = [5, 8, 10] as const;
const PCT_COLS = [6, 9, 11] as const;

export type { ProductSortingLogExportRow } from '@/lib/product-sorting-log';

export interface ProductSortingLogExcelInput {
    productLabel: string;
    startDate: string;
    endDate: string;
    cpFilters: string[];
    kilnFilters: string[];
    rows: ProductSortingLogExportRow[];
}

function safeFilenamePart(value: string): string {
    return value.replace(/[^\w\-]+/g, '_').replace(/_+/g, '_').slice(0, 48) || 'product';
}

export function buildProductSortingLogFilename(input: ProductSortingLogExcelInput): string {
    const product = safeFilenamePart(input.productLabel);
    const start = input.startDate.replace(/-/g, '');
    const end = input.endDate.replace(/-/g, '');
    return `Sorting_Log_${product}_${start}_${end}.xlsx`;
}

function applyCompactRowStyle(row: ExcelJS.Row, bold = false) {
    row.height = 14;
    row.eachCell((cell) => {
        cell.font = { ...FONT, bold };
        cell.alignment = { vertical: 'middle', wrapText: false };
    });
}

function applyNumberFormats(row: ExcelJS.Row) {
    for (const col of QTY_COLS) {
        row.getCell(col).numFmt = '#,##0';
    }
    for (const col of PCT_COLS) {
        row.getCell(col).numFmt = '0.0';
    }
}

export async function buildProductSortingLogWorkbook(
    input: ProductSortingLogExcelInput,
): Promise<ExcelJS.Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sorting Dashboard';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Sorting Log', {
        views: [{ state: 'frozen', ySplit: 1 }],
        properties: { defaultRowHeight: 14 },
    });

    const headerRow = sheet.addRow(COLUMNS.map((c) => c.header));
    applyCompactRowStyle(headerRow, true);

    COLUMNS.forEach((col, idx) => {
        sheet.getColumn(idx + 1).width = col.width;
    });

    for (const item of input.rows) {
        const compRate = item.qtyp > 0 ? (item.qtycomp / item.qtyp) * 100 : 0;
        const scrapRate = item.qtyp > 0 ? (item.totalScrap / item.qtyp) * 100 : 0;
        const rejectRate = item.qtyp > 0 ? (item.totalReject / item.qtyp) * 100 : 0;
        const isDw =
            (item.pt_desc1 || '').startsWith('143') ||
            (item.m_part || '').startsWith('143');
        const description =
            isDw && item.pt_desc2
                ? `${formatProductDescription(item.pt_desc1)} / ${item.pt_desc2}`
                : formatProductDescription(item.pt_desc1);

        const row = sheet.addRow([
            description,
            formatDateDisplay(item.m_date),
            item.m_cp,
            item.m_kiln,
            item.qtyp,
            item.qtycomp,
            Number(compRate.toFixed(1)),
            item.totalScrap,
            Number(scrapRate.toFixed(1)),
            item.totalReject,
            Number(rejectRate.toFixed(1)),
        ]);
        applyCompactRowStyle(row);
        applyNumberFormats(row);
    }

    if (input.rows.length > 0) {
        let qtyp = 0;
        let qtycomp = 0;
        let totalScrap = 0;
        let totalReject = 0;
        for (const row of input.rows) {
            qtyp += row.qtyp || 0;
            qtycomp += row.qtycomp || 0;
            totalScrap += row.totalScrap || 0;
            totalReject += row.totalReject || 0;
        }
        const base = qtyp || 1;
        const compRate = qtyp > 0 ? (qtycomp / base) * 100 : 0;
        const scrapRate = qtyp > 0 ? (totalScrap / base) * 100 : 0;
        const rejectRate = qtyp > 0 ? (totalReject / base) * 100 : 0;

        const totalRow = sheet.addRow([
            'Total',
            '',
            '',
            '',
            qtyp,
            qtycomp,
            Number(compRate.toFixed(1)),
            totalScrap,
            Number(scrapRate.toFixed(1)),
            totalReject,
            Number(rejectRate.toFixed(1)),
        ]);
        applyCompactRowStyle(totalRow, true);
        applyNumberFormats(totalRow);
    }

    sheet.pageSetup = {
        paperSize: 9,
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
    };
    sheet.pageSetup.printTitlesRow = '1:1';

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as ExcelJS.Buffer;
}
