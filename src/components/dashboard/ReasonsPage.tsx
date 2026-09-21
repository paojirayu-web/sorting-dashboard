"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
    ArrowLeft,
    Boxes,
    ChevronDown,
    Droplet,
    Layers,
    Menu,
    Moon,
    RefreshCw,
    Search,
    Sun,
} from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { ReasonsFocus } from '@/components/dashboard/ReasonsFocus';
import { ReasonsOverview } from '@/components/dashboard/ReasonsOverview';
import { dashboardViewHref } from '@/lib/dashboard-view';
import { themes, type Theme, type ThemeName } from '@/lib/themes';
import {
    REASONS_CP_OPTIONS,
    REASONS_DEFAULT_CP,
    REASONS_DEFAULT_FAMILY,
    REASONS_FAMILY_OPTIONS,
    REASONS_FORMING_OPTIONS,
    REASONS_GLAZE_OPTIONS,
    familyForFocusTone,
    nextToneForFamily,
    toneOptionsForFamily,
    parseReasonsCp,
    parseReasonsFamily,
    parseReasonsForming,
    parseReasonsGlaze,
    parseReasonsGroups,
    parseReasonsKind,
    parseReasonsTone,
    parseReasonsYearParam,
    reasonsGroupsQuery,
    reasonsYearOptions,
    type ReasonsDetailResponse,
    type ReasonsFamily,
    type ReasonsFocusTone,
    type ReasonsGroupOption,
    type ReasonsKind,
    type ReasonsOverviewResponse,
    type ReasonsToneParam,
    type ReasonsYearParam,
} from '@/lib/reasons';
import { getDashboardSkin, type DwKind, type LineFamily, type WwTone } from '@/lib/sort-source';

const SCRAP_COLOR = '#ef4444';
const REJECT_COLOR = '#f97316';

function reasonsSkin(family: ReasonsFamily, tone: ReasonsToneParam): string {
    const lineFamily: LineFamily = family === 'ww' ? 'WW' : family === 'dw' ? 'DW' : 'ALL';
    const wwTone: WwTone = tone === 'white' ? 'WW_WHITE' : tone === 'black' ? 'WW_BLACK' : 'ALL';
    const dwKind: DwKind = tone === 'onglaze' ? 'ONGLAZE' : tone === 'inglaze' ? 'INGLAZE' : 'ALL';
    return getDashboardSkin(lineFamily, wwTone, dwKind);
}

