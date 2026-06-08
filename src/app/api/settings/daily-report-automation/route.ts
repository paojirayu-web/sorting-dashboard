import { NextResponse } from 'next/server';
import { verifyAutomationAuth } from '@/lib/automation-auth';
import {
    loadAutomationSettings,
    saveAutomationSettings,
    formatTimeLabel,
    settingsToCronExpression,
} from '@/lib/daily-report-automation-settings';
import {
    ensureDailyReportSchedulerStarted,
    isDailyReportSchedulerRunning,
    reloadDailyReportScheduler,
} from '@/lib/daily-report-scheduler';
import { getAutomationSettingsFilePath } from '@/lib/daily-report-automation-settings';

/** GET — อ่านการตั้งเวลาส่ง LINE อัตโนมัติ (ไม่ต้อง auth) */
export async function GET() {
    const settings = await ensureDailyReportSchedulerStarted();
    return NextResponse.json({
        ...settings,
        timeLabel: formatTimeLabel(settings),
        cron: settingsToCronExpression(settings),
        schedulerRunning: isDailyReportSchedulerRunning(),
        settingsFile: getAutomationSettingsFilePath(),
    });
}

/** PUT — บันทึกการตั้งค่า (ต้องมี CRON_SECRET) */
export async function PUT(request: Request) {
    const authError = verifyAutomationAuth(request);
    if (authError) return authError;

    try {
        const body = await request.json();
        const saved = await saveAutomationSettings({
            enabled: body.enabled,
            hour: body.hour,
            minute: body.minute,
            timezone: body.timezone,
        });
        await reloadDailyReportScheduler();

        return NextResponse.json({
            success: true,
            ...saved,
            timeLabel: formatTimeLabel(saved),
            cron: settingsToCronExpression(saved),
            schedulerRunning: isDailyReportSchedulerRunning(),
            settingsFile: getAutomationSettingsFilePath(),
        });
    } catch (err) {
        console.error('daily-report-automation settings PUT:', err);
        return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
    }
}
