"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MixHeader } from '@/components/dashboard/Header';
import { QtyProcessView } from '@/components/dashboard/views/QtyProcessView';
import { themes, type ThemeName } from '@/lib/themes';
import {
    qtyProcLineMatches,
    qtyProcMixKeys,
    qtyProcRowMatches,
    pRoundOf,
    type QtyProcCpFilter,
    type QtyProcLineFilter,
    type QtyProcPayload,
    type QtyProcScope,
    type QtyProcYearFilter,
} from '@/lib/qtyproc';
import { getDashboardSkin, type WwTone } from '@/lib/sort-source';

const QTYPROC_TIMEOUT_MS = 120000;

function toneFromLine(line: QtyProcLineFilter): WwTone {
    if (line === 'WHITE') return 'WW_WHITE';
    if (line === 'BLACK') return 'WW_BLACK';
    return 'ALL';
}

export function MixPage() {
    const [currentTheme, setCurrentTheme] = useState<ThemeName>('dark');
    const theme = themes[currentTheme];
    const [payload, setPayload] = useState<QtyProcPayload | null>(null);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [year, setYear] = useState<QtyProcYearFilter>('all');
    const [line, setLine] = useState<QtyProcLineFilter>('all');
    const [cp, setCp] = useState<QtyProcCpFilter>('all');
    const [scope, setScope] = useState<QtyProcScope>('ff');
    const [shape, setShape] = useState('all');
    const [forming, setForming] = useState('all');
    const [customer, setCustomer] = useState('all');
    const [glaze, setGlaze] = useState('all');

    const lineMix = useMemo(
        () => (payload?.mix || []).filter((row) => (
            qtyProcLineMatches(line, row.tone)
            && qtyProcRowMatches('all', row.cp, scope)
        )),
        [payload, line, scope],
    );
    const customerKeys = useMemo(() => qtyProcMixKeys(lineMix, 'customer'), [lineMix]);
    const scopedMix = useMemo(
        () => customer === 'all'
            ? lineMix
            : lineMix.filter((row) => (row.customer || '(blank)') === customer),
        [lineMix, customer],
    );
    const shapeKeys = useMemo(() => qtyProcMixKeys(scopedMix, 'shape'), [scopedMix]);
    const formingKeys = useMemo(() => qtyProcMixKeys(scopedMix, 'forming'), [scopedMix]);

    useEffect(() => {
        if (customer !== 'all' && !customerKeys.includes(customer)) setCustomer('all');
    }, [customer, customerKeys]);
    useEffect(() => {
        if (shape !== 'all' && !shapeKeys.includes(shape)) setShape('all');
    }, [shape, shapeKeys]);
    useEffect(() => {
        if (forming !== 'all' && !formingKeys.includes(forming)) setForming('all');
    }, [forming, formingKeys]);

    const fetchQtyProc = useCallback(async (forceRefresh = false, silent = false) => {
        if (!silent) setLoading(true);
        setError(null);
        const timeout = new AbortController();
        const timer = setTimeout(() => timeout.abort(), QTYPROC_TIMEOUT_MS);
        try {
            const qs = new URLSearchParams({ category: 'WW', unit: 'ALL' });
            if (forceRefresh) qs.set('refresh', '1');
            const res = await fetch(`/api/qtyproc?${qs}`, { signal: timeout.signal });
            const result = await res.json();
            if (result?.error) {
                setError(String(result.error));
                return;
            }
            setPayload(result as QtyProcPayload);
            if (!forceRefresh && result?.stale) {
                void fetchQtyProc(true, true);
            }
        } catch (err) {
            if (!silent) {
                setError(err instanceof Error ? err.message : 'Production Mix failed');
            }
        } finally {
            clearTimeout(timer);
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchQtyProc(false);
    }, [fetchQtyProc]);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await fetchQtyProc(true);
        } finally {
            setRefreshing(false);
        }
    }, [fetchQtyProc]);

    const handleScope = useCallback((next: QtyProcScope) => {
        setScope(next);
        if (next === 'ff' && (pRoundOf(cp) || cp === 'CUSTOM')) setCp('all');
        if (next === 'all' && (cp === 'FRIT' || cp === 'BOM')) setCp('C1');
    }, [cp]);

    const skinId = getDashboardSkin('WW', toneFromLine(line), 'INGLAZE');
    const categoryLabel = line === 'all' ? 'WW' : line === 'WHITE' ? 'WW · White' : 'WW · Black';

    return (
        <div
            className={`dash-skin flex h-screen ${theme.pageBg} ${theme.textPrimary} font-sans overflow-hidden transition-colors duration-300`}
            data-skin={skinId}
            data-ui-theme={currentTheme}
        >
            <main className="flex-1 flex flex-col overflow-hidden">
                <MixHeader
                    theme={theme}
                    currentTheme={currentTheme}
                    setCurrentTheme={setCurrentTheme}
                    refreshing={refreshing}
                    onRefresh={() => void handleRefresh()}
                    year={year}
                    setYear={setYear}
                    line={line}
                    setLine={setLine}
                    cp={cp}
                    setCp={setCp}
                    scope={scope}
                    setScope={handleScope}
                    shape={shape}
                    setShape={setShape}
                    forming={forming}
                    setForming={setForming}
                    customer={customer}
                    setCustomer={setCustomer}
                    glaze={glaze}
                    setGlaze={setGlaze}
                    shapeKeys={shapeKeys}
                    formingKeys={formingKeys}
                    customerKeys={customerKeys}
                />
                <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 p-3 sm:p-4 md:p-8 space-y-6 sm:space-y-8 md:space-y-10">
                    <QtyProcessView
                        theme={theme}
                        currentTheme={currentTheme}
                        payload={payload}
                        loading={loading}
                        error={error}
                        categoryLabel={categoryLabel}
                        year={year}
                        line={line}
                        cp={cp}
                        scope={scope}
                        shape={shape}
                        forming={forming}
                        customer={customer}
                        glaze={glaze}
                    />
                </div>
            </main>
        </div>
    );
}