function SegmentedPills<T extends string>({
    theme,
    value,
    onChange,
    options,
    activeColor,
    className = '',
}: {
    theme: Theme;
    value: T;
    onChange: (value: T) => void;
    options: { value: T; label: string }[];
    activeColor?: string;
    className?: string;
}) {
    return (
        <div className={`flex items-center ${theme.inputBg} rounded-xl p-1 border ${theme.borderColor} shrink-0 min-w-0 ${className}`}>
            {options.map((opt) => {
                const active = value === opt.value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange(opt.value)}
                        className={`flex-1 px-1.5 sm:px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold leading-tight transition-colors whitespace-nowrap ${
                            active ? 'text-white shadow-md' : `${theme.textMuted} hover:${theme.textWhite}`
                        }`}
                        style={active ? { background: activeColor || 'var(--skin-accent, #2563eb)' } : undefined}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}

function FamilyToggle({
    theme,
    family,
    tone,
    toneOptions,
    onFamily,
    onTone,
    className = '',
}: {
    theme: Theme;
    family: ReasonsFamily;
    tone: ReasonsToneParam;
    toneOptions: { value: ReasonsToneParam; label: string }[];
    onFamily: (next: ReasonsFamily) => void;
    onTone: (next: ReasonsToneParam) => void;
    className?: string;
}) {
    return (
        <div className={`flex flex-col lg:flex-row items-stretch lg:items-center gap-1 min-w-0 ${className}`}>
            <SegmentedPills
                theme={theme}
                value={family}
                onChange={onFamily}
                options={REASONS_FAMILY_OPTIONS}
            />
            {toneOptions.length > 0 && (
                <SegmentedPills
                    theme={theme}
                    value={tone}
                    onChange={onTone}
                    options={toneOptions}
                    className="dash-subfade"
                />
            )}
        </div>
    );
}

function DefectPicker({
    theme,
    currentTheme,
    options,
    onSelect,
}: {
    theme: Theme;
    currentTheme: ThemeName;
    options: string[];
    onSelect: (rsn: string) => void;
}) {
    const rootRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState('');
    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase();
        const list = needle
            ? options.filter((rsn) => rsn.toLowerCase().includes(needle))
            : options;
        return list.slice(0, 80);
    }, [options, q]);

    useEffect(() => {
        const onDoc = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    const pick = (rsn: string) => {
        onSelect(rsn);
        setQ('');
        setOpen(false);
    };

    return (
        <div ref={rootRef} className="relative min-w-[11rem] max-w-[18rem] w-[14rem] shrink-0">
            <label className={`flex items-center gap-1.5 px-2.5 py-1.5 ${theme.inputBg} rounded-xl border ${theme.borderColor}`}>
                <Search size={14} className={`${theme.textMuted} shrink-0`} />
                <input
                    value={q}
                    onChange={(e) => {
                        setQ(e.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            const next = filtered[0] || q.trim();
                            if (!next) return;
                            e.preventDefault();
                            pick(next);
                        }
                        if (e.key === 'Escape') setOpen(false);
                    }}
                    placeholder="Select defect..."
                    title="Select defect to open Focus"
                    className={`bg-transparent text-xs font-bold ${theme.textWhite} outline-none w-full min-w-0`}
                    style={{ colorScheme: currentTheme }}
                />
            </label>
            {open && (
                <div className={`absolute top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto z-[60] ${theme.cardBg} border ${theme.borderColor} rounded-xl shadow-lg`}>
                    {filtered.length === 0 ? (
                        <p className={`px-3 py-2 text-[11px] ${theme.textMuted}`}>No matching defect</p>
                    ) : filtered.map((rsn) => (
                        <button
                            key={rsn}
                            type="button"
                            onClick={() => pick(rsn)}
                            className={`w-full text-left px-3 py-1.5 text-xs font-semibold ${theme.textWhite} ${theme.tableRowHover}`}
                        >
                            {rsn}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function ExtraFilters({
    theme,
    currentTheme,
    kind,
    year,
    yearOptions,
    cp,
    showYear = true,
    rsnOptions,
    onKind,
    onYear,
    onCp,
    onSelectRsn,
}: {
    theme: Theme;
    currentTheme: ThemeName;
    kind: ReasonsKind;
    year: ReasonsYearParam;
    yearOptions: number[];
    cp: string;
    showYear?: boolean;
    rsnOptions: string[];
    onKind: (next: ReasonsKind) => void;
    onYear: (next: string) => void;
    onCp: (next: string) => void;
    onSelectRsn: (rsn: string) => void;
}) {
    const optionClass = currentTheme === 'dark' ? 'bg-[#141414] text-white' : 'bg-white text-zinc-900';
    const selectClass = `bg-transparent text-xs font-bold ${theme.textWhite} outline-none cursor-pointer`;
    const cpOptions = REASONS_CP_OPTIONS.some((option) => option.value === cp)
        ? REASONS_CP_OPTIONS
        : [...REASONS_CP_OPTIONS, { value: cp, label: cp }];
    return (
        <>
            <SegmentedPills
                theme={theme}
                value={kind}
                onChange={onKind}
                options={[
                    { value: 'scrap' as ReasonsKind, label: 'Scrap' },
                    { value: 'reject' as ReasonsKind, label: 'Reject' },
                ]}
                activeColor={kind === 'scrap' ? SCRAP_COLOR : REJECT_COLOR}
            />
            <label className={`flex items-center gap-1.5 px-2.5 py-1.5 ${theme.inputBg} rounded-xl border ${theme.borderColor} shrink-0`}>
                <span className={`text-[10px] font-bold ${theme.textMuted}`}>CP</span>
                <select
                    value={cp}
                    onChange={(e) => onCp(e.target.value)}
                    className={selectClass}
                    title="Select m_cp"
                    style={{ colorScheme: currentTheme }}
                >
                    {cpOptions.map((option) => (
                        <option key={option.value} value={option.value} className={optionClass}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </label>
            {showYear && (
            <label className={`flex items-center gap-1.5 px-2.5 py-1.5 ${theme.inputBg} rounded-xl border ${theme.borderColor} shrink-0`}>
                <span className={`text-[10px] font-bold ${theme.textMuted}`}>Year</span>
                <select
                    value={year === 'all' ? 'all' : String(year)}
                    onChange={(e) => onYear(e.target.value)}
                    className={selectClass}
                    title="Select year"
                    style={{ colorScheme: currentTheme }}
                >
                    <option value="all" className={optionClass}>All</option>
                    {yearOptions.map((option) => (
                        <option key={option} value={option} className={optionClass}>
                            {option}
                        </option>
                    ))}
                    {year !== 'all' && !yearOptions.includes(year) && (
                        <option value={year} className={optionClass}>{year}</option>
                    )}
                </select>
            </label>
            )}
            <DefectPicker
                theme={theme}
                currentTheme={currentTheme}
                options={rsnOptions}
                onSelect={onSelectRsn}
            />
        </>
    );
}

function MixFilters({
    theme,
    currentTheme,
    group,
    forming,
    glaze,
    groupOptions,
    onGroup,
    onForming,
    onGlaze,
}: {
    theme: Theme;
    currentTheme: ThemeName;
    group: string[];
    forming: string;
    glaze: string;
    groupOptions: ReasonsGroupOption[];
    onGroup: (next: string[]) => void;
    onForming: (next: string) => void;
    onGlaze: (next: string) => void;
}) {
    const optionClass = currentTheme === 'dark' ? 'bg-[#141414] text-white' : 'bg-white text-zinc-900';
    const selectClass = `bg-transparent text-[10px] sm:text-xs font-bold ${theme.textWhite} outline-none cursor-pointer min-w-0 w-full`;
    const chip = `flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 ${theme.inputBg} rounded-xl border ${theme.borderColor} min-w-0 flex-1`;
    const labels = Object.fromEntries(groupOptions.map((opt) => [opt.value, opt.label]));
    return (
        <div className="flex items-stretch gap-1.5 w-full min-w-0">
            <div className={chip}>
                <Boxes size={14} className={`${theme.textMuted} shrink-0`} />
                <span className={`text-[10px] font-bold ${theme.textMuted} shrink-0`}>Group</span>
                <GroupMultiSelect
                    theme={theme}
                    currentTheme={currentTheme}
                    values={group}
                    onChange={onGroup}
                    options={groupOptions.map((opt) => opt.value)}
                    labels={labels}
                />
            </div>
            <label className={chip}>
                <Layers size={14} className={`${theme.textMuted} shrink-0`} />
                <span className={`text-[10px] font-bold ${theme.textMuted} shrink-0`}>Forming</span>
                <select value={forming} onChange={(e) => onForming(e.target.value)} className={selectClass} title="Forming" style={{ colorScheme: currentTheme }}>
                    {REASONS_FORMING_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value} className={optionClass}>{option.label}</option>
                    ))}
                </select>
            </label>
            <label className={chip}>
                <Droplet size={14} className={`${theme.textMuted} shrink-0`} />
                <span className={`text-[10px] font-bold ${theme.textMuted} shrink-0`}>Glaze</span>
                <select value={glaze} onChange={(e) => onGlaze(e.target.value)} className={selectClass} title="Glaze" style={{ colorScheme: currentTheme }}>
                    {REASONS_GLAZE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value} className={optionClass}>{option.label}</option>
                    ))}
                </select>
            </label>
        </div>
    );
}

function GroupMultiSelect({
    theme,
    currentTheme,
    values,
    onChange,
    options,
    labels,
}: {
    theme: Theme;
    currentTheme: ThemeName;
    values: string[];
    onChange: (next: string[]) => void;
    options: string[];
    labels: Record<string, string>;
}) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const isAll = values.length === 0;
    const panelBg = currentTheme === 'dark' ? 'bg-[#141414]' : 'bg-white';
    const summary = isAll
        ? 'All'
        : values.length === 1
            ? (labels[values[0]] || values[0])
            : `${values.length} groups`;

    useEffect(() => {
        if (!open) return;
        const onDoc = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [open]);

    const toggle = (value: string) => {
        if (values.includes(value)) {
            onChange(values.filter((v) => v !== value));
            return;
        }
        onChange([...values, value]);
    };

    return (
        <div ref={rootRef} className="relative min-w-0 w-full">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className={`flex items-center gap-1 bg-transparent outline-none text-[10px] sm:text-xs font-bold ${theme.textWhite} cursor-pointer min-w-0 w-full`}
                title={isAll ? 'All groups' : values.map((v) => labels[v] || v).join(', ')}
                aria-expanded={open}
                aria-haspopup="listbox"
            >
                <span className="truncate text-left flex-1">{summary}</span>
                <ChevronDown className={`w-3.5 h-3.5 shrink-0 opacity-70 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div
                    role="listbox"
                    className={`absolute left-0 top-full z-[80] mt-2 min-w-[12rem] w-max max-w-[18rem] max-h-[min(20rem,50vh)] overflow-y-auto rounded-xl border ${theme.borderColor} ${panelBg} shadow-2xl py-1`}
                >
                    <label className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${isAll ? theme.accentText : theme.textSecondary}`}>
                        <input
                            type="checkbox"
                            checked={isAll}
                            onChange={() => onChange([])}
                            className="rounded border-gray-500 accent-blue-600"
                        />
                        <span className="text-xs font-bold">All</span>
                    </label>
                    <div className={`border-t ${theme.borderColor} my-0.5`} />
                    {options.map((opt) => {
                        const checked = values.includes(opt);
                        return (
                            <label
                                key={opt}
                                className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${checked ? theme.accentText : theme.textSecondary}`}
                            >
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggle(opt)}
                                    className="rounded border-gray-500 accent-blue-600"
                                />
                                <span className="text-xs font-bold leading-snug">{labels[opt] || opt}</span>
                            </label>
                        );
                    })}
                    {options.length === 0 && (
                        <p className={`px-3 py-2 text-[11px] ${theme.textMuted}`}>Loading groups…</p>
                    )}
                </div>
            )}
        </div>
    );
}

export function ReasonsPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [currentTheme, setCurrentTheme] = useState<ThemeName>('dark');
    const theme = themes[currentTheme];
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const year = parseReasonsYearParam(searchParams.get('year'));
    const kind = parseReasonsKind(searchParams.get('kind'));
    const family = parseReasonsFamily(searchParams.get('family'));
    const tone = parseReasonsTone(family, searchParams.get('tone'));
    const cp = parseReasonsCp(searchParams.get('cp'));
    const group = parseReasonsGroups(searchParams.get('group'));
    const groupKey = reasonsGroupsQuery(group) || '';
    const forming = parseReasonsForming(searchParams.get('forming'));
    const glaze = parseReasonsGlaze(searchParams.get('glaze'));
    const rsn = (searchParams.get('rsn') || '').trim();
    const isFocus = Boolean(rsn);
    const accent = kind === 'scrap' ? SCRAP_COLOR : REJECT_COLOR;
    const yearOptions = useMemo(() => reasonsYearOptions(), []);
    const toneOptions = toneOptionsForFamily(family);

    const [overview, setOverview] = useState<ReasonsOverviewResponse | null>(null);
    const [overviewLoading, setOverviewLoading] = useState(() => !rsn);
    const [overviewError, setOverviewError] = useState<string | null>(null);
    const [overviewRetry, setOverviewRetry] = useState(0);

    const [detail, setDetail] = useState<ReasonsDetailResponse | null>(null);
    const [detailLoading, setDetailLoading] = useState(() => Boolean(rsn));
    const [detailError, setDetailError] = useState<string | null>(null);
    const [detailRetry, setDetailRetry] = useState(0);

    const replaceQuery = useCallback((patch: Record<string, string | number | null | undefined>) => {
        const next = new URLSearchParams(searchParams.toString());
        for (const [key, value] of Object.entries(patch)) {
            if (value == null || value === '') next.delete(key);
            else next.set(key, String(value));
        }
        // Drop leftover overview-list / Shape params
        next.delete('view');
        next.delete('q');
        next.delete('page');
        next.delete('pageSize');
        next.delete('sort');
        next.delete('dir');
        next.delete('shape');
        const qs = next.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, [pathname, router, searchParams]);

    const applyFamily = useCallback((next: ReasonsFamily) => {
        const kept = nextToneForFamily(next, tone);
        replaceQuery({
            family: next === REASONS_DEFAULT_FAMILY ? null : next,
            tone: kept === 'all' ? null : kept,
        });
    }, [replaceQuery, tone]);

    const applyTone = useCallback((next: ReasonsToneParam) => {
        replaceQuery({ tone: next === 'all' ? null : next });
    }, [replaceQuery]);

    useEffect(() => {
        document.title = isFocus ? `Defects Focus · ${rsn}` : 'Defects · Overview';
    }, [isFocus, rsn]);

    // Layer A — overview only when no rsn
    useEffect(() => {
        if (isFocus) {
            setOverviewLoading(false);
            return;
        }
        const controller = new AbortController();
        const params = new URLSearchParams({
            year: String(year),
            kind,
            family,
            tone,
            cp,
            forming,
            glaze,
        });
        const groupQuery = reasonsGroupsQuery(group);
        if (groupQuery) params.set('group', groupQuery);
        if (overviewRetry > 0) params.set('refresh', '1');
        setOverviewLoading(true);
        setOverviewError(null);
        fetch(`/api/reasons/overview?${params}`, { signal: controller.signal })
            .then(async (res) => {
                const body = await res.json();
                if (!res.ok || body?.error) {
                    throw new Error(String(body?.error || `Request failed (${res.status})`));
                }
                setOverview(body as ReasonsOverviewResponse);
            })
            .catch((err: unknown) => {
                if (controller.signal.aborted) return;
                setOverview(null);
                setOverviewError(err instanceof Error ? err.message : 'Overview failed');
            })
            .finally(() => {
                if (!controller.signal.aborted) setOverviewLoading(false);
            });
        return () => controller.abort();
    }, [isFocus, year, kind, family, tone, cp, groupKey, forming, glaze, overviewRetry]);

    // Layer B — detail only when rsn present
    useEffect(() => {
        if (!isFocus || !rsn) {
            setDetail(null);
            setDetailLoading(false);
            setDetailError(null);
            return;
        }
        const controller = new AbortController();
        const params = new URLSearchParams({
            rsn,
            year: String(year),
            kind,
            family,
            tone,
            cp,
            forming,
            glaze,
        });
        const groupQuery = reasonsGroupsQuery(group);
        if (groupQuery) params.set('group', groupQuery);
        if (detailRetry > 0) params.set('refresh', '1');
        setDetailLoading(true);
        setDetailError(null);
        fetch(`/api/reasons/detail?${params}`, { signal: controller.signal })
            .then(async (res) => {
                const body = await res.json();
                if (!res.ok || body?.error) {
                    throw new Error(String(body?.error || `Request failed (${res.status})`));
                }
                setDetail(body as ReasonsDetailResponse);
            })
            .catch((err: unknown) => {
                if (controller.signal.aborted) return;
                setDetail(null);
                setDetailError(err instanceof Error ? err.message : 'Detail failed');
            })
            .finally(() => {
                if (!controller.signal.aborted) setDetailLoading(false);
            });
        return () => controller.abort();
    }, [isFocus, rsn, year, kind, family, tone, cp, groupKey, forming, glaze, detailRetry]);

    const groupOptions = overview?.groupOptions?.length
        ? overview.groupOptions
        : (detail?.groupOptions || []);
    const refreshing = isFocus ? detailLoading : overviewLoading;
    const iconBtn = `p-2 sm:p-2.5 rounded-xl ${theme.inputBg} ${theme.textSecondary} hover:${theme.textWhite} transition-all shrink-0 touch-manipulation`;

    return (
        <div
            className={`dash-skin flex h-screen ${theme.pageBg} ${theme.textPrimary} font-sans overflow-hidden transition-colors duration-300`}
            data-skin={reasonsSkin(family, tone)}
            data-ui-theme={currentTheme}
            data-mode={isFocus ? 'focus' : 'overview'}
        >
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
            )}
            <Sidebar
                theme={theme}
                view="overview"
                isSidebarOpen={sidebarOpen}
                onSetView={(next) => router.push(dashboardViewHref(next))}
                onClose={() => setSidebarOpen(false)}
            />
            <main className="flex-1 flex flex-col overflow-hidden min-w-0">
                <header className={`sticky top-0 z-50 ${theme.headerBg} backdrop-blur-xl border-b ${theme.borderColor}`}>
                    <div className="flex items-center justify-between gap-2 px-3 sm:px-4 md:px-6 min-h-14 md:min-h-16 py-2 min-w-0">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                            <button
                                type="button"
                                onClick={() => setSidebarOpen(true)}
                                className={iconBtn}
                                title="Toggle Sidebar"
                                aria-label="Toggle sidebar"
                            >
                                <Menu size={20} />
                            </button>
                            <h1 className={`text-sm sm:text-base md:text-lg font-bold ${theme.textWhite} tracking-tight truncate flex items-center gap-2 min-w-0`}>
                                {isFocus ? (
                                    <>
                                        <span className="shrink-0">Focus</span>
                                        <button
                                            type="button"
                                            onClick={() => replaceQuery({ rsn: null })}
                                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg ${theme.inputBg} border ${theme.borderColor} text-[11px] font-bold ${theme.textSecondary} shrink-0`}
                                            title="กลับภาพรวม"
                                        >
                                            <ArrowLeft size={14} />
                                            ภาพรวม
                                        </button>
                                    </>
                                ) : (
                                    <span className="truncate">Defects</span>
                                )}
                                {refreshing && (
                                    <span className="inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                                )}
                            </h1>
                            <FamilyToggle
                                theme={theme}
                                family={family}
                                tone={tone}
                                toneOptions={toneOptions}
                                onFamily={applyFamily}
                                onTone={applyTone}
                                className="hidden lg:flex"
                            />
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                            <div className="hidden lg:flex items-center gap-2">
                                <ExtraFilters
                                    theme={theme}
                                    currentTheme={currentTheme}
                                    kind={kind}
                                    year={year}
                                    yearOptions={yearOptions}
                                    cp={cp}
                                    showYear={!isFocus}
                                    rsnOptions={overview?.rsnOptions || []}
                                    onKind={(next) => replaceQuery({
                                        kind: next === 'scrap' ? null : next,
                                        ...(isFocus && next === 'reject' ? { rsn: null } : {}),
                                    })}
                                    onYear={(next) => replaceQuery({ year: next })}
                                    onCp={(next) => replaceQuery({
                                        cp: next === REASONS_DEFAULT_CP ? null : next,
                                    })}
                                    onSelectRsn={(next) => replaceQuery({ rsn: next })}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    if (isFocus) setDetailRetry((n) => n + 1);
                                    else setOverviewRetry((n) => n + 1);
                                }}
                                disabled={refreshing}
                                className={`${iconBtn} ${refreshing ? 'animate-spin' : ''}`}
                                title="Refresh Data"
                                aria-label="Refresh data"
                            >
                                <RefreshCw size={18} className={refreshing ? 'skin-accent-text' : ''} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setCurrentTheme(currentTheme === 'dark' ? 'light' : 'dark')}
                                className={iconBtn}
                                title="Toggle Theme"
                                aria-label="Toggle theme"
                            >
                                {currentTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                            </button>
                        </div>
                    </div>
                    <div className={`flex items-center w-full min-w-0 px-3 sm:px-4 md:px-6 py-2 border-t ${theme.borderColor}`}>
                        <MixFilters
                            theme={theme}
                            currentTheme={currentTheme}
                            group={group}
                            forming={forming}
                            glaze={glaze}
                            groupOptions={groupOptions}
                            onGroup={(next) => replaceQuery({ group: reasonsGroupsQuery(next) })}
                            onForming={(next) => replaceQuery({ forming: next === 'all' ? null : next })}
                            onGlaze={(next) => replaceQuery({ glaze: next === 'all' ? null : next })}
                        />
                    </div>
                    <div className={`lg:hidden border-t ${theme.borderColor} px-3 sm:px-4 pt-2 pb-2`}>
                        <FamilyToggle
                            theme={theme}
                            family={family}
                            tone={tone}
                            toneOptions={toneOptions}
                            onFamily={applyFamily}
                            onTone={applyTone}
                            className="w-full"
                        />
                    </div>
                    <div className={`lg:hidden border-t ${theme.borderColor} px-3 sm:px-4 pb-3 pt-2`}>
                        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 -mx-1 px-1">
                            <ExtraFilters
                                theme={theme}
                                currentTheme={currentTheme}
                                kind={kind}
                                year={year}
                                yearOptions={yearOptions}
                                cp={cp}
                                showYear={!isFocus}
                                rsnOptions={overview?.rsnOptions || []}
                                onKind={(next) => replaceQuery({
                                    kind: next === 'scrap' ? null : next,
                                    ...(isFocus && next === 'reject' ? { rsn: null } : {}),
                                })}
                                onYear={(next) => replaceQuery({ year: next })}
                                onCp={(next) => replaceQuery({
                                    cp: next === REASONS_DEFAULT_CP ? null : next,
                                })}
                                onSelectRsn={(next) => replaceQuery({ rsn: next })}
                            />
                        </div>
                    </div>
                </header>

                {isFocus ? (
                    <ReasonsFocus
                        theme={theme}
                        currentTheme={currentTheme}
                        accent={accent}
                        rsn={rsn}
                        kind={kind}
                        year={year}
                        family={family}
                        tone={tone}
                        loading={detailLoading}
                        error={detailError}
                        payload={detail}
                        yearOptions={yearOptions}
                        onYear={(next) => replaceQuery({ year: next })}
                        onRetry={() => setDetailRetry((n) => n + 1)}
                        onKindChange={(next) => replaceQuery({
                            kind: next === 'scrap' ? null : next,
                        })}
                        onFamilyChange={applyFamily}
                        onToneChange={applyTone}
                        onOpenTone={(next: ReasonsFocusTone) => replaceQuery({ tone: next })}
                    />
                ) : (
                    <ReasonsOverview
                        theme={theme}
                        currentTheme={currentTheme}
                        accent={accent}
                        kind={kind}
                        loading={overviewLoading}
                        error={overviewError}
                        payload={overview}
                        onRetry={() => setOverviewRetry((n) => n + 1)}
                        onOpenTone={(next) => replaceQuery({
                            family: familyForFocusTone(next),
                            tone: next,
                            rsn: null,
                        })}
                        onSelectRsn={(next, fromTone) => replaceQuery({
                            rsn: next,
                            ...(fromTone
                                ? { family: familyForFocusTone(fromTone), tone: fromTone }
                                : {}),
                        })}
                    />
                )}
            </main>
        </div>
    );
}