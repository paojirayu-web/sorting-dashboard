export async function register() {
    if (process.env.NEXT_RUNTIME === 'edge') {
        return;
    }

    const { startDailyReportScheduler } = await import('@/lib/daily-report-scheduler');
    await startDailyReportScheduler();
}
