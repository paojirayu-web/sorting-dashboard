import cron, { type ScheduledTask } from 'node-cron';
import { runDailyReport } from '@/lib/daily-report-runner';
import {
    loadAutomationSettings,
    settingsToCronExpression,
    formatTimeLabel,
    getAutomationSettingsFilePath,
    type DailyReportAutomationSettings,
} from '@/lib/daily-report-automation-settings';

function logSchedulerClock(settings: DailyReportAutomationSettings): void {
    const now = new Date().toLocaleString('en-GB', {
        timeZone: settings.timezone,
        hour12: false,
    });
    console.log(`[daily-report-cron] Settings file: ${getAutomationSettingsFilePath()}`);
    console.log(`[daily-report-cron] Now in ${settings.timezone}: ${now}`);
    console.log(
        `[daily-report-cron] Waiting for ${formatTimeLabel(settings)} daily — look for "Running scheduled LINE report" in log`,
    );
}

let scheduledTask: ScheduledTask | null = null;
let activeSettings: DailyReportAutomationSettings | null = null;
let bootstrapped = false;

export function isDailyReportSchedulerRunning(): boolean {
    return scheduledTask !== null;
}

async function runScheduledReport(): Promise<void> {
    console.log('[daily-report-cron] Running scheduled LINE report…');
    try {
        const result = await runDailyReport({
            useToday: true,
            sendLine: true,
            sendLineAsImage: true,
            includeExcel: false,
        });
        console.log(
            '[daily-report-cron] Done',
            result.date,
            'white:',
            result.wwWhite.count,
            'black:',
            result.wwBlack.count,
            'line:',
            result.line?.sent ? 'ok' : result.line?.errors,
        );
    } catch (err) {
        console.error('[daily-report-cron] Failed:', err);
    }
}

function stopTask(): void {
    if (scheduledTask) {
        scheduledTask.stop();
        scheduledTask = null;
    }
}

/** โหลด settings แล้วตั้ง cron ใหม่ (เรียกหลัง save จาก Settings) */
export async function reloadDailyReportScheduler(): Promise<DailyReportAutomationSettings> {
    const settings = await loadAutomationSettings();
    stopTask();
    activeSettings = settings;

    if (!settings.enabled) {
        console.log(
            `[daily-report-cron] Disabled (file: ${getAutomationSettingsFilePath()}, cwd: ${process.cwd()})`,
        );
        return settings;
    }

    const schedule = settingsToCronExpression(settings);
    if (!cron.validate(schedule)) {
        console.error('[daily-report-cron] Invalid schedule:', schedule);
        return settings;
    }

    scheduledTask = cron.schedule(schedule, runScheduledReport, {
        timezone: settings.timezone,
    });

    console.log(
        `[daily-report-cron] Active — ${formatTimeLabel(settings)} (${settings.timezone}), cron: ${schedule}`,
    );
    logSchedulerClock(settings);
    return settings;
}

export function getActiveAutomationSettings(): DailyReportAutomationSettings | null {
    return activeSettings;
}

/** เริ่มต้นตอน server boot */
export async function startDailyReportScheduler(): Promise<void> {
    await reloadDailyReportScheduler();
    bootstrapped = true;
}

/**
 * เรียกจาก API / instrumentation — ถ้า enabled แต่ยังไม่มี cron (เช่น หลัง pm2 restart) จะลงทะเบียนใหม่
 */
export async function ensureDailyReportSchedulerStarted(): Promise<DailyReportAutomationSettings> {
    const settings = await loadAutomationSettings();
    if (!bootstrapped || (settings.enabled && !scheduledTask)) {
        return reloadDailyReportScheduler();
    }
    return settings;
}
