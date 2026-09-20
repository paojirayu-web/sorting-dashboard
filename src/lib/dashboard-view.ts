import type { ViewType } from '@/types/dashboard';

export const DASHBOARD_VIEW_QUERY = 'view';

const DASHBOARD_VIEWS: ViewType[] = [
    'overview',
    'product-analysis',
    'monthly-analysis',
    'qty-process',
    'settings',
];

export function parseDashboardView(raw: string | null | undefined): ViewType {
    const value = String(raw || '').trim();
    if (value === 'defect-analysis' || value === 'mix') return 'qty-process';
    if ((DASHBOARD_VIEWS as string[]).includes(value)) return value as ViewType;
    return 'overview';
}

export function dashboardViewHref(view: ViewType): string {
    const next = view === 'defect-analysis' ? 'qty-process' : view;
    if (next === 'overview') return '/dashboard';
    return `/dashboard?${DASHBOARD_VIEW_QUERY}=${encodeURIComponent(next)}`;
}
