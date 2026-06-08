import { getLineExportZoom } from '@/lib/line-export-config';

/** Puppeteer ต้องเปิด server บนเครื่องเดียวกัน — ห้ามใช้ APP_BASE_URL (มักเป็น IP production) */
function getScreenshotBaseUrl(): string {
    const fromEnv = process.env.SCREENSHOT_BASE_URL?.replace(/\/$/, '');
    if (fromEnv) return fromEnv;
    const port = process.env.PORT || '8021';
    return `http://127.0.0.1:${port}`;
}

/**
 * จับภาพหน้า /export/daily-defects/print ด้วย Puppeteer — หน้าตาเหมือน dashboard
 */
export interface ScreenshotChunkOptions {
    offset?: number;
    limit?: number;
    part?: string;
    totalRows?: number;
}

export async function screenshotDailyDefectsTable(
    date: string,
    unit: 'WW_WHITE' | 'WW_BLACK',
    category = 'WW',
    chunk?: ScreenshotChunkOptions,
): Promise<Buffer> {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
        throw new Error('CRON_SECRET is required for screenshot export');
    }

    const params = new URLSearchParams({ date, unit, category, key: secret });
    if (chunk?.offset != null) params.set('offset', String(chunk.offset));
    if (chunk?.limit != null) params.set('limit', String(chunk.limit));
    if (chunk?.part) params.set('part', chunk.part);
    if (chunk?.totalRows != null) params.set('totalRows', String(chunk.totalRows));

    const targetUrl = `${getScreenshotBaseUrl()}/export/daily-defects/print?${params}`;

    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
    });

    try {
        const page = await browser.newPage();
        const width = Number(process.env.LINE_SCREENSHOT_WIDTH) || 1400;
        await page.setViewport({ width, height: 1200, deviceScaleFactor: 2 });
        const response = await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 120000 });
        if (!response?.ok()) {
            throw new Error(`Print page HTTP ${response?.status() ?? 'unknown'} at ${targetUrl}`);
        }

        await page.waitForSelector('#daily-defect-export-root', {
            timeout: 60000,
            visible: true,
        });

        const zoom = getLineExportZoom();
        await page.evaluate((z) => {
            const el = document.getElementById('daily-defect-export-root');
            if (el) {
                el.style.zoom = String(z);
                el.style.width = 'max-content';
            }
        }, zoom);

        const root = await page.$('#daily-defect-export-root');
        if (!root) {
            throw new Error('Export root element not found');
        }

        const png = await root.screenshot({
            type: 'png',
            omitBackground: false,
        });

        return Buffer.from(png);
    } finally {
        await browser.close();
    }
}
