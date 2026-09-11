"use client";

import { useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ComposedChart,
    Legend,
    Line,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    LabelList,
    LineChart,
    type LabelProps,
} from 'recharts';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { type Theme, type ThemeName } from '@/lib/themes';
import {
    FORM_COLOR,
    QTYPROC_DISPLAY_BE_YEARS,
    QTYPROC_HIDDEN_KEYS,
    QTYPROC_MONTH_LABELS,
    QTYPROC_PAGE_TITLE,
    QTYPROC_P_ROUNDS,
    SHAPE_COLOR,
    SHAPE_LABEL,
    pRoundOf,
    qtyProcLineMatches,
    qtyProcRowMatches,
    type QtyProcCpFilter,
    type QtyProcLineFilter,
    type QtyProcPayload,
    type QtyProcReasonRow,
    type QtyProcScope,
    type QtyProcTrendView,
    type QtyProcYearFilter,
} from '@/lib/qtyproc';

const PROCESS_COLOR = '#3b82f6';
const COMP_COLOR = '#16a34a';
const SCRAP_COLOR = '#ef4444';
const REJECT_COLOR = '#f97316';
const OTHER_COLOR = '#94a3b8';
const C_COLOR = PROCESS_COLOR;
const FRIT_COLOR = '#eab308';
const BOM_COLOR = '#c45c32';
const CUSTOM_COLOR = '#eab308';
const CUSTOM_C_COLOR = '#6366f1';
/** All mode: first fire FRIT+BOM combined. */
const LABEL_CUSTOM_FIRST = 'Custom (C)' as const;
/** All mode: later C fire of FRIT+BOM items. */
const LABEL_CUSTOM_AGAIN = 'Custom' as const;
const P_COLOR = '#14b8a6';
const P_ROUND_COLOR: Record<string, string> = {
    P1: '#14b8a6',
    P2: '#0ea5e9',
    P3: '#a855f6',
    P4: '#f43f5e',
    P5: '#78716c',
};
const WHITE_COLOR = '#94a3b8';
const BLACK_COLOR = '#1e293b';
const CUSTOMER_PIE_TOP = 3;
const MIX_BAR_TOP = 3;
const QUALITY_TOP_N = 10;
const CUSTOMER_COLOR = ['#0ea5e9', '#c45c32', '#22c55e', '#8b5cf6', '#eab308', '#ec4899', '#14b8a6', '#f97316'];
const MIDDOT = '\u00B7';
const NDASH = '\u2013';
const ELLIPSIS = '\u2026';

interface QtyProcessViewProps {
    theme: Theme;
    currentTheme: ThemeName;
    payload: QtyProcPayload | null;
    loading: boolean;
    error: string | null;
    categoryLabel: string;
    year: QtyProcYearFilter;
    line: QtyProcLineFilter;
    cp: QtyProcCpFilter;
    scope: QtyProcScope;
    shape: string;
    forming: string;
    customer: string;
    glaze: string;
}

