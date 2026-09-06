/** Hostname that may only serve Production Mix (Cloudflare Tunnel). */

export function mixPublicHosts(): string[] {
    return String(process.env.MIX_PUBLIC_HOST || '')
        .split(',')
        .map((host) => host.trim().toLowerCase().replace(/:\d+$/, ''))
        .filter(Boolean);
}

export function hostnameOf(hostHeader: string | null | undefined): string {
    return String(hostHeader || '')
        .split(',')[0]
        .trim()
        .toLowerCase()
        .replace(/:\d+$/, '');
}

export function isMixPublicHost(hostHeader: string | null | undefined): boolean {
    const host = hostnameOf(hostHeader);
    if (!host) return false;
    return mixPublicHosts().includes(host);
}

export function isMixPublicPathAllowed(pathname: string): boolean {
    return (
        pathname === '/mix'
        || pathname.startsWith('/mix/')
        || pathname === '/api/qtyproc'
        || pathname.startsWith('/api/qtyproc/')
        || pathname.startsWith('/_next/')
        || pathname === '/favicon.ico'
        || pathname === '/robots.txt'
    );
}
