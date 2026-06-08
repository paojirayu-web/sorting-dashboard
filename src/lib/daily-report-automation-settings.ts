import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

export interface DailyReportAutomationSettings {
    enabled: boolean;
    /** 0–23 */
    hour: number;
    /** 0–59 */
    minute: number;
    timezone: string;
}

/** Absolute path — use APP_DATA_DIR on server if pm2 cwd differs from app folder */
export function getAppDataDir(): string {
    return process.env.APP_DATA_DIR?.replace(/\/$/, '') || process.cwd();
}

export function getAutomationSettingsFilePath(): string {
    return path.join(getAppDataDir(), 'data', 'daily-report-automation.json');
}

function parseCronSchedule(cronExpr: string): { hour: number; minute: number } | null {
    const parts = cronExpr.trim().split(/\s+/);
    if (parts.length < 2) return null;
    const minute = parseInt(parts[0], 10);
    const hour = parseInt(parts[1], 10);
    if (!Number.isFinite(minute) || !Number.isFinite(hour)) return null;
    return { hour, minute };
}

export function getDefaultAutomationSettings(): DailyReportAutomationSettings {
    const fromCron = process.env.DAILY_REPORT_CRON_SCHEDULE
        ? parseCronSchedule(process.env.DAILY_REPORT_CRON_SCHEDULE)
        : null;

    return {
        enabled: process.env.ENABLE_DAILY_REPORT_CRON === 'true',
        hour: fromCron?.hour ?? 20,
        minute: fromCron?.minute ?? 30,
        timezone: process.env.DAILY_REPORT_TIMEZONE || 'Asia/Bangkok',
    };
}

export function settingsToCronExpression(s: DailyReportAutomationSettings): string {
    return `${s.minute} ${s.hour} * * *`;
}

export function formatTimeLabel(s: DailyReportAutomationSettings): string {
    return `${String(s.hour).padStart(2, '0')}:${String(s.minute).padStart(2, '0')}`;
}

export async function loadAutomationSettings(): Promise<DailyReportAutomationSettings> {
    const filePath = getAutomationSettingsFilePath();
    try {
        const raw = await readFile(filePath, 'utf-8');
        const parsed = JSON.parse(raw) as Partial<DailyReportAutomationSettings>;
        return normalizeSettings({ ...getDefaultAutomationSettings(), ...parsed });
    } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code !== 'ENOENT') {
            console.warn('[daily-report-cron] Could not read settings file:', filePath, err);
        }
        return getDefaultAutomationSettings();
    }
}

export async function saveAutomationSettings(
    input: Partial<DailyReportAutomationSettings>,
): Promise<DailyReportAutomationSettings> {
    const current = await loadAutomationSettings();
    const next = normalizeSettings({ ...current, ...input });
    const filePath = getAutomationSettingsFilePath();
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(next, null, 2), 'utf-8');
    return next;
}

function normalizeSettings(s: DailyReportAutomationSettings): DailyReportAutomationSettings {
    const hour = Math.min(23, Math.max(0, Math.floor(Number(s.hour) || 0)));
    const minute = Math.min(59, Math.max(0, Math.floor(Number(s.minute) || 0)));
    return {
        enabled: Boolean(s.enabled),
        hour,
        minute,
        timezone: s.timezone || 'Asia/Bangkok',
    };
}
