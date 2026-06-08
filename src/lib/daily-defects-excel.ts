import ExcelJS from 'exceljs';
import type { DailyDefectExportRow } from '@/lib/daily-defects';
import { formatDateDisplay } from '@/lib/utils';

const COLUMNS = [
    { header: 'Description', key: 'description', width: 28 },
    { header: 'Doc', key: 'm_doc', width: 12 },
    { header: 'Kiln', key: 'm_kiln', width: 8 },
    { header: 'CP', key: 'm_cp', width: 6 },
    { header: 'Date', key: 'm_date', width: 12 },
    { header: 'Process', key: 'qtyp', width: 10 },
    { header: 'Good', key: 'qtycomp', width: 10 },
    { header: 'Good %', key: 'compPct', width: 8 },
    { header: 'Scrap', key: 'totalScrap', width: 10 },
    { header: 'Scrap %', key: 'scrapPct', width: 8 },
    { header: 'Reject', key: 'totalReject', width: 10 },
    { header: 'Reject %', key: 'rejectPct', width: 8 },
    { header: 'Top Defect(C)', key: 'topDefectC', width: 32 },
    { header: 'Top Defect(P)', key: 'topDefectP', width: 32 },
] as const;

function addSheet(
    workbook: ExcelJS.Workbook,
    sheetName: string,
    unitLabel: string,
    reportDate: string,
    rows: DailyDefectExportRow[],
) {
    const sheet = workbook.addWorksheet(sheetName, {
        views: [{ state: 'frozen', ySplit: 3 }],
    });

    sheet.mergeCells('A1:N1');
    sheet.getCell('A1').value = `Daily Defects Monitor — ${unitLabel}`;
    sheet.getCell('A1').font = { bold: true, size: 14 };

    sheet.mergeCells('A2:N2');
    sheet.getCell('A2').value = `วันที่ ${formatDateDisplay(reportDate)} | ${rows.length} รายการ`;
    sheet.getCell('A2').font = { size: 11 };

    sheet.addRow([]);
    const headerRow = sheet.addRow(COLUMNS.map((c) => c.header));
    headerRow.font = { bold: true };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE5E7EB' },
    };

    COLUMNS.forEach((col, idx) => {
        sheet.getColumn(idx + 1).width = col.width;
    });

    rows.forEach((r) => {
        sheet.addRow([
            r.description2 ? `${r.description}\n${r.description2}` : r.description,
            r.m_doc,
            r.m_kiln,
            r.m_cp,
            r.m_date,
            r.qtyp,
            r.qtycomp,
            Number(r.compPct.toFixed(1)),
            r.totalScrap,
            Number(r.scrapPct.toFixed(1)),
            r.totalReject,
            Number(r.rejectPct.toFixed(1)),
            r.topDefectC,
            r.topDefectP,
        ]);
    });

    sheet.eachRow((row, rowNumber) => {
        if (rowNumber <= 3) return;
        row.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
            };
            cell.alignment = { vertical: 'middle', wrapText: true };
        });
    });

    // Print setup — landscape, fit width, repeat header row
    sheet.pageSetup = {
        paperSize: 9,
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: {
            left: 0.4,
            right: 0.4,
            top: 0.6,
            bottom: 0.6,
            header: 0.3,
            footer: 0.3,
        },
    };
    sheet.pageSetup.printTitlesRow = '4:4';
    sheet.headerFooter = {
        oddHeader: `&C&"Arial,Bold"Daily Defects — ${unitLabel}`,
        oddFooter: '&L&D &R&P / &N',
    };
}

export interface DailyDefectsExcelInput {
    reportDate: string;
    wwWhite: DailyDefectExportRow[];
    wwBlack: DailyDefectExportRow[];
}

export async function buildDailyDefectsWorkbook(
    input: DailyDefectsExcelInput,
): Promise<ExcelJS.Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sorting Dashboard';
    workbook.created = new Date();

    addSheet(workbook, 'WW_white', 'WW(white)', input.reportDate, input.wwWhite);
    addSheet(workbook, 'WW_black', 'WW(black)', input.reportDate, input.wwBlack);

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as ExcelJS.Buffer;
}
