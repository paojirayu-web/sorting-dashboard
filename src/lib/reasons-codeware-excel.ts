import ExcelJS from 'exceljs';
import { REASONS_TONE_LABEL, type ReasonsCodewareItem, type ReasonsFamily, type ReasonsKind, type ReasonsYearParam } from '@/lib/reasons';

const FONT = { name: 'Arial', size: 9 } as const;

const COLUMNS = [
    { header: '#', width: 6 },
    { header: 'Description 1', width: 32 },
    { header: 'Description 2', width: 20 },
    { header: 'Group', width: 16 },
    { header: 'Tone', width: 10 },
    { header: 'Defects', width: 10 },
    { header: 'Proc', width: 10 },
    { header: 'Rate %', width: 10 },
    { header: 'Qty share %', width: 12 },
] as const;

export type ReasonsCodewareExcelInput = {
    rsn: string;
    year: ReasonsYearParam | string;
    kind: ReasonsKind;
    family: ReasonsFamily;
    group?: string;
    rows: ReasonsCodewareItem[];
};

function asciiName(value: string): string {
    return String(value || 'defect')
        .replace(/[^\x20-\x7E]+/g, '_')
        .replace(/[\\/:*?"<>|]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .trim()
        .slice(0, 40) || 'defect';
}

export function buildReasonsCodewareFilename(input: ReasonsCodewareExcelInput): string {
    const year = String(input.year || 'all');
    return `Focus_Codeware_${asciiName(input.rsn)}_${year}.xlsx`;
}

export function buildReasonsCodewareDisposition(filename: string): string {
    const ascii = filename.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
    return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

function applyRowStyle(row: ExcelJS.Row, bold = false) {
    row.height = 14;
    row.eachCell((cell) => {
        cell.font = { ...FONT, bold };
        cell.alignment = { vertical: 'middle', wrapText: false };
    });
}

export async function buildReasonsCodewareWorkbook(
    input: ReasonsCodewareExcelInput,
): Promise<ExcelJS.Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sorting Dashboard';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Codeware', {
        views: [{ state: 'frozen', ySplit: 6 }],
        properties: { defaultRowHeight: 14 },
    });

    const meta = [
        ['Defect', input.rsn],
        ['Year', String(input.year || 'all')],
        ['Kind', input.kind],
        ['Family', input.family],
        ['Group', input.group && input.group !== 'all' ? input.group : 'All'],
    ];
    for (const [label, value] of meta) {
        const row = sheet.addRow([label, value]);
        row.getCell(1).font = { ...FONT, bold: true };
        row.getCell(2).font = FONT;
    }

    COLUMNS.forEach((col, idx) => {
        sheet.getColumn(idx + 1).width = col.width;
    });

    const header = sheet.addRow(COLUMNS.map((col) => col.header));
    applyRowStyle(header, true);

    const ranked = [...input.rows]
        .filter((row) => row.code !== 'Other' && row.code !== 'Total' && row.qty > 0)
        .sort((a, b) => b.qty - a.qty || b.pct - a.pct || a.code.localeCompare(b.code, 'th'));
    const totalQty = ranked.reduce((sum, row) => sum + row.qty, 0);
    const totalProc = ranked.reduce((sum, row) => sum + row.qtyproc, 0);

    ranked.forEach((item, index) => {
        const desc1 = String(item.desc1 || '').trim()
            || item.code.replace(/\s+\([^()]+\)$/, '').trim()
            || item.code;
        const desc2 = String(item.desc2 || '').trim()
            || (/\s+\(([^()]+)\)$/.exec(item.code)?.[1] || '');
        const row = sheet.addRow([
            index + 1,
            desc1,
            desc2,
            item.group || '',
            item.tone ? REASONS_TONE_LABEL[item.tone] : '',
            item.qty,
            item.qtyproc,
            item.pct,
            totalQty > 0 ? (item.qty / totalQty) * 100 : 0,
        ]);
        applyRowStyle(row);
        row.getCell(6).numFmt = '#,##0';
        row.getCell(7).numFmt = '#,##0';
        row.getCell(8).numFmt = '0.0';
        row.getCell(9).numFmt = '0.0';
    });

    const total = sheet.addRow([
        '',
        'Total',
        '',
        '',
        '',
        totalQty,
        totalProc,
        totalProc > 0 ? (totalQty / totalProc) * 100 : 0,
        totalQty > 0 ? 100 : 0,
    ]);
    applyRowStyle(total, true);
    total.getCell(6).numFmt = '#,##0';
    total.getCell(7).numFmt = '#,##0';
    total.getCell(8).numFmt = '0.0';
    total.getCell(9).numFmt = '0.0';

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as ExcelJS.Buffer;
}
