'use client';

import { useCallback, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Theme, ThemeName } from '@/lib/themes';
import { formatDateDisplay } from '@/lib/utils';

export type TimelineScale = 'month' | 'year';

function toIso(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function firstDayOfMonth(ym: string): string {
    return `${ym}-01`;
}

function lastDayOfMonth(ym: string): string {
    const [y, m] = ym.split('-').map(Number);
    return toIso(new Date(y, m, 0));
}

function firstDayOfYear(y: number): string {
    return `${y}-01-01`;
}

function lastDayOfYear(y: number): string {
    return `${y}-12-31`;
}

function toYearMonth(iso: string): string {
    return iso.slice(0, 7);
}

function clampIso(d: string, min: string, max: string): string {
    if (d < min) return min;
    if (d > max) return max;
    return d;
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type Period = {
    key: string;
    label: string;
    subLabel?: string;
    start: string;
    end: string;
};

function buildMonthPeriods(boundStart: string, boundEnd: string): Period[] {
    const startYm = toYearMonth(boundStart);
    const endYm = toYearMonth(boundEnd);
    const [sy, sm] = startYm.split('-').map(Number);
    const [ey, em] = endYm.split('-').map(Number);
    const out: Period[] = [];
    let y = sy;
    let m = sm;
    while (y < ey || (y === ey && m <= em)) {
        const key = `${y}-${String(m).padStart(2, '0')}`;
        out.push({
            key,
            label: MONTH_SHORT[m - 1],
            subLabel: String(y).slice(2),
            start: firstDayOfMonth(key),
            end: lastDayOfMonth(key),
        });
        m += 1;
        if (m > 12) {
            m = 1;
            y += 1;
        }
    }
    return out;
}

function buildYearPeriods(boundStart: string, boundEnd: string): Period[] {
    const sy = Number(boundStart.slice(0, 4));
    const ey = Number(boundEnd.slice(0, 4));
    const out: Period[] = [];
    for (let y = sy; y <= ey; y += 1) {
        out.push({
            key: String(y),
            label: String(y),
            start: firstDayOfYear(y),
            end: lastDayOfYear(y),
        });
    }
    return out;
}

function indexForDate(periods: Period[], iso: string, edge: 'start' | 'end'): number {
    if (!periods.length) return 0;
    if (edge === 'start') {
        for (let i = periods.length - 1; i >= 0; i -= 1) {
            if (periods[i].start <= iso) return i;
        }
        return 0;
    }
    for (let i = 0; i < periods.length; i += 1) {
        if (periods[i].end >= iso) return i;
    }
    return periods.length - 1;
}

interface TimelineDateFilterProps {
    theme: Theme;
    currentTheme: ThemeName;
    boundStart: string;
    boundEnd: string;
    onChangeBounds?: (start: string, end: string) => void;
    startDate: string;
    endDate: string;
    onChangeRange: (start: string, end: string) => void;
    availableDates: string[];
    selectedDates: string[];
    onSelectedDatesChange: (dates: string[]) => void;
}

export function TimelineDateFilter({
    theme,
    currentTheme,
    boundStart,
    boundEnd,
    startDate,
    endDate,
    onChangeRange,
    availableDates,
    selectedDates,
    onSelectedDatesChange,
}: TimelineDateFilterProps) {
    const [scale, setScale] = useState<TimelineScale>('month');
    const dragModeRef = useRef<'range' | null>(null);
    const rangeAnchorRef = useRef(0);
    const trackRef = useRef<HTMLDivElement>(null);

    const periods = useMemo(
        () => (scale === 'month' ? buildMonthPeriods(boundStart, boundEnd) : buildYearPeriods(boundStart, boundEnd)),
        [scale, boundStart, boundEnd],
    );

    const startIdx = useMemo(
        () => Math.min(indexForDate(periods, startDate, 'start'), Math.max(0, periods.length - 1)),
        [periods, startDate],
    );
    const endIdx = useMemo(
        () => Math.max(indexForDate(periods, endDate, 'end'), startIdx),
        [periods, endDate, startIdx],
    );

    const applyPeriodRange = useCallback(
        (from: number, to: number) => {
            if (!periods.length) return;
            const a = Math.max(0, Math.min(from, to));
            const b = Math.min(periods.length - 1, Math.max(from, to));
            const nextStart = clampIso(periods[a].start, boundStart, boundEnd);
            const nextEnd = clampIso(periods[b].end, boundStart, boundEnd);
            onChangeRange(nextStart, nextEnd);
        },
        [periods, boundStart, boundEnd, onChangeRange],
    );

    /** Resolve month/year cell under cursor — avoids ratio math drift with scroll/flex. */
    const idxFromPoint = useCallback((clientX: number, clientY: number) => {
        const track = trackRef.current;
        if (!track || !periods.length) return 0;

        const direct = document.elementFromPoint(clientX, clientY);
        const hit = direct?.closest?.('[data-timeline-idx]') as HTMLElement | null;
        if (hit) {
            const n = Number(hit.dataset.timelineIdx);
            if (Number.isFinite(n)) return Math.min(periods.length - 1, Math.max(0, n));
        }

        // Fallback: nearest cell by X within the track (works while dragging off-cell)
        const cells = track.querySelectorAll<HTMLElement>('[data-timeline-idx]');
        let best = 0;
        let bestDist = Infinity;
        cells.forEach((cell) => {
            const r = cell.getBoundingClientRect();
            const mid = (r.left + r.right) / 2;
            const dist = Math.abs(clientX - mid);
            if (dist < bestDist) {
                bestDist = dist;
                best = Number(cell.dataset.timelineIdx) || 0;
            }
        });
        return Math.min(periods.length - 1, Math.max(0, best));
    }, [periods.length]);

    const onCellPointerDown = (e: ReactPointerEvent<HTMLButtonElement>, idx: number) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        dragModeRef.current = 'range';
        rangeAnchorRef.current = idx;
        applyPeriodRange(idx, idx);
    };

    const onCellPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
        if (!dragModeRef.current) return;
        const i = idxFromPoint(e.clientX, e.clientY);
        applyPeriodRange(rangeAnchorRef.current, i);
    };

    const onCellPointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
        dragModeRef.current = null;
    };

    const setScaleAndSnap = (next: TimelineScale) => {
        setScale(next);
        const nextPeriods =
            next === 'month' ? buildMonthPeriods(boundStart, boundEnd) : buildYearPeriods(boundStart, boundEnd);
        if (!nextPeriods.length) return;
        const s = indexForDate(nextPeriods, startDate, 'start');
        const eIdx = Math.max(indexForDate(nextPeriods, endDate, 'end'), s);
        onChangeRange(
            clampIso(nextPeriods[s].start, boundStart, boundEnd),
            clampIso(nextPeriods[eIdx].end, boundStart, boundEnd),
        );
    };

    const toggleDate = (d: string) => {
        if (selectedDates.includes(d)) {
            onSelectedDatesChange(selectedDates.filter((x) => x !== d));
        } else {
            onSelectedDatesChange([...selectedDates, d].sort());
        }
    };

    const clearCapsules = () => onSelectedDatesChange([]);

    const isDark = currentTheme === 'dark';

    return (
        <div className="w-full space-y-3">
            <div className={`rounded-xl border ${theme.borderColor} ${theme.inputBg} px-3 py-3 space-y-3`}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${theme.textMuted}`}>
                            Timeline
                        </p>
                        <div className={`flex rounded-lg border ${theme.borderColor} overflow-hidden`}>
                            {(['month', 'year'] as TimelineScale[]).map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setScaleAndSnap(s)}
                                    className={`text-[10px] px-2.5 py-1 font-bold uppercase transition-all ${
                                        scale === s
                                            ? `${theme.accentBg} text-white`
                                            : `${theme.textMuted} hover:${theme.textWhite}`
                                    }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                    <p className={`text-xs font-bold tabular-nums ${theme.textWhite}`}>
                        {formatDateDisplay(startDate)}
                        <span className={`mx-1.5 ${theme.textMuted}`}>→</span>
                        {formatDateDisplay(endDate)}
                    </p>
                </div>

                <div
                    className={`overflow-x-auto rounded-lg border ${theme.borderColor} ${isDark ? 'bg-black/25' : 'bg-white/60'}`}
                >
                    <div
                        ref={trackRef}
                        className="flex w-full min-w-max select-none touch-none"
                        role="listbox"
                        aria-label="Timeline period range"
                    >
                        {periods.map((p, i) => {
                            const inRange = i >= startIdx && i <= endIdx;
                            return (
                                <button
                                    key={p.key}
                                    type="button"
                                    data-timeline-idx={i}
                                    role="option"
                                    aria-selected={inRange}
                                    title={`${p.label}${p.subLabel ? ` '${p.subLabel}` : ''} · ${p.start} → ${p.end}`}
                                    onPointerDown={(e) => onCellPointerDown(e, i)}
                                    onPointerMove={onCellPointerMove}
                                    onPointerUp={onCellPointerUp}
                                    onPointerCancel={onCellPointerUp}
                                    className={`flex flex-col items-center justify-center shrink-0 min-w-[3.25rem] flex-1 basis-0 px-1.5 py-2.5 border-r last:border-r-0 ${theme.borderColor} cursor-pointer transition-colors ${
                                        inRange
                                            ? `${theme.accentBg} text-white`
                                            : `${theme.textSecondary} hover:opacity-80`
                                    }`}
                                >
                                    <span className="block text-[11px] font-bold leading-tight pointer-events-none">
                                        {p.label}
                                    </span>
                                    {p.subLabel && (
                                        <span
                                            className={`block text-[9px] font-semibold leading-tight pointer-events-none ${
                                                inRange ? 'text-white/80' : theme.textMuted
                                            }`}
                                        >
                                            '{p.subLabel}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${theme.textMuted}`}>
                        Dates in range
                        {selectedDates.length > 0 ? ` · ${selectedDates.length} selected` : ' · all'}
                    </p>
                    {selectedDates.length > 0 && (
                        <button
                            type="button"
                            onClick={clearCapsules}
                            className={`text-[10px] font-bold underline ${theme.textMuted} hover:opacity-80`}
                        >
                            Clear
                        </button>
                    )}
                </div>
                {availableDates.length === 0 ? (
                    <p className={`text-xs ${theme.textMuted}`}>No sorting dates in this range</p>
                ) : (
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                        {availableDates.map((d) => {
                            const active = selectedDates.includes(d);
                            return (
                                <button
                                    key={d}
                                    type="button"
                                    onClick={() => toggleDate(d)}
                                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold tabular-nums border transition-all ${
                                        active
                                            ? `${theme.accentBg} text-white border-transparent shadow`
                                            : `${theme.inputBg} ${theme.textSecondary} ${theme.borderColor} hover:${theme.textWhite}`
                                    }`}
                                    title={d}
                                >
                                    {formatDateDisplay(d)}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
