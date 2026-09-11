"use client";

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
    AlertCircle,
    ArrowDown,
    ArrowUp,
    ChevronLeft,
    ChevronRight,
    LayoutDashboard,
    Menu,
    Moon,
    RefreshCw,
    Search,
    Sun,
    XCircle,
} from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { themes, type Theme, type ThemeName } from '@/lib/themes';
import {
    REASONS_DEFAULT_PAGE_SIZE,
    REASONS_MAX_PAGE_SIZE,
    latestReasonsYear,
    parseReasonsDir,
    parseReasonsKind,
    parseReasonsPage,
    parseReasonsPageSize,
    parseReasonsSort,
    parseReasonsYear,
    reasonsYearOptions,
    type ReasonsDir,
    type ReasonsItem,
    type ReasonsKind,
    type ReasonsListResponse,
    type ReasonsMeta,
    type ReasonsSort,
} from '@/lib/reasons';

const SEARCH_DEBOUNCE_MS = 300;
const SCRAP_COLOR = '#ef4444';
const REJECT_COLOR = '#f97316';
const SKELETON_ROWS = 8;
const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

function fmtQty(n: number): string {
    return Math.round(n).toLocaleString();
}

function SparkBars({ values, color }: { values: number[]; color: string }) {
    const max = Math.max(...values, 0);
    return (
        <div className="flex items-end gap-px h-6 w-[72px]" aria-hidden>
            {values.map((value, i) => {
                const h = max > 0 ? Math.max(value > 0 ? 12 : 8, Math.round((value / max) * 100)) : 8;
                return (
                    <span
                        key={i}
                        className="flex-1 rounded-[1px]"
                        style={{
                            height: `${h}%`,
                            background: color,
                            opacity: value > 0 ? 0.9 : 0.18,
                        }}
                    />
                );
            })}
        </div>
    );
}

function KindToggle({
    theme,
    kind,
    onChange,
}: {
    theme: Theme;
    kind: ReasonsKind;
    onChange: (kind: ReasonsKind) => void;
}) {
    return (
        <div className={`flex items-center ${theme.inputBg} rounded-xl p-1 border ${theme.borderColor} shrink-0`}>
            <button
                type="button"
                onClick={() => onChange('scrap')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    kind === 'scrap' ? 'text-white shadow-md' : `${theme.textMuted} hover:${theme.textWhite}`
                }`}
                style={kind === 'scrap' ? { background: SCRAP_COLOR } : undefined}
            >
                <AlertCircle size={14} />
                Scrap
            </button>
            <button
                type="button"
                onClick={() => onChange('reject')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    kind === 'reject' ? 'text-white shadow-md' : `${theme.textMuted} hover:${theme.textWhite}`
                }`}
                style={kind === 'reject' ? { background: REJECT_COLOR } : undefined}
            >
                <XCircle size={14} />
                Reject
            </button>
        </div>
    );
}