function Card({ theme, className, children }: { theme: Theme; className?: string; children: ReactNode }) {
    return (
        <div className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl p-4 sm:p-5 shadow-sm ${className || ''}`}>
            {children}
        </div>
    );
}

function fmt(n: number) {
    return Math.round(n || 0).toLocaleString('en-US');
}

function fmtCompact(n: number) {
    const v = Math.round(n || 0);
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`;
    if (v >= 10_000) return `${Math.round(v / 1_000)}k`;
    return v.toLocaleString('en-US');
}

function QualityPctLabel(props: LabelProps): ReactElement {
    const x = Number(props.x) || 0;
    const y = Number(props.y) || 0;
    const width = Number(props.width) || 0;
    const height = Number(props.height) || 0;
    const value = Number(props.value) || 0;
    if (value <= 0 || height < 14 || width < 16) return <g />;
    const fontSize = width < 28 || height < 22 ? 9 : 10;
    return (
        <text
            x={x + width / 2}
            y={y + height / 2}
            fill="#ffffff"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={fontSize}
            fontWeight={700}
        >
            {`${value.toFixed(1)}%`}
        </text>
    );
}

const QUALITY_MIN_BAR_PCT = 12;

function qualityBarPcts(actual: { complete: number; reject: number; scrap: number; other: number }) {
    const keys = ['complete', 'reject', 'scrap', 'other'] as const;
    const values: Record<(typeof keys)[number], number> = { ...actual };
    const present = keys.filter((key) => values[key] > 0);
    const out = { CompleteBar: 0, RejectBar: 0, ScrapBar: 0, OtherBar: 0 };
    if (!present.length) return out;
    const min = QUALITY_MIN_BAR_PCT;
    let need = 0;
    for (const key of present) {
        if (values[key] < min) {
            need += min - values[key];
            values[key] = min;
        }
    }
    if (need > 0) {
        const donors = present.filter((key) => actual[key] >= min);
        const donorPool = donors.reduce((sum, key) => sum + Math.max(0, values[key] - min), 0);
        if (donors.length && donorPool > 0) {
            const take = Math.min(need, donorPool);
            for (const key of donors) {
                const slack = Math.max(0, values[key] - min);
                values[key] -= take * (slack / donorPool);
            }
        }
    }
    out.CompleteBar = values.complete;
    out.RejectBar = values.reject;
    out.ScrapBar = values.scrap;
    out.OtherBar = values.other;
    return out;
}

const SERIES_COLOR: Record<string, string> = {
    Process: PROCESS_COLOR,
    Complete: COMP_COLOR,
    'Complete %': COMP_COLOR,
    Scrap: SCRAP_COLOR,
    'Scrap %': SCRAP_COLOR,
    Reject: REJECT_COLOR,
    'Reject %': REJECT_COLOR,
    Other: OTHER_COLOR,
    Standard: PROCESS_COLOR,
    'Standard (C)': PROCESS_COLOR,
    FRIT: FRIT_COLOR,
    BOM: BOM_COLOR,
    Custom: CUSTOM_C_COLOR,
    'Custom (C)': CUSTOM_COLOR,
    P: P_COLOR,
    P1: P_ROUND_COLOR.P1,
    P2: P_ROUND_COLOR.P2,
    P3: P_ROUND_COLOR.P3,
    P4: P_ROUND_COLOR.P4,
    P5: P_ROUND_COLOR.P5,
    Qty: PROCESS_COLOR,
    White: WHITE_COLOR,
    Black: BLACK_COLOR,
};

function seriesColor(name: string | undefined, fallback?: string, isDark?: boolean) {
    if (!name) return fallback || '#71717a';
    if (name === 'Complete' || name === 'Complete %') return isDark ? '#4ade80' : '#15803d';
    if (name === 'Scrap' || name === 'Scrap %') return isDark ? '#fb7185' : '#b91c1c';
    if (name === 'Reject' || name === 'Reject %') return isDark ? '#fb923c' : '#c2410c';
    if (SERIES_COLOR[name]) return SERIES_COLOR[name];
    if (FORM_COLOR[name]) return FORM_COLOR[name];
    if (SHAPE_COLOR[name]) return SHAPE_COLOR[name];
    const shapeKey = Object.keys(SHAPE_LABEL).find((k) => SHAPE_LABEL[k] === name);
    if (shapeKey && SHAPE_COLOR[shapeKey]) return SHAPE_COLOR[shapeKey];
    return fallback || '#71717a';
}

type TipItem = {
    name?: string;
    value?: number;
    color?: string;
    dataKey?: string | number;
    payload?: Record<string, unknown>;
};

function QtyProcTooltip({
    active,
    payload,
    label,
    isDark,
    kind = 'share',
}: {
    active?: boolean;
    payload?: TipItem[];
    label?: string | number;
    isDark: boolean;
    kind?: 'share' | 'quality' | 'plain';
}) {
    if (!active || !payload?.length) return null;
    const seen = new Set<string>();
    const order: Record<string, number> = {
        Process: 1,
        Complete: 2,
        'Complete %': 2,
        Reject: 3,
        'Reject %': 3,
        Scrap: 4,
        'Scrap %': 4,
        Other: 5,
        Standard: 1,
        'Standard (C)': 1,
        Custom: 3,
        'Custom (C)': 2,
        FRIT: 2,
        BOM: 2,
        P: 4,
        P1: 4,
        P2: 5,
        P3: 6,
        P4: 7,
        P5: 8,
    };
    const items = payload
        .filter((item) => {
            const key = String(item.dataKey ?? item.name ?? '');
            if (!key || key === 'total') return false;
            if (/pct$/i.test(key) || /Pct$/.test(key)) return false;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .sort((a, b) => {
            const na = String(a.name || a.dataKey || '');
            const nb = String(b.name || b.dataKey || '');
            return (order[na] ?? 50) - (order[nb] ?? 50);
        });
    if (!items.length) return null;
    const row = items[0]?.payload || {};
    const process = Number(row.Process) || 0;
    const shareTotal = items.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
    const text = isDark ? '#f4f4f5' : '#111827';
    const bg = isDark ? '#18181b' : '#ffffff';
    const border = isDark ? '#52525b' : '#d1d5db';
    const rowColor = typeof row.color === 'string' ? row.color : undefined;

    return (
        <div
            style={{
                background: bg,
                border: `1px solid ${border}`,
                borderRadius: 12,
                padding: '10px 12px',
                minWidth: 168,
                boxShadow: '0 10px 24px rgba(0,0,0,0.18)',
            }}
        >
            <p style={{ color: text, fontWeight: 700, fontSize: 12, marginBottom: 6 }}>{String(label ?? row.name ?? '')}</p>
            {kind === 'quality' && process > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12, lineHeight: '18px', marginBottom: 4 }}>
                    <span style={{ color: PROCESS_COLOR, fontWeight: 700 }}>Process</span>
                    <span style={{ color: text, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt(process)}</span>
                </div>
            )}
            {items.map((item) => {
                const name = String(item.name || item.dataKey || '');
                if (kind === 'quality' && name === 'Process') return null;
                if (kind === 'quality' && (name === 'Other' || name === 'OtherBar') && (Number(item.value) || 0) <= 0) return null;
                const color = seriesColor(name.replace(/Bar$/, ''), item.color || rowColor, isDark);
                const qty = Number(item.value) || 0;
                let extra = '';
                let display = fmt(qty);
                const qtyName = name.replace(/Bar$/, '');
                if (kind === 'quality' && process > 0 && qtyName !== 'Process') {
                    const actualQty = Number(row[qtyName]) || 0;
                    const pct =
                        qtyName === 'Complete' ? Number(row.completePct) || 0
                            : qtyName === 'Reject' ? Number(row.rejectPct) || 0
                                : qtyName === 'Scrap' ? Number(row.scrapPct) || 0
                                    : process ? (actualQty / process) * 100 : 0;
                    display = `${fmt(actualQty)} (${pct.toFixed(1)}%)`;
                } else if (kind === 'share' && shareTotal > 0) {
                    extra = ` (${((qty / shareTotal) * 100).toFixed(1)}%)`;
                }
                return (
                    <div key={name} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12, lineHeight: '18px' }}>
                        <span style={{ color, fontWeight: 700 }}>{name === 'Qty' ? String(row.name || name) : qtyName}</span>
                        <span style={{ color: text, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                            {display}{extra}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

function collapseMixTopN(
    rows: Record<string, string | number>[],
    keys: { key: string; color: string }[],
    n: number,
): { rows: Record<string, string | number>[]; keys: { key: string; color: string }[] } {
    const ranked = keys
        .map((k) => ({ ...k, total: rows.reduce((s, r) => s + (Number(r[k.key]) || 0), 0) }))
        .filter((k) => k.total > 0)
        .sort((a, b) => b.total - a.total);
    const head = ranked.slice(0, n).map(({ key, color }) => ({ key, color }));
    const rest = ranked.slice(n);
    if (!rest.length) return { rows, keys: head };
    const nextRows = rows.map((row) => {
        const out: Record<string, string | number> = { name: row.name };
        for (const k of head) out[k.key] = Number(row[k.key]) || 0;
        out.Other = rest.reduce((s, k) => s + (Number(row[k.key]) || 0), 0);
        return out;
    });
    return {
        rows: nextRows.filter((row) => head.some((k) => (Number(row[k.key]) || 0) > 0) || (Number(row.Other) || 0) > 0),
        keys: [...head, { key: 'Other', color: OTHER_COLOR }],
    };
}

function donutItems<T extends { name: string; qty: number; color: string }>(items: T[]): T[] {
    return items.filter((i) => i.qty > 0).sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name));
}

function firingMixItems(totals: {
    standard: number;
    frit: number;
    bom: number;
    customC: number;
    byP: (round: (typeof QTYPROC_P_ROUNDS)[number]) => number;
    combineCustom: boolean;
    combineP?: boolean;
}): { name: string; qty: number; color: string }[] {
    const pRows = totals.combineP
        ? [{
            name: 'P',
            qty: QTYPROC_P_ROUNDS.reduce((s, round) => s + totals.byP(round), 0),
            color: P_COLOR,
        }]
        : QTYPROC_P_ROUNDS.map((round) => ({
            name: round,
            qty: totals.byP(round),
            color: P_ROUND_COLOR[round],
        }));
    const rows: { name: string; qty: number; color: string }[] = totals.combineCustom
        ? [
            { name: 'Standard (C)', qty: totals.standard, color: C_COLOR },
            { name: LABEL_CUSTOM_FIRST, qty: totals.frit + totals.bom, color: CUSTOM_COLOR },
            { name: LABEL_CUSTOM_AGAIN, qty: totals.customC, color: CUSTOM_C_COLOR },
            ...pRows,
        ]
        : [
            { name: 'Standard (C)', qty: totals.standard, color: C_COLOR },
            { name: 'FRIT', qty: totals.frit, color: FRIT_COLOR },
            { name: 'BOM', qty: totals.bom, color: BOM_COLOR },
        ];
    if (totals.combineCustom) {
        return rows.filter((row) => (
            row.name === LABEL_CUSTOM_FIRST
            || row.name === LABEL_CUSTOM_AGAIN
            || row.qty > 0
        ));
    }
    return rows.filter((row) => row.qty > 0);
}

function MixProgress({
    items,
    total,
    theme,
}: {
    items: { name: string; qty: number; color: string }[];
    total: number;
    theme: Theme;
}) {
    const rows = items.filter((i) => (
        i.qty > 0
        || i.name === LABEL_CUSTOM_FIRST
        || i.name === LABEL_CUSTOM_AGAIN
    ));
    const denom = total > 0 ? total : rows.reduce((s, i) => s + i.qty, 0);
    return (
        <div className="mt-2 space-y-3">
            <p className="text-3xl sm:text-4xl font-black tabular-nums" style={{ color: PROCESS_COLOR }}>{fmt(total)}</p>
            {denom > 0 && (
                <div className="space-y-2">
                    {rows.map((item) => {
                        const pct = (item.qty / denom) * 100;
                        return (
                            <div key={item.name} className="min-w-0" title={`${item.name} ${fmt(item.qty)}`}>
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className="inline-flex items-center gap-1.5 min-w-0">
                                        <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: item.color }} />
                                        <span className={`text-[11px] font-bold truncate ${theme.textSecondary}`}>{item.name}</span>
                                    </span>
                                    <span className={`text-[11px] tabular-nums font-semibold shrink-0 ${theme.textWhite}`}>
                                        {fmt(item.qty)} · {pct.toFixed(1)}%
                                    </span>
                                </div>
                                <div className={`h-2 w-full overflow-hidden rounded-full ${theme.inputBg}`}>
                                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: item.color }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function QtyPctLegend({
    items,
    theme,
    firing,
}: {
    items: { name: string; qty: number; color: string; Standard?: number; FRIT?: number; BOM?: number }[];
    theme: Theme;
    firing?: boolean;
}) {
    const total = items.reduce((s, i) => s + i.qty, 0) || 1;
    const head = `text-[10px] font-bold uppercase tracking-wide ${theme.textMuted}`;
    return (
        <div className="min-w-0 w-full overflow-x-auto">
            <div className={`grid ${firing ? 'grid-cols-[minmax(4.5rem,1fr)_minmax(4rem,auto)_minmax(4rem,auto)_minmax(4rem,auto)_3.25rem]' : 'grid-cols-[minmax(4.5rem,1fr)_minmax(5.5rem,auto)_3.25rem]'} gap-x-4 gap-y-1.5 items-center`}>
                <span className={head}>Name</span>
                {firing ? (
                    <>
                        <span className={`${head} text-right`}>Standard</span>
                        <span className={`${head} text-right`}>FRIT</span>
                        <span className={`${head} text-right`}>BOM</span>
                    </>
                ) : (
                    <span className={`${head} text-right`}>Qty</span>
                )}
                <span className={`${head} text-right`}>%</span>
                {items.map((item) => (
                    <div key={item.name} className="contents">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: item.color }} />
                            <span className={`truncate ${theme.textSecondary}`}>{item.name}</span>
                        </div>
                        {firing ? (
                            <>
                                <span className={`tabular-nums text-right font-semibold ${theme.textWhite}`}>{fmt(item.Standard || 0)}</span>
                                <span className={`tabular-nums text-right font-semibold ${theme.textWhite}`}>{fmt(item.FRIT || 0)}</span>
                                <span className={`tabular-nums text-right font-semibold ${theme.textWhite}`}>{fmt(item.BOM || 0)}</span>
                            </>
                        ) : (
                            <span className={`tabular-nums text-right font-semibold ${theme.textWhite}`}>{fmt(item.qty)}</span>
                        )}
                        <span className={`tabular-nums text-right ${theme.textMuted}`}>
                            {((item.qty / total) * 100).toFixed(1)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

const QUALITY_LIST_COLS = 'grid-cols-[1.25rem_minmax(0,1fr)_minmax(3.25rem,auto)_2.5rem]';

function QualityColHead({ theme }: { theme: Theme }) {
    const head = `text-[10px] font-bold uppercase tracking-wide ${theme.textMuted}`;
    return (
        <div className={`grid ${QUALITY_LIST_COLS} gap-x-2`}>
            <span className={head}>#</span>
            <span className={head}>Reason</span>
            <span className={`${head} text-right`}>Qty</span>
            <span className={`${head} text-right`}>%</span>
        </div>
    );
}

function QualityTopList({
    items,
    color,
    theme,
}: {
    items: { label: string; qty: number; pct: number }[];
    color: string;
    theme: Theme;
}) {
    if (items.length === 0) {
        return <p className={`text-[11px] ${theme.textMuted}`}>No data</p>;
    }
    return (
        <div className={`grid ${QUALITY_LIST_COLS} gap-x-2 gap-y-1 items-start`}>
            {items.map((item, i) => (
                <div key={item.label} className="contents">
                    <span className={`tabular-nums text-xs font-bold ${theme.textMuted} pt-0.5`}>{i + 1}</span>
                    <span className={`text-xs font-bold leading-snug whitespace-normal break-words ${theme.textSecondary}`}>
                        {item.label}
                    </span>
                    <span className="tabular-nums text-right text-xs font-semibold pt-0.5" style={{ color }}>
                        {fmt(item.qty)}
                    </span>
                    <span className={`tabular-nums text-right text-xs ${theme.textMuted} pt-0.5`}>
                        {item.pct.toFixed(1)}
                    </span>
                </div>
            ))}
        </div>
    );
}

function QualityTopByPeriod({
    periods,
    scrapColor,
    rejectColor,
    theme,
}: {
    periods: { name: string; scrap: { label: string; qty: number; pct: number }[]; reject: { label: string; qty: number; pct: number }[] }[];
    scrapColor: string;
    rejectColor: string;
    theme: Theme;
}) {
    const [mobileKind, setMobileKind] = useState<'scrap' | 'reject'>('scrap');
    const headRef = useRef<HTMLDivElement>(null);
    const [headH, setHeadH] = useState(52);
    useEffect(() => {
        const el = headRef.current;
        if (!el) return;
        const update = () => setHeadH(el.offsetHeight);
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, [periods.length]);
    if (periods.length === 0) {
        return <p className={`text-[11px] ${theme.textMuted}`}>No data in this filter</p>;
    }
    return (
        <div className="h-full min-h-0 overflow-y-auto pr-1">
            <div
                ref={headRef}
                className={`sticky top-0 z-10 -mx-1 px-1 pt-0 pb-2 ${theme.cardBg} border-b ${theme.borderColor}`}
            >
                <div className={`sm:hidden flex items-center ${theme.inputBg} rounded-xl p-1 border ${theme.borderColor} mb-2`}>
                    {(['scrap', 'reject'] as const).map((kind) => (
                        <button
                            key={kind}
                            type="button"
                            onClick={() => setMobileKind(kind)}
                            className={`flex-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                mobileKind === kind ? `${theme.accentBg} text-white` : theme.textMuted
                            }`}
                        >
                            {kind === 'scrap' ? `Top ${QUALITY_TOP_N} Scrap` : `Top ${QUALITY_TOP_N} Reject`}
                        </button>
                    ))}
                </div>
                <div className="hidden sm:grid grid-cols-2 gap-3">
                    <h4 className="text-sm font-bold" style={{ color: scrapColor }}>Top {QUALITY_TOP_N} Scrap</h4>
                    <h4 className="text-sm font-bold" style={{ color: rejectColor }}>Top {QUALITY_TOP_N} Reject</h4>
                </div>
                <div className="hidden sm:grid grid-cols-2 gap-3 mt-1">
                    <QualityColHead theme={theme} />
                    <QualityColHead theme={theme} />
                </div>
                <div className="sm:hidden mt-1">
                    <QualityColHead theme={theme} />
                </div>
            </div>
            <div className="space-y-3 pt-2">
                {periods.map((period) => (
                    <section key={period.name} className={`min-w-0 pb-4 border-b ${theme.borderColor} last:border-0 last:pb-0`}>
                        <p
                            className={`sticky z-[9] -mx-1 px-1 py-1 text-[10px] font-bold uppercase tracking-wider ${theme.textMuted} ${theme.cardBg} mb-2`}
                            style={{ top: headH }}
                        >
                            {period.name}
                        </p>
                        <div className="hidden sm:grid grid-cols-2 gap-3">
                            <QualityTopList items={period.scrap} color={scrapColor} theme={theme} />
                            <QualityTopList items={period.reject} color={rejectColor} theme={theme} />
                        </div>
                        <div className="sm:hidden">
                            <QualityTopList
                                items={mobileKind === 'scrap' ? period.scrap : period.reject}
                                color={mobileKind === 'scrap' ? scrapColor : rejectColor}
                                theme={theme}
                            />
                        </div>
                    </section>
                ))}
            </div>
        </div>
    );
}

function topQualityReasons(
    rows: QtyProcReasonRow[],
    process: number,
    n = QUALITY_TOP_N,
): { label: string; qty: number; pct: number }[] {
    const byReason = new Map<string, number>();
    for (const row of rows) {
        const label = (row.rsn_desc || '').trim();
        if (!label || row.qty <= 0) continue;
        byReason.set(label, (byReason.get(label) || 0) + row.qty);
    }
    return [...byReason.entries()]
        .map(([label, qty]) => ({
            label,
            qty,
            pct: process ? (qty / process) * 100 : 0,
        }))
        .sort((a, b) => b.qty - a.qty || a.label.localeCompare(b.label))
        .slice(0, n);
}

function firingPart(cp: string): 'Standard' | 'FRIT' | 'BOM' | 'P' | 'Custom' {
    if (pRoundOf(cp)) return 'P';
    const kind = String(cp || '');
    if (kind === 'CUSTOM_C') return 'Custom';
    if (kind === 'BOM' || kind === 'C1') return 'BOM';
    if (kind === 'FRIT') return 'FRIT';
    return 'Standard';
}

function DonutWithLegend({
    items,
    theme,
    isDark,
}: {
    items: { name: string; qty: number; color: string }[];
    theme: Theme;
    isDark: boolean;
}) {
    return (
        <div className="flex flex-col gap-3">
            <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={items}
                            dataKey="qty"
                            nameKey="name"
                            innerRadius={48}
                            outerRadius={72}
                            paddingAngle={1}
                            isAnimationActive={false}
                        >
                            {items.map((item) => (
                                <Cell key={item.name} fill={item.color} />
                            ))}
                        </Pie>
                        <Tooltip content={<QtyProcTooltip isDark={isDark} kind="share" />} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <QtyPctLegend items={items} theme={theme} />
        </div>
    );
}


export function QtyProcessView({
    theme,
    currentTheme,
    payload,
    loading,
    error,
    categoryLabel,
    year,
    line,
    cp,
    scope,
    shape,
    forming,
    customer,
    glaze,
}: QtyProcessViewProps) {
    const [trendView, setTrendView] = useState<QtyProcTrendView>('forming');
    const [showQualityNumbers, setShowQualityNumbers] = useState(false);

    const isMonthly = year !== 'all';
    const selectedYear = year === 'all' ? QTYPROC_DISPLAY_BE_YEARS[0] : year;
    const yearsSel = year === 'all' ? [...QTYPROC_DISPLAY_BE_YEARS] : [year];
    const yearRangeLabel = `${QTYPROC_DISPLAY_BE_YEARS[0]}${NDASH}${QTYPROC_DISPLAY_BE_YEARS[QTYPROC_DISPLAY_BE_YEARS.length - 1]}`;
    const isDark = currentTheme === 'dark';
    const gridStroke = isDark ? '#27272a' : '#e5e7eb';
    const tickFill = isDark ? '#d4d4d8' : '#374151';
    const completeColor = isDark ? '#4ade80' : '#15803d';
    const scrapColor = isDark ? '#fb7185' : '#b91c1c';
    const rejectColor = isDark ? '#fb923c' : '#c2410c';
    const otherColor = isDark ? '#52525b' : '#cbd5e1';

    const mixOk = (r: { shape: string; forming: string; tone?: string; customer?: string; glaze?: string }) => {
        if (QTYPROC_HIDDEN_KEYS.has(String(r.shape).toLowerCase()) || QTYPROC_HIDDEN_KEYS.has(String(r.forming).toLowerCase())) {
            return false;
        }
        if (shape !== 'all' && r.shape !== shape) return false;
        if (forming !== 'all' && r.forming !== forming) return false;
        if (!qtyProcLineMatches(line, r.tone || '')) return false;
        if (customer !== 'all' && (r.customer || '(blank)') !== customer) return false;
        if (glaze !== 'all' && (r.glaze || 'unknown') !== glaze) return false;
        return true;
    };

    const firingRowOk = (r: { y: number; shape: string; forming: string; tone?: string; customer?: string }) => mixOk(r);

    const useYearTotals = shape === 'all' && forming === 'all' && line === 'all' && customer === 'all' && glaze === 'all';

    const emptyP = () => ({ p1: 0, p2: 0, p3: 0, p4: 0, p5: 0 });

    const splitAt = (y: number, month?: number) => {
        let c = 0;
        let frit = 0;
        let bom = 0;
        let customC = 0;
        const pQty = emptyP();
        if (useYearTotals) {
            if (month == null) {
                const block = payload?.byYear?.[String(y)];
                c = block?.c || 0;
                frit = block?.frit || 0;
                bom = block?.bom || 0;
                customC = block?.customC || 0;
                pQty.p1 = block?.p1 || 0;
                pQty.p2 = block?.p2 || 0;
                pQty.p3 = block?.p3 || 0;
                pQty.p4 = block?.p4 || 0;
                pQty.p5 = block?.p5 || 0;
            } else {
                const slot = payload?.byYear?.[String(y)]?.months?.[month - 1];
                c = slot?.c || 0;
                frit = slot?.frit || 0;
                bom = slot?.bom || 0;
                customC = slot?.customC || 0;
                pQty.p1 = slot?.p1 || 0;
                pQty.p2 = slot?.p2 || 0;
                pQty.p3 = slot?.p3 || 0;
                pQty.p4 = slot?.p4 || 0;
                pQty.p5 = slot?.p5 || 0;
            }
        } else {
            (payload?.mix || []).forEach((r) => {
                if (r.y !== y || !firingRowOk(r)) return;
                if (month != null && Number(r.m) !== month) return;
                const kind = String(r.cp);
                const p = pRoundOf(kind);
                if (p) {
                    pQty[`p${p.slice(1)}` as keyof typeof pQty] += r.qtyproc;
                } else if (kind === 'CUSTOM_C') customC += r.qtyproc;
                else if (kind === 'BOM' || kind === 'C1') bom += r.qtyproc;
                else if (kind === 'FRIT') frit += r.qtyproc;
                else if (kind === 'C') c += r.qtyproc;
            });
        }
        if (cp === 'C') return { c, frit: 0, bom: 0, c1: 0, customC: 0, ...emptyP() };
        if (cp === 'FRIT') return { c: 0, frit, bom: 0, c1: frit, customC: 0, ...emptyP() };
        if (cp === 'BOM') return { c: 0, frit: 0, bom, c1: bom, customC: 0, ...emptyP() };
        if (cp === 'C1') return { c: 0, frit, bom, c1: frit + bom, customC: 0, ...emptyP() };
        if (cp === 'CUSTOM') return { c: 0, frit: 0, bom: 0, c1: 0, customC, ...emptyP() };
        if (scope !== 'all') return { c, frit, bom, c1: frit + bom, customC: 0, ...emptyP() };
        const pSel = pRoundOf(cp);
        if (pSel) {
            const only = emptyP();
            only[`p${pSel.slice(1)}` as keyof typeof only] = pQty[`p${pSel.slice(1)}` as keyof typeof pQty];
            return { c: 0, frit: 0, bom: 0, c1: 0, customC: 0, ...only };
        }
        return { c, frit, bom, c1: frit + bom, customC, ...pQty };
    };

    const pTotalOf = (s: { p1: number; p2: number; p3: number; p4: number; p5: number }) =>
        s.p1 + s.p2 + s.p3 + s.p4 + s.p5;

    const splitYear = (y: number) => splitAt(y);

    const qtyOf = (y: number) => {
        const s = splitYear(y);
        return (s.c || 0) + (s.frit || 0) + (s.bom || 0) + pTotalOf(s) + (s.customC || 0);
    };

    const total = yearsSel.reduce((s, y) => s + qtyOf(y), 0);
    const totalC = yearsSel.reduce((s, y) => s + splitYear(y).c, 0);
    const totalFrit = yearsSel.reduce((s, y) => s + splitYear(y).frit, 0);
    const totalBom = yearsSel.reduce((s, y) => s + splitYear(y).bom, 0);
    const totalP = yearsSel.reduce((s, y) => s + pTotalOf(splitYear(y)), 0);
    const totalCustomC = yearsSel.reduce((s, y) => s + (splitYear(y).customC || 0), 0);
    const totalByP = (round: typeof QTYPROC_P_ROUNDS[number]) =>
        yearsSel.reduce((s, y) => s + splitYear(y)[`p${round.slice(1)}` as 'p1' | 'p2' | 'p3' | 'p4' | 'p5'], 0);
    const mixToneQty = (tone: 'WHITE' | 'BLACK') => yearsSel.reduce((s, y) => s + (payload?.mix || [])
        .filter((r) => (
            r.y === y
            && String(r.tone || '').toUpperCase() === tone
            && firingRowOk(r)
            && qtyProcRowMatches(cp, r.cp, scope)
        ))
        .reduce((a, r) => a + r.qtyproc, 0), 0);
    const byYearToneQty = (tone: 'WHITE' | 'BLACK') => yearsSel.reduce((s, y) => {
        const block = payload?.byYear?.[String(y)];
        return s + (tone === 'WHITE' ? (block?.white || 0) : (block?.black || 0));
    }, 0);
    const mixWhite = mixToneQty('WHITE');
    const mixBlack = mixToneQty('BLACK');
    const yearWhite = byYearToneQty('WHITE');
    const yearBlack = byYearToneQty('BLACK');
    const canUseYearTone = useYearTotals && cp === 'all' && scope === 'all';
    const totalWhite = mixWhite > 0 ? mixWhite : (canUseYearTone ? yearWhite : 0);
    const totalBlack = mixBlack > 0 ? mixBlack : (canUseYearTone ? yearBlack : 0);

    const pFilter = pRoundOf(cp);
    const combineCustom = scope === 'all';
    const firingMix = firingMixItems({
        standard: totalC,
        frit: totalFrit,
        bom: totalBom,
        customC: totalCustomC,
        byP: totalByP,
        combineCustom,
        combineP: false,
    });
    const firingPie = firingMixItems({
        standard: totalC,
        frit: totalFrit,
        bom: totalBom,
        customC: totalCustomC,
        byP: totalByP,
        combineCustom,
        combineP: true,
    });
    const compareAsBars = cp === 'C' || cp === 'FRIT' || cp === 'BOM' || cp === 'C1' || cp === 'CUSTOM' || !!pFilter;
    const compareSeries = cp === 'C'
        ? [{ key: 'Standard (C)' as const, color: C_COLOR, pctKey: 'standardPct' as const }]
        : cp === 'FRIT'
            ? [{ key: 'FRIT' as const, color: FRIT_COLOR, pctKey: 'fritPct' as const }]
            : cp === 'BOM'
                ? [{ key: 'BOM' as const, color: BOM_COLOR, pctKey: 'bomPct' as const }]
                : cp === 'C1'
                    ? combineCustom
                        ? [{ key: LABEL_CUSTOM_FIRST, color: CUSTOM_COLOR, pctKey: 'customMixPct' as const }]
                        : [
                            { key: 'FRIT' as const, color: FRIT_COLOR, pctKey: 'fritPct' as const },
                            { key: 'BOM' as const, color: BOM_COLOR, pctKey: 'bomPct' as const },
                        ]
                    : cp === 'CUSTOM'
                        ? [{ key: LABEL_CUSTOM_AGAIN, color: CUSTOM_C_COLOR, pctKey: 'customCPct' as const }]
                    : pFilter
                        ? [{ key: pFilter, color: P_ROUND_COLOR[pFilter], pctKey: 'pPct' as const }]
                        : combineCustom
                            ? [
                                { key: 'Standard (C)' as const, color: C_COLOR, pctKey: 'standardPct' as const },
                                { key: LABEL_CUSTOM_FIRST, color: CUSTOM_COLOR, pctKey: 'customMixPct' as const },
                                { key: LABEL_CUSTOM_AGAIN, color: CUSTOM_C_COLOR, pctKey: 'customCPct' as const },
                                ...QTYPROC_P_ROUNDS.filter((round) => totalByP(round) > 0).map((round) => ({
                                    key: round,
                                    color: P_ROUND_COLOR[round],
                                    pctKey: (`p${round.slice(1)}Pct` as 'p1Pct' | 'p2Pct' | 'p3Pct' | 'p4Pct' | 'p5Pct'),
                                })),
                            ]
                            : [
                                { key: 'Standard (C)' as const, color: C_COLOR, pctKey: 'standardPct' as const },
                                { key: 'FRIT' as const, color: FRIT_COLOR, pctKey: 'fritPct' as const },
                                { key: 'BOM' as const, color: BOM_COLOR, pctKey: 'bomPct' as const },
                            ];
    const showComparePct = !compareAsBars || compareSeries.length > 1;

    const shapeKeys = useMemo(() => {
        const keys = new Set<string>();
        (payload?.mix || []).forEach((r) => {
            if (!QTYPROC_HIDDEN_KEYS.has(String(r.shape).toLowerCase())) keys.add(r.shape);
        });
        return [...keys].sort();
    }, [payload]);

    const formingKeys = useMemo(() => {
        const keys = new Set<string>();
        (payload?.mix || []).forEach((r) => {
            if (!QTYPROC_HIDDEN_KEYS.has(String(r.forming).toLowerCase())) keys.add(r.forming);
        });
        return [...keys].sort();
    }, [payload]);

    const toCompareRow = (name: string, s: ReturnType<typeof splitAt>) => {
        const pSum = pTotalOf(s);
        const custom = s.frit + s.bom;
        const tot = s.c + custom + pSum + (s.customC || 0);
        return {
            name,
            'Standard (C)': s.c,
            [LABEL_CUSTOM_FIRST]: custom,
            [LABEL_CUSTOM_AGAIN]: s.customC || 0,
            FRIT: s.frit,
            BOM: s.bom,
            P: pSum,
            P1: s.p1,
            P2: s.p2,
            P3: s.p3,
            P4: s.p4,
            P5: s.p5,
            total: tot,
            standardPct: tot ? (s.c / tot) * 100 : 0,
            customMixPct: tot ? (custom / tot) * 100 : 0,
            customCPct: tot ? ((s.customC || 0) / tot) * 100 : 0,
            fritPct: tot ? (s.frit / tot) * 100 : 0,
            bomPct: tot ? (s.bom / tot) * 100 : 0,
            pPct: tot ? (pSum / tot) * 100 : 0,
            p1Pct: tot ? (s.p1 / tot) * 100 : 0,
            p2Pct: tot ? (s.p2 / tot) * 100 : 0,
            p3Pct: tot ? (s.p3 / tot) * 100 : 0,
            p4Pct: tot ? (s.p4 / tot) * 100 : 0,
            p5Pct: tot ? (s.p5 / tot) * 100 : 0,
        };
    };

    const yearBars = isMonthly
        ? QTYPROC_MONTH_LABELS.map((label, i) => toCompareRow(label, splitAt(selectedYear, i + 1)))
        : QTYPROC_DISPLAY_BE_YEARS.map((y) => toCompareRow(String(y), splitAt(y)));

    const catPeriodRows = (field: 'shape' | 'forming', keys: string[]) => {
        const periods = isMonthly
            ? QTYPROC_MONTH_LABELS.map((label, i) => ({ name: label, y: selectedYear, m: i + 1 as number | null }))
            : QTYPROC_DISPLAY_BE_YEARS.map((y) => ({ name: String(y), y, m: null as number | null }));
        return periods.map((p) => {
            const row: Record<string, string | number> = { name: p.name };
            keys.forEach((k) => {
                const label = field === 'shape' ? (SHAPE_LABEL[k] || k) : k;
                let total = 0;
                let standard = 0;
                let frit = 0;
                let bom = 0;
                (payload?.mix || []).forEach((r) => {
                    if (r.y !== p.y || (p.m != null && Number(r.m) !== p.m) || r[field] !== k || !mixOk(r) || !qtyProcRowMatches(cp, r.cp, scope)) {
                        return;
                    }
                    total += r.qtyproc;
                    const part = firingPart(r.cp);
                    if (part === 'BOM') bom += r.qtyproc;
                    else if (part === 'FRIT') frit += r.qtyproc;
                    else if (part === 'Standard') standard += r.qtyproc;
                });
                row[label] = total;
                row[`${label}__C`] = standard;
                row[`${label}__FRIT`] = frit;
                row[`${label}__BOM`] = bom;
            });
            return row;
        });
    };

    const shapeYearRows = catPeriodRows('shape', shapeKeys);
    const formYearRows = catPeriodRows('forming', formingKeys);

    const mixSplit = (field: 'shape' | 'forming', k: string) => {
        let standard = 0;
        let frit = 0;
        let bom = 0;
        let p = 0;
        yearsSel.forEach((y) => {
            (payload?.mix || []).forEach((r) => {
                if (r.y !== y || r[field] !== k || !mixOk({ ...r, [field]: k }) || !qtyProcRowMatches(cp, r.cp, scope)) return;
                const part = firingPart(r.cp);
                if (part === 'BOM') bom += r.qtyproc;
                else if (part === 'FRIT') frit += r.qtyproc;
                else if (part === 'P') p += r.qtyproc;
                else if (part === 'Standard') standard += r.qtyproc;
            });
        });
        return { Standard: standard, FRIT: frit, BOM: bom, P: p, qty: standard + frit + bom + p };
    };

    const shapePie = donutItems(
        shapeKeys.map((k) => ({
            name: SHAPE_LABEL[k] || k,
            color: SHAPE_COLOR[k] || '#71717a',
            ...mixSplit('shape', k),
        })),
    );

    const formPie = donutItems(
        formingKeys.map((k) => ({
            name: k,
            color: FORM_COLOR[k] || '#71717a',
            ...mixSplit('forming', k),
        })),
    );

    const customerPie = donutItems((() => {
        const byCust = new Map<string, number>();
        yearsSel.forEach((y) => {
            (payload?.mix || []).forEach((r) => {
                if (r.y !== y || !mixOk(r) || !qtyProcRowMatches(cp, r.cp, scope)) return;
                const name = r.customer || '(blank)';
                byCust.set(name, (byCust.get(name) || 0) + r.qtyproc);
            });
        });
        const sorted = [...byCust.entries()].filter(([, qty]) => qty > 0).sort((a, b) => b[1] - a[1]);
        const head = sorted.slice(0, CUSTOMER_PIE_TOP);
        const otherQty = sorted.slice(CUSTOMER_PIE_TOP).reduce((s, [, qty]) => s + qty, 0);
        const items = head.map(([name, qty], i) => ({
            name,
            qty,
            color: CUSTOMER_COLOR[i % CUSTOMER_COLOR.length],
        }));
        if (otherQty > 0) items.push({ name: 'Other', qty: otherQty, color: OTHER_COLOR });
        return items;
    })());

    const qualityRow = (name: string, y: number, month?: number) => {
        let process = 0;
        let complete = 0;
        let scrap = 0;
        let reject = 0;
        (payload?.mix || []).forEach((r) => {
            if (r.y !== y || !firingRowOk(r) || !qtyProcRowMatches(cp, r.cp, scope)) return;
            if (month != null && Number(r.m) !== month) return;
            process += r.qtyproc;
            complete += Number(r.qtycomp) || Number((r as { comp?: number }).comp) || 0;
            scrap += Number(r.qtyscrp) || Number((r as { scrap?: number }).scrap) || 0;
            reject += Number(r.qtyrjct) || Number((r as { reject?: number }).reject) || 0;
        });
        if (useYearTotals && cp === 'all' && scope === 'all') {
            if (month == null) {
                const block = payload?.byYear?.[String(y)];
                if (block && complete === 0 && scrap === 0 && reject === 0) {
                    complete = block.qtycomp || 0;
                    scrap = block.qtyscrp || 0;
                    reject = block.qtyrjct || 0;
                }
            } else {
                const slot = payload?.byYear?.[String(y)]?.months?.[month - 1];
                if (slot) {
                    if (process === 0) process = slot.qtyproc || 0;
                    if (complete === 0 && scrap === 0 && reject === 0) {
                        complete = slot.qtycomp || 0;
                        scrap = slot.qtyscrp || 0;
                        reject = slot.qtyrjct || 0;
                    }
                }
            }
        }
        const other = Math.max(0, process - complete - scrap - reject);
        const completePct = process ? (complete / process) * 100 : 0;
        const scrapPct = process ? (scrap / process) * 100 : 0;
        const rejectPct = process ? (reject / process) * 100 : 0;
        const otherPct = process ? (other / process) * 100 : 0;
        const bars = qualityBarPcts({ complete: completePct, reject: rejectPct, scrap: scrapPct, other: otherPct });
        return {
            name,
            Process: process,
            Complete: complete,
            Scrap: scrap,
            Reject: reject,
            Other: other,
            completePct,
            scrapPct,
            rejectPct,
            otherPct,
            ...bars,
        };
    };

    const qualityYears = isMonthly
        ? QTYPROC_MONTH_LABELS.map((label, i) => qualityRow(label, selectedYear, i + 1))
        : QTYPROC_DISPLAY_BE_YEARS.map((y) => qualityRow(String(y), y));
    const qualityHasOther = qualityYears.some((row) => row.Other > 0);

    const qualityReasonRows = (payload?.reasons || []).filter((r) => (
        yearsSel.includes(r.y)
        && firingRowOk(r)
        && qtyProcRowMatches(cp, r.cp, scope)
    ));
    const topByPeriod = qualityYears.map((row, i) => {
        const y = isMonthly ? selectedYear : QTYPROC_DISPLAY_BE_YEARS[i];
        const m = isMonthly ? i + 1 : null;
        const rows = qualityReasonRows.filter((r) => r.y === y && (m == null || Number(r.m) === m));
        return {
            name: row.name,
            scrap: topQualityReasons(rows.filter((r) => r.kind === 'scrap'), row.Process),
            reject: topQualityReasons(rows.filter((r) => r.kind === 'reject'), row.Process),
        };
    }).filter((period) => period.scrap.length > 0 || period.reject.length > 0);

    const cpPie = firingPie;

    const tonePie = donutItems([
        { name: 'White', qty: totalWhite, color: WHITE_COLOR },
        { name: 'Black', qty: totalBlack, color: isDark ? '#52525b' : BLACK_COLOR },
    ]);

    const trendTitle = trendView === 'shape' ? 'Shape Mix' : 'Forming Mix';
    const rawTrendData = trendView === 'shape' ? shapeYearRows : formYearRows;
    const trendKeysAll =
        trendView === 'shape'
            ? shapeKeys.map((k) => ({ key: SHAPE_LABEL[k] || k, color: SHAPE_COLOR[k] || '#71717a' }))
            : formingKeys.map((k) => ({ key: k, color: FORM_COLOR[k] || '#71717a' }));
    const collapsed = trendView === 'shape'
        ? collapseMixTopN(rawTrendData, trendKeysAll, MIX_BAR_TOP)
        : { rows: rawTrendData, keys: trendKeysAll };
    const trendKeys = collapsed.keys.filter((s) => collapsed.rows.some((row) => (Number(row[s.key]) || 0) > 0));
    const trendData = collapsed.rows.filter((row) => trendKeys.some((s) => (Number(row[s.key]) || 0) > 0));

    if (loading && !payload) {
        return (
            <div className="space-y-4 animate-pulse" aria-busy="true">
                <div className={`h-10 w-64 rounded-xl ${theme.inputBg}`} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className={`h-40 rounded-2xl border ${theme.borderColor} ${theme.inputBg}`} />
                    ))}
                </div>
                <div className={`h-56 rounded-2xl border ${theme.borderColor} ${theme.inputBg}`} />
            </div>
        );
    }

    if (error && !payload) {
        return (
            <div className={`${theme.cardBg} border ${theme.borderColor} rounded-2xl p-6`}>
                <p className="text-sm text-red-400">{error}</p>
            </div>
        );
    }

    const chartMargin = { top: 12, right: 48, left: 8, bottom: 8 };
    const trendCaps: { id: QtyProcTrendView; label: string }[] = [
        { id: 'shape', label: 'Shape' },
        { id: 'forming', label: 'Forming' },
    ];
    const mixTableCols = `3.25rem ${trendKeys.map(() => 'minmax(3.4rem,1fr) 2.15rem').join(' ')}`;
    const pairTick = { fill: tickFill, fontSize: isMonthly ? 10 : 11 };
    const pairBarSize = (seriesCount: number) => (isMonthly ? 14 : seriesCount > 1 ? 22 : 40);

    return (
        <div className="space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                <SectionHeader
                    title={QTYPROC_PAGE_TITLE}
                    subtitle={`${categoryLabel} ${MIDDOT} ${payload?.dateRange.min || ''} ${NDASH} ${payload?.dateRange.max || ''}`}
                    theme={theme}
                />
                {loading && (
                    <span className={`text-[10px] font-bold ${theme.textMuted} animate-pulse shrink-0`}>Updating{ELLIPSIS}</span>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card theme={theme}>
                    <p className={`text-[10px] font-bold uppercase tracking-wider`} style={{ color: PROCESS_COLOR }}>Production Qty</p>
                    <h3 className={`text-sm font-bold ${theme.textWhite} mt-1`}>
                        {year === 'all' ? `All years ${yearRangeLabel}` : `Year ${year}`}
                    </h3>
                    <MixProgress
                        theme={theme}
                        total={total}
                        items={firingMix}
                    />
                </Card>
                <Card theme={theme}>
                    <h3 className={`text-sm font-bold ${theme.textWhite} mb-2`}>
                        {combineCustom
                            ? ['Standard (C)', LABEL_CUSTOM_FIRST, LABEL_CUSTOM_AGAIN, totalP > 0 ? 'P' : null].filter(Boolean).join(' / ')
                            : 'Standard (C) / FRIT / BOM'}
                    </h3>
                    <DonutWithLegend items={cpPie} theme={theme} isDark={isDark} />
                </Card>
                {line === 'all' ? (
                    <Card theme={theme}>
                        <h3 className={`text-sm font-bold ${theme.textWhite} mb-2`}>White / Black</h3>
                        <DonutWithLegend items={tonePie} theme={theme} isDark={isDark} />
                        {customerPie.length > 0 && (
                            <div className={`mt-4 pt-4 border-t ${theme.borderColor}`}>
                                <h3 className={`text-sm font-bold ${theme.textWhite} mb-2`}>Customer · Top 3</h3>
                                <QtyPctLegend items={customerPie} theme={theme} />
                            </div>
                        )}
                    </Card>
                ) : (
                    <Card theme={theme}>
                        <h3 className={`text-sm font-bold ${theme.textWhite} mb-2`}>
                            {customer === 'all'
                                ? `Customer ${MIDDOT} ${line === 'WHITE' ? 'White' : 'Black'}`
                                : `Forming ${MIDDOT} ${line === 'WHITE' ? 'White' : 'Black'}`}
                        </h3>
                        <DonutWithLegend
                            items={customer === 'all' ? customerPie : formPie}
                            theme={theme}
                            isDark={isDark}
                        />
                    </Card>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
            <Card theme={theme} className="min-w-0 h-full flex flex-col">
                    <h3 className={`text-sm font-bold ${theme.textWhite} mb-3`}>
                        {isMonthly ? 'Monthly Comparison' : 'Year Comparison'}
                    </h3>
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            {compareAsBars ? (
                                <BarChart data={yearBars} margin={{ ...chartMargin, right: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                    <XAxis dataKey="name" tick={pairTick} interval={isMonthly ? 0 : undefined} />
                                    <YAxis
                                        tick={pairTick}
                                        tickFormatter={fmtCompact}
                                        width={40}
                                    />
                                    <Tooltip content={<QtyProcTooltip isDark={isDark} kind="share" />} />
                                    <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 11 }} />
                                    {compareSeries.map((series) => (
                                        <Bar
                                            key={series.key}
                                            dataKey={series.key}
                                            fill={series.color}
                                            maxBarSize={pairBarSize(compareSeries.length)}
                                            radius={[4, 4, 0, 0]}
                                        />
                                    ))}
                                </BarChart>
                            ) : (
                                <ComposedChart data={yearBars} margin={{ ...chartMargin, right: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                    <XAxis dataKey="name" tick={pairTick} interval={isMonthly ? 0 : undefined} />
                                    <YAxis
                                        yAxisId="left"
                                        tick={pairTick}
                                        tickFormatter={fmtCompact}
                                        width={40}
                                    />
                                    <YAxis
                                        yAxisId="right"
                                        orientation="right"
                                        tick={pairTick}
                                        tickFormatter={fmtCompact}
                                        width={36}
                                    />
                                    <Tooltip content={<QtyProcTooltip isDark={isDark} kind="share" />} />
                                    <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 11 }} />
                                    <Bar yAxisId="left" dataKey="Standard (C)" fill={C_COLOR} maxBarSize={40} radius={[4, 4, 0, 0]} />
                                    {combineCustom ? (
                                        <>
                                            <Bar yAxisId="left" dataKey={LABEL_CUSTOM_FIRST} fill={CUSTOM_COLOR} maxBarSize={40} radius={[4, 4, 0, 0]} />
                                            <Bar yAxisId="left" dataKey={LABEL_CUSTOM_AGAIN} fill={CUSTOM_C_COLOR} maxBarSize={40} radius={[4, 4, 0, 0]} />
                                            {QTYPROC_P_ROUNDS.filter((round) => totalByP(round) > 0).map((round) => (
                                                <Line
                                                    key={round}
                                                    yAxisId="right"
                                                    type="monotone"
                                                    dataKey={round}
                                                    stroke={P_ROUND_COLOR[round]}
                                                    strokeWidth={2.5}
                                                    dot={{ r: 3, fill: P_ROUND_COLOR[round] }}
                                                />
                                            ))}
                                        </>
                                    ) : (
                                        <>
                                            <Line
                                                yAxisId="right"
                                                type="monotone"
                                                dataKey="FRIT"
                                                stroke={FRIT_COLOR}
                                                strokeWidth={2.5}
                                                dot={{ r: 3, fill: FRIT_COLOR }}
                                            />
                                            <Line
                                                yAxisId="right"
                                                type="monotone"
                                                dataKey="BOM"
                                                stroke={BOM_COLOR}
                                                strokeWidth={2.5}
                                                dot={{ r: 3, fill: BOM_COLOR }}
                                            />
                                        </>
                                    )}
                                </ComposedChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-3 overflow-x-auto">
                        <div
                            className="grid gap-x-2 gap-y-1 text-[10px] min-w-[14rem]"
                            style={{
                                gridTemplateColumns: showComparePct
                                    ? `2.75rem ${compareSeries.map(() => 'minmax(3.2rem,1fr) 2.1rem').join(' ')}`
                                    : `2.75rem ${compareSeries.map(() => 'minmax(3.6rem,1fr)').join(' ')}`,
                            }}
                        >
                            <span className={`font-bold uppercase tracking-wide ${theme.textMuted}`}>
                                {isMonthly ? 'Month' : 'Year'}
                            </span>
                            {compareSeries.map((series) => (
                                <div key={series.key} className="contents">
                                    <span className="font-bold uppercase tracking-wide text-right" style={{ color: series.color }}>
                                        {series.key}
                                    </span>
                                    {showComparePct && (
                                        <span className={`font-bold uppercase tracking-wide text-right ${theme.textMuted}`}>%</span>
                                    )}
                                </div>
                            ))}
                            {yearBars.map((row) => (
                                <div key={row.name} className="contents">
                                    <span className={theme.textSecondary}>{row.name}</span>
                                    {compareSeries.map((series) => (
                                        <div key={`${row.name}-${series.key}`} className="contents">
                                            <span className="tabular-nums text-right font-semibold" style={{ color: series.color }}>
                                                {fmt(Number(row[series.key]) || 0)}
                                            </span>
                                            {showComparePct && (
                                                <span className={`tabular-nums text-right ${theme.textMuted}`}>
                                                    {row[series.pctKey].toFixed(1)}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
                <Card theme={theme} className="min-w-0 h-full flex flex-col">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <h3 className={`text-sm font-bold ${theme.textWhite}`}>{trendTitle}</h3>
                        <div className={`flex items-center ${theme.inputBg} rounded-xl p-1 border ${theme.borderColor}`}>
                            {trendCaps.map((cap) => (
                                <button
                                    key={cap.id}
                                    type="button"
                                    onClick={() => setTrendView(cap.id)}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                        trendView === cap.id
                                            ? `${theme.accentBg} text-white`
                                            : theme.textMuted
                                    }`}
                                >
                                    {cap.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {!trendData.length ? (
                        <p className={`text-xs ${theme.textMuted}`}>No data in this filter.</p>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-x-2 gap-y-2">
                                {trendKeys.map((series) => {
                                    const last = Number(trendData[trendData.length - 1]?.[series.key]) || 0;
                                    return (
                                        <div key={series.key} className="min-w-0">
                                            <div className="flex items-baseline justify-between gap-1 mb-0.5">
                                                <span className="text-[10px] font-bold truncate" style={{ color: series.color }}>
                                                    {series.key}
                                                </span>
                                                <span className="text-[10px] tabular-nums font-semibold shrink-0" style={{ color: series.color }}>
                                                    {fmt(last)}
                                                </span>
                                            </div>
                                            <div className="h-[6.25rem]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={trendData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                                        <XAxis
                                                            dataKey="name"
                                                            tick={{ fill: tickFill, fontSize: 8 }}
                                                            interval={isMonthly ? 1 : 0}
                                                            height={18}
                                                        />
                                                        <YAxis
                                                            tick={{ fill: tickFill, fontSize: 8 }}
                                                            tickFormatter={fmtCompact}
                                                            width={30}
                                                            tickCount={3}
                                                            domain={['auto', 'auto']}
                                                            allowDecimals={false}
                                                        />
                                                        <Tooltip content={<QtyProcTooltip isDark={isDark} kind="plain" />} />
                                                        <Line
                                                            type="linear"
                                                            dataKey={series.key}
                                                            name={series.key}
                                                            stroke={series.color}
                                                            strokeWidth={1.75}
                                                            dot={{
                                                                r: isMonthly ? 2.5 : 3.5,
                                                                fill: series.color,
                                                                strokeWidth: 0,
                                                            }}
                                                            activeDot={{ r: 4, fill: series.color, strokeWidth: 0 }}
                                                            connectNulls
                                                        />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="mt-2 overflow-x-auto max-h-32 overflow-y-auto">
                                <div
                                    className="grid gap-x-2 gap-y-1 text-[10px] min-w-[14rem]"
                                    style={{ gridTemplateColumns: mixTableCols }}
                                >
                                    <span className={`font-bold uppercase tracking-wide ${theme.textMuted}`}>
                                        {isMonthly ? 'Month' : 'Year'}
                                    </span>
                                    {trendKeys.map((series) => (
                                        <div key={series.key} className="contents">
                                            <span className="font-bold uppercase tracking-wide text-right" style={{ color: series.color }}>
                                                {series.key}
                                            </span>
                                            <span className={`font-bold uppercase tracking-wide text-right ${theme.textMuted}`}>%</span>
                                        </div>
                                    ))}
                                    {trendData.map((row) => {
                                        const tot = trendKeys.reduce((s, series) => s + (Number(row[series.key]) || 0), 0);
                                        return (
                                            <div key={String(row.name)} className="contents">
                                                <span className={theme.textSecondary}>{String(row.name)}</span>
                                                {trendKeys.map((series) => {
                                                    const qty = Number(row[series.key]) || 0;
                                                    return (
                                                        <div key={`${row.name}-${series.key}`} className="contents">
                                                            <span className="tabular-nums text-right font-semibold" style={{ color: series.color }}>
                                                                {fmt(qty)}
                                                            </span>
                                                            <span className={`tabular-nums text-right ${theme.textMuted}`}>
                                                                {tot ? ((qty / tot) * 100).toFixed(1) : '0.0'}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}
                </Card>
            </div>

            <Card theme={theme} className="xl:flex xl:flex-col">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <h3 className={`text-sm font-bold ${theme.textWhite}`}>Process vs Complete / Scrap / Reject</h3>
                    <button
                        type="button"
                        aria-pressed={showQualityNumbers}
                        onClick={() => setShowQualityNumbers((v) => !v)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${theme.borderColor} transition-all ${
                            showQualityNumbers ? `${theme.accentBg} text-white` : `${theme.inputBg} ${theme.textMuted}`
                        }`}
                    >
                        {showQualityNumbers ? 'Hide numbers' : 'Show numbers'}
                    </button>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-[3fr_2fr] gap-4 xl:gap-6 items-stretch xl:flex-1">
                    <div className="min-w-0 flex flex-col gap-3">
                        <div className={`min-w-0 ${showQualityNumbers ? 'h-72 sm:h-80' : 'h-72 sm:h-80 xl:h-[26rem]'}`}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={qualityYears} margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                    <XAxis dataKey="name" tick={{ fill: tickFill, fontSize: 11 }} interval={isMonthly ? 0 : undefined} />
                                    <YAxis
                                        tick={{ fill: tickFill, fontSize: 11 }}
                                        tickFormatter={(v) => `${Math.round(Number(v))}%`}
                                        domain={[0, 100]}
                                        width={40}
                                    />
                                    <Tooltip content={<QtyProcTooltip isDark={isDark} kind="quality" />} />
                                    <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 12 }} />
                                    <Bar dataKey="CompleteBar" name="Complete" stackId="process" fill={completeColor} maxBarSize={48}>
                                        <LabelList dataKey="completePct" content={QualityPctLabel} />
                                    </Bar>
                                    <Bar dataKey="RejectBar" name="Reject" stackId="process" fill={rejectColor} maxBarSize={48}>
                                        <LabelList dataKey="rejectPct" content={QualityPctLabel} />
                                    </Bar>
                                    <Bar
                                        dataKey="ScrapBar"
                                        name="Scrap"
                                        stackId="process"
                                        fill={scrapColor}
                                        maxBarSize={48}
                                        radius={qualityHasOther ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                                    >
                                        <LabelList dataKey="scrapPct" content={QualityPctLabel} />
                                    </Bar>
                                    {qualityHasOther && (
                                        <Bar dataKey="OtherBar" name="Other" stackId="process" fill={otherColor} maxBarSize={48} radius={[4, 4, 0, 0]}>
                                            <LabelList dataKey="otherPct" content={QualityPctLabel} />
                                        </Bar>
                                    )}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        {showQualityNumbers && (
                            <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1.15fr)_minmax(0,1.15fr)] gap-x-2 gap-y-1 text-[11px]">
                                <span className={`font-bold uppercase tracking-wide ${theme.textMuted}`}>
                                    {isMonthly ? 'Mo' : 'Year'}
                                </span>
                                <span className="font-bold uppercase tracking-wide text-right" style={{ color: PROCESS_COLOR }}>Process</span>
                                <span className="font-bold uppercase tracking-wide text-right" style={{ color: completeColor }}>Complete</span>
                                <span className="font-bold uppercase tracking-wide text-right" style={{ color: rejectColor }}>Reject</span>
                                <span className="font-bold uppercase tracking-wide text-right" style={{ color: scrapColor }}>Scrap</span>
                                {qualityYears.map((row) => (
                                    <div key={row.name} className="contents">
                                        <span className={theme.textSecondary}>{row.name}</span>
                                        <span className="tabular-nums text-right font-semibold" style={{ color: PROCESS_COLOR }}>{fmt(row.Process)}</span>
                                        <span className="tabular-nums text-right font-semibold" style={{ color: completeColor }}>
                                            {fmt(row.Complete)}
                                            <span className={`ml-1 font-medium ${theme.textMuted}`}>{row.completePct.toFixed(1)}</span>
                                        </span>
                                        <span className="tabular-nums text-right font-semibold" style={{ color: rejectColor }}>
                                            {fmt(row.Reject)}
                                            <span className={`ml-1 font-medium ${theme.textMuted}`}>{row.rejectPct.toFixed(1)}</span>
                                        </span>
                                        <span className="tabular-nums text-right font-semibold" style={{ color: scrapColor }}>
                                            {fmt(row.Scrap)}
                                            <span className={`ml-1 font-medium ${theme.textMuted}`}>{row.scrapPct.toFixed(1)}</span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="relative min-w-0 h-[28rem] xl:h-auto xl:min-h-0">
                        <div className="h-full xl:absolute xl:inset-0 overflow-hidden">
                            <QualityTopByPeriod
                                periods={topByPeriod}
                                scrapColor={scrapColor}
                                rejectColor={rejectColor}
                                theme={theme}
                            />
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
