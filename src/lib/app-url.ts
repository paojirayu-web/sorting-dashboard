/** Production / LAN URL (เครื่องที่ deploy จริง เช่น 192.168.2.30:8021) */
export function getProductionBaseUrl(): string {
    return (
        process.env.APP_BASE_URL?.replace(/\/$/, '') ||
        process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
        'http://localhost:8021'
    );
}

/**
 * Resolve base URL from an incoming request (e.g. image export APIs).
 * LINE dashboard links always use {@link getProductionBaseUrl} via APP_BASE_URL.
 */
export function resolveAppBaseUrl(request?: Request): string {
    if (request) {
        return new URL(request.url).origin;
    }
    return getProductionBaseUrl();
}

/** Whether LINE cloud servers can fetch image URLs (needs public HTTPS). */
export function isLineAccessibleBaseUrl(baseUrl: string): boolean {
    try {
        const u = new URL(baseUrl);
        const host = u.hostname.toLowerCase();
        if (host === 'localhost' || host === '127.0.0.1') return false;
        if (/^192\.168\./.test(host)) return false;
        if (/^10\./.test(host)) return false;
        if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
        if (u.protocol !== 'https:') return false;
        return true;
    } catch {
        return false;
    }
}

export function getDailyDefectImageUrl(
    baseUrl: string,
    date: string,
    unit: 'WW_WHITE' | 'WW_BLACK',
    category = 'WW',
): string {
    const params = new URLSearchParams({ date, unit, category });
    return `${baseUrl.replace(/\/$/, '')}/api/export/daily-defects/image?${params}`;
}

/** หน้ารวมรูปตาราง WW white + black (เปิดใน LAN/VPN ได้) */
export function getReportDailyPageUrl(baseUrl: string, date: string, category = 'WW'): string {
    const params = new URLSearchParams({ date, category });
    return `${baseUrl.replace(/\/$/, '')}/reports/daily?${params}`;
}

/** หน้า dashboard หลัก (ดูข้อมูลเต็มใน LAN/VPN) */
export function getDashboardUrl(baseUrl: string): string {
    return `${baseUrl.replace(/\/$/, '')}/dashboard`;
}