function SortHead({
    label,
    active,
    dir,
    onClick,
    theme,
}: {
    label: string;
    active: boolean;
    dir: ReasonsDir;
    onClick: () => void;
    theme: Theme;
}) {
    const Icon = !active ? null : dir === 'asc' ? ArrowUp : ArrowDown;
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center justify-end gap-1 text-[10px] font-bold uppercase tracking-wide ${
                active ? theme.textWhite : theme.textMuted
            } hover:${theme.textWhite}`}
        >
            {label}
            {Icon ? <Icon size={11} /> : null}
        </button>
    );
}

const LIST_COLS = 'grid grid-cols-[1.25rem_minmax(0,1fr)_minmax(3rem,auto)_2.25rem_4.5rem] gap-x-2 items-center';

function SkeletonRows({ theme }: { theme: Theme }) {
    return (
        <>
            {Array.from({ length: SKELETON_ROWS }, (_, i) => (
                <div key={i} className={`${LIST_COLS} px-3 py-2.5 border-b ${theme.borderColor}`}>
                    <div className={`h-3 w-5 rounded ${theme.inputBg} animate-pulse`} />
                    <div className={`h-3 w-full max-w-[12rem] rounded ${theme.inputBg} animate-pulse`} />
                    <div className={`h-3 w-10 justify-self-end rounded ${theme.inputBg} animate-pulse`} />
                    <div className={`h-3 w-7 justify-self-end rounded ${theme.inputBg} animate-pulse`} />
                    <div className={`h-4 w-[72px] justify-self-end rounded ${theme.inputBg} animate-pulse`} />
                </div>
            ))}
        </>
    );
}

export function ReasonsPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [currentTheme, setCurrentTheme] = useState<ThemeName>('dark');
    const theme = themes[currentTheme];
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const year = parseReasonsYear(searchParams.get('year'));
    const kind = parseReasonsKind(searchParams.get('kind'));
    const q = (searchParams.get('q') || '').trim();
    const page = parseReasonsPage(searchParams.get('page'));
    const pageSize = parseReasonsPageSize(searchParams.get('pageSize'));
    const rsn = (searchParams.get('rsn') || '').trim();
    const sort = parseReasonsSort(searchParams.get('sort'));
    const dir = parseReasonsDir(searchParams.get('dir'));

    const [searchDraft, setSearchDraft] = useState(q);
    const [items, setItems] = useState<ReasonsItem[]>([]);
    const [meta, setMeta] = useState<ReasonsMeta | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const skipDebounce = useRef(true);
    const [retryNonce, setRetryNonce] = useState(0);
    const yearOptions = useMemo(() => reasonsYearOptions(), []);
    const accent = kind === 'scrap' ? SCRAP_COLOR : REJECT_COLOR;

    useEffect(() => {
        setSearchDraft(q);
    }, [q]);

    const replaceQuery = useCallback((patch: Record<string, string | number | null | undefined>, resetPage = false) => {
        const next = new URLSearchParams(searchParams.toString());
        for (const [key, value] of Object.entries(patch)) {
            if (value == null || value === '') next.delete(key);
            else next.set(key, String(value));
        }
        if (resetPage) next.delete('page');
        const qs = next.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, [pathname, router, searchParams]);

    useEffect(() => {
        if (skipDebounce.current) {
            skipDebounce.current = false;
            return;
        }
        const handle = window.setTimeout(() => {
            const next = searchDraft.trim();
            if (next === q) return;
            replaceQuery({ q: next || null }, true);
        }, SEARCH_DEBOUNCE_MS);
        return () => window.clearTimeout(handle);
    }, [searchDraft, q, replaceQuery]);

    useEffect(() => {
        const controller = new AbortController();
        const params = new URLSearchParams({
            year: String(year),
            kind,
            page: String(page),
            pageSize: String(pageSize),
            sort,
            dir,
        });
        if (q) params.set('q', q);
        if (rsn) params.set('rsn', rsn);
        if (retryNonce > 0) params.set('refresh', '1');

        setLoading(true);
        setError(null);

        fetch(`/api/reasons?${params}`, { signal: controller.signal })
            .then(async (res) => {
                const body = await res.json();
                if (!res.ok || body?.error) {
                    throw new Error(String(body?.error || `Request failed (${res.status})`));
                }
                const payload = body as ReasonsListResponse;
                setItems(payload.items || []);
                setMeta(payload.meta);
                if (payload.meta?.page && payload.meta.page !== page) {
                    replaceQuery({ page: payload.meta.page });
                }
            })
            .catch((err: unknown) => {
                if (controller.signal.aborted) return;
                setItems([]);
                setMeta(null);
                setError(err instanceof Error ? err.message : 'Reasons list failed');
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, [year, kind, q, page, pageSize, sort, dir, rsn, retryNonce, replaceQuery]);

    const onSort = (nextSort: ReasonsSort) => {
        if (sort === nextSort) {
            replaceQuery({ dir: dir === 'desc' ? 'asc' : 'desc' }, true);
            return;
        }
        replaceQuery({ sort: nextSort, dir: 'desc' }, true);
    };

    const showingFrom = meta && meta.total > 0 ? (meta.page - 1) * meta.pageSize + 1 : 0;
    const showingTo = meta ? Math.min(meta.page * meta.pageSize, meta.total) : 0;
    const maxPage = meta ? Math.max(1, Math.ceil(meta.total / meta.pageSize) || 1) : 1;
    const selectedRsn = meta?.selectedRsn || rsn;

    return (
        <div
            className={`dash-skin flex h-screen ${theme.pageBg} ${theme.textPrimary} font-sans overflow-hidden transition-colors duration-300`}
            data-skin="all"
            data-ui-theme={currentTheme}
        >
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
            )}
            <Sidebar
                theme={theme}
                view="overview"
                isSidebarOpen={sidebarOpen}
                onSetView={() => router.push('/dashboard')}
                onClose={() => setSidebarOpen(false)}
            />
            <main className="flex-1 flex flex-col overflow-hidden min-w-0">
                <header className={`sticky top-0 z-30 ${theme.headerBg} backdrop-blur-xl border-b ${theme.borderColor}`}>
                    <div className="flex items-center justify-between gap-2 px-3 sm:px-4 md:px-6 min-h-14 md:min-h-16 py-2">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                            <button
                                type="button"
                                onClick={() => setSidebarOpen(true)}
                                className={`p-2 rounded-xl ${theme.inputBg} md:hidden`}
                                aria-label="Open sidebar"
                            >
                                <Menu size={18} />
                            </button>
                            <div className="min-w-0">
                                <h1 className={`text-sm sm:text-base md:text-lg font-bold ${theme.textWhite} tracking-tight truncate`}>
                                    Reasons
                                </h1>
                                <p className={`text-[11px] ${theme.textMuted} hidden sm:block`}>
                                    QC root-cause tracking · list only
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                            <Link
                                href="/dashboard"
                                className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl ${theme.inputBg} ${theme.textSecondary} text-xs font-bold`}
                            >
                                <LayoutDashboard size={14} />
                                Dashboard
                            </Link>
                            <button
                                type="button"
                                onClick={() => setCurrentTheme(currentTheme === 'dark' ? 'light' : 'dark')}
                                className={`p-2 sm:p-2.5 rounded-xl ${theme.inputBg} ${theme.textSecondary}`}
                                aria-label="Toggle theme"
                            >
                                {currentTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                            </button>
                        </div>
                    </div>
                    <div className={`flex flex-wrap items-center gap-2 px-3 sm:px-4 md:px-6 py-2 border-t ${theme.borderColor}`}>
                        <label className={`flex items-center gap-1.5 px-2.5 py-1.5 ${theme.inputBg} rounded-xl border ${theme.borderColor}`}>
                            <span className={`text-[10px] font-bold ${theme.textMuted}`}>Year</span>
                            <select
                                value={year}
                                onChange={(e) => replaceQuery({ year: e.target.value }, true)}
                                className={`bg-transparent text-xs font-bold ${theme.textWhite} outline-none`}
                            >
                                {yearOptions.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                        {option === latestReasonsYear() ? ' · latest' : ''}
                                    </option>
                                ))}
                                {!yearOptions.includes(year) && <option value={year}>{year}</option>}
                            </select>
                        </label>
                        <KindToggle
                            theme={theme}
                            kind={kind}
                            onChange={(next) => replaceQuery({ kind: next === 'scrap' ? null : next }, true)}
                        />
                        <div className={`flex items-center gap-2 px-3 py-1.5 ${theme.inputBg} rounded-xl border ${theme.borderColor} min-w-0 flex-1 basis-full sm:basis-auto`}>
                            <Search size={14} className={`${theme.textMuted} shrink-0`} />
                            <input
                                type="search"
                                value={searchDraft}
                                onChange={(e) => setSearchDraft(e.target.value)}
                                placeholder="Search reason…"
                                className={`bg-transparent border-none outline-none text-xs sm:text-sm font-medium ${theme.textWhite} w-full min-w-0`}
                            />
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-4 md:p-6">
                    <div className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl shadow-sm overflow-hidden`}>
                        <div className={`${LIST_COLS} px-3 py-2.5 border-b ${theme.borderColor} sticky top-0 z-10 ${theme.cardBg}`}>
                            <span className={`text-[10px] font-bold uppercase tracking-wide ${theme.textMuted}`}>#</span>
                            <span className={`text-[10px] font-bold uppercase tracking-wide ${theme.textMuted}`}>Reason</span>
                            <div className="justify-self-end">
                                <SortHead label="Qty" active={sort === 'qty'} dir={dir} onClick={() => onSort('qty')} theme={theme} />
                            </div>
                            <div className="justify-self-end">
                                <SortHead label="%" active={sort === 'pct'} dir={dir} onClick={() => onSort('pct')} theme={theme} />
                            </div>
                            <span className={`justify-self-end text-[10px] font-bold uppercase tracking-wide ${theme.textMuted}`}>
                                Spark
                            </span>
                        </div>
                        {loading && <SkeletonRows theme={theme} />}
                        {!loading && error && (
                            <div className="px-4 py-12 text-center">
                                <p className={`text-sm font-semibold ${theme.textWhite} mb-1`}>Could not load reasons</p>
                                <p className={`text-xs ${theme.textMuted} mb-4`}>{error}</p>
                                <button
                                    type="button"
                                    onClick={() => setRetryNonce((n) => n + 1)}
                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-white"
                                    style={{ background: accent }}
                                >
                                    <RefreshCw size={14} />
                                    Retry
                                </button>
                            </div>
                        )}
                        {!loading && !error && items.length === 0 && (
                            <p className={`px-4 py-12 text-center text-sm ${theme.textMuted}`}>
                                No reasons for this year and type.
                            </p>
                        )}
                        {!loading && !error && items.map((item, i) => {
                            const highlighted = Boolean(selectedRsn) && item.rsn === selectedRsn;
                            const rank = showingFrom + i;
                            return (
                                <button
                                    key={item.rsn}
                                    type="button"
                                    onClick={() => replaceQuery({ rsn: highlighted ? null : item.rsn })}
                                    className={`${LIST_COLS} w-full text-left px-3 py-2.5 border-b ${theme.borderColor} ${theme.tableRowHover} ${
                                        highlighted ? 'bg-amber-500/15 ring-1 ring-inset ring-amber-400/40' : ''
                                    }`}
                                >
                                    <span className={`tabular-nums text-xs font-bold ${theme.textMuted}`}>{rank}</span>
                                    <span className={`text-xs sm:text-sm font-bold leading-snug whitespace-normal break-words ${theme.textSecondary}`}>
                                        {item.rsn}
                                    </span>
                                    <span className="tabular-nums text-right text-xs font-semibold" style={{ color: accent }}>
                                        {fmtQty(item.qty)}
                                    </span>
                                    <span className={`tabular-nums text-right text-xs ${theme.textMuted}`}>
                                        {item.pct.toFixed(1)}
                                    </span>
                                    <span className="justify-self-end">
                                        <SparkBars values={item.spark} color={accent} />
                                    </span>
                                </button>
                            );
                        })}
                        <div className={`flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2.5 border-t ${theme.borderColor}`}>
                            <p className={`text-[11px] ${theme.textMuted}`}>
                                {meta
                                    ? `${
                                        meta.total > 0
                                            ? `Showing ${showingFrom.toLocaleString()}–${showingTo.toLocaleString()} of ${meta.total.toLocaleString()}`
                                            : 'Showing 0 of 0'
                                    } · ${meta.generatedAt}${meta.stale ? ' · stale' : ''}`
                                    : loading
                                        ? 'Loading…'
                                        : '—'}
                            </p>
                            <div className="flex items-center gap-2">
                                <select
                                    value={pageSize}
                                    onChange={(e) => replaceQuery({ pageSize: Number(e.target.value) === REASONS_DEFAULT_PAGE_SIZE ? null : e.target.value }, true)}
                                    className={`bg-transparent text-[11px] font-bold ${theme.textSecondary} outline-none`}
                                >
                                    {PAGE_SIZE_OPTIONS.filter((n) => n <= REASONS_MAX_PAGE_SIZE).map((n) => (
                                        <option key={n} value={n}>{n} / page</option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    disabled={!meta || meta.page <= 1}
                                    onClick={() => replaceQuery({ page: page - 1 })}
                                    className={`p-1.5 rounded-lg ${theme.inputBg} disabled:opacity-40`}
                                    aria-label="Previous page"
                                >
                                    <ChevronLeft size={14} />
                                </button>
                                <span className={`text-[11px] tabular-nums ${theme.textMuted}`}>{meta?.page || page} / {maxPage}</span>
                                <button
                                    type="button"
                                    disabled={!meta || meta.page >= maxPage}
                                    onClick={() => replaceQuery({ page: page + 1 })}
                                    className={`p-1.5 rounded-lg ${theme.inputBg} disabled:opacity-40`}
                                    aria-label="Next page"
                                >
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
