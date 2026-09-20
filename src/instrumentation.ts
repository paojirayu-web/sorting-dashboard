export async function register() {
    if (process.env.NEXT_RUNTIME === 'edge') {
        return;
    }

    const { startDailyReportScheduler } = await import('@/lib/daily-report-scheduler');
    await startDailyReportScheduler();
    const { warmReasonsCache } = await import('@/lib/reasons-query');
    const { warmQtyProcCache } = await import('@/lib/qtyproc-server');
    const { warmProductListCache } = await import('@/lib/product-list-cache');
    warmReasonsCache();
    warmQtyProcCache();
    warmProductListCache();
}
