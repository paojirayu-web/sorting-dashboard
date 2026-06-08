export async function register() {
    const { startDailyReportScheduler } = await import('@/lib/daily-report-scheduler');
    await startDailyReportScheduler();
}
