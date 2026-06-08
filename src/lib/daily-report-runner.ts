import {
    buildDailyActivityTable,
    buildLineTextSummary,
    toExportRows,
    getDefaultReportDate,
    getTodayReportDateBangkok,
} from '@/lib/daily-defects';
import { buildDailyDefectsWorkbook } from '@/lib/daily-defects-excel';
import { screenshotDailyDefectsTable } from '@/lib/screenshot-daily-defects';
import { publishPngForLinePush } from '@/lib/line-image-publish';
import { fetchSortDataForDate } from '@/lib/fetch-sort-data';
import { filterByCategory } from '@/lib/unit-filter';
import { isLineConfigured, pushLineMessagesBatched, type LineMessage } from '@/lib/line-client';
import { formatDateDisplay } from '@/lib/utils';
import { getDashboardUrl, getProductionBaseUrl } from '@/lib/app-url';

export interface DailyReportOptions {
    date?: string;
    category?: string;
    cpFilter?: string;
    sendLine?: boolean;
    sendLineAsImage?: boolean;
    includeExcel?: boolean;
    /** cron ใช้วันนี้ (Bangkok) แทนค่า default เมื่อ true */
    useToday?: boolean;
}

export interface DailyReportResult {
    date: string;
    category: string;
    wwWhite: { count: number };
    wwBlack: { count: number };
    line?: {
        sent: boolean;
        messages: number;
        mode: 'image' | 'text';
        errors?: string[];
        imageUrls?: { white?: string; black?: string };
    };
    excel?: { filename: string; base64: string };
}

export function resolveReportDate(options: DailyReportOptions): string {
    if (options.date) return options.date;
    if (options.useToday) return getTodayReportDateBangkok();
    return getDefaultReportDate();
}

export async function runDailyReport(
    options: DailyReportOptions = {},
): Promise<DailyReportResult> {
    const date = resolveReportDate(options);
    const category = options.category ?? 'WW';
    const cpFilter = options.cpFilter ?? 'ALL';
    const sendLine = options.sendLine !== false;
    const sendLineAsImage = options.sendLineAsImage !== false;
    const includeExcel = options.includeExcel === true;
    const raw = await fetchSortDataForDate(date);
    const data = filterByCategory(raw, category);

    const whiteGrouped = buildDailyActivityTable(data, {
        date,
        unitFilter: 'WW_WHITE',
        cpFilter,
        category,
    });
    const blackGrouped = buildDailyActivityTable(data, {
        date,
        unitFilter: 'WW_BLACK',
        cpFilter,
        category,
    });

    const result: DailyReportResult = {
        date,
        category,
        wwWhite: { count: whiteGrouped.length },
        wwBlack: { count: blackGrouped.length },
    };

    if (sendLine && isLineConfigured()) {
        const messages: LineMessage[] = [];
        const imageUrls: { white?: string; black?: string } = {};
        const errors: string[] = [];

        messages.push({
            type: 'text',
            text:
                `📋 Daily Defects Monitor\n` +
                `📅 ${formatDateDisplay(date)}\n` +
                `WW(white): ${whiteGrouped.length} รายการ | WW(black): ${blackGrouped.length} รายการ`,
        });

        if (sendLineAsImage) {
            try {
                const safeDate = date.replace(/-/g, '');
                const [whitePng, blackPng] = await Promise.all([
                    screenshotDailyDefectsTable(date, 'WW_WHITE', category),
                    screenshotDailyDefectsTable(date, 'WW_BLACK', category),
                ]);

                const [whiteUrl, blackUrl] = await Promise.all([
                    publishPngForLinePush(whitePng, `daily_${safeDate}_WW_WHITE.png`),
                    publishPngForLinePush(blackPng, `daily_${safeDate}_WW_BLACK.png`),
                ]);

                imageUrls.white = whiteUrl;
                imageUrls.black = blackUrl;
                messages.push({ type: 'image', originalContentUrl: whiteUrl });
                messages.push({ type: 'image', originalContentUrl: blackUrl });
            } catch (e) {
                errors.push(e instanceof Error ? e.message : String(e));
                messages.push(
                    { type: 'text', text: buildLineTextSummary('WW(white)', date, toExportRows(whiteGrouped)) },
                    { type: 'text', text: buildLineTextSummary('WW(black)', date, toExportRows(blackGrouped)) },
                );
            }
        }

        messages.push({
            type: 'text',
            text: buildLineViewFullDataMessage(date),
        });

        const lineResult = await pushLineMessagesBatched(messages);
        result.line = {
            sent: lineResult.ok,
            messages: messages.length,
            mode: sendLineAsImage && imageUrls.white ? 'image' : 'text',
            imageUrls: sendLineAsImage && imageUrls.white ? imageUrls : undefined,
            errors:
                errors.length > 0
                    ? [...errors, ...(lineResult.ok ? [] : [lineResult.error || `HTTP ${lineResult.status}`])]
                    : lineResult.ok
                      ? undefined
                      : [lineResult.error || `HTTP ${lineResult.status}`],
        };
    } else if (sendLine) {
        result.line = {
            sent: false,
            messages: 0,
            mode: 'text',
            errors: ['LINE_CHANNEL_ACCESS_TOKEN / LINE_GROUP_ID not configured'],
        };
    }

    if (includeExcel) {
        const buffer = await buildDailyDefectsWorkbook({
            reportDate: date,
            wwWhite: toExportRows(whiteGrouped),
            wwBlack: toExportRows(blackGrouped),
        });
        const safeDate = date.replace(/-/g, '');
        result.excel = {
            filename: `Daily_Defects_${safeDate}.xlsx`,
            base64: Buffer.from(buffer).toString('base64'),
        };
    }

    return result;
}

export function getExcelDownloadUrl(baseUrl: string, date: string, category = 'WW'): string {
    const params = new URLSearchParams({ date, category });
    return `${baseUrl.replace(/\/$/, '')}/api/export/daily-defects/excel?${params}`;
}

/** Footer link always uses APP_BASE_URL (production LAN), not the browser origin. */
export function buildLineViewFullDataMessage(date: string): string {
    const dashboardUrl = getDashboardUrl(getProductionBaseUrl());
    return (
        `🌐 ดูข้อมูลเต็มที่ระบบ Sorting Dashboard\n` +
        `📅 ${formatDateDisplay(date)}\n` +
        `${dashboardUrl}\n` +
        `(เชื่อมต่อ VPN / LAN ภายในโรงงาน)`
    );
}

/** @deprecated */
export function buildLineExcelLinkMessage(date: string, downloadUrl: string): string {
    return (
        `📎 เอกสาร Excel (พร้อม Print)\n` +
        `📅 ${formatDateDisplay(date)}\n` +
        `ดาวน์โหลด: ${downloadUrl}`
    );
}
