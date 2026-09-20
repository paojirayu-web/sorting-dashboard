"use client";

import { Suspense, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { themes, type ThemeName } from "@/lib/themes";
import { formatDateShort, formatProductDescription, normalizeDataRows } from "@/lib/utils";
import type { DataItem, ProductStats, MonthlyStats, SelectedReason, ViewType, GroupedRow, ReasonLogEntry, ReasonMonthlyEntry, ProductItem, DefectReasonItem, DefectListMode } from "@/types/dashboard";
import type { DefectTrendPayload, DefectJobMetricRow } from "@/lib/defect-reason-query";
import {
    Sidebar,
    Header,
    DailyDetailModal,
    OverviewView,
    ProductAnalysisView,
    MonthlyAnalysisView,
    QtyProcessView,
    SettingsView,
} from "@/components/dashboard";
import { buildDailyActivityTable } from "@/lib/daily-defects";
import { isC1SpecialReasonForRecord, isSomboonCpC } from "@/lib/c1-special-reason";
import { isRejectSubTyp, isScrapSubTyp } from "@/lib/sub-typ";
import type { UnitFilter } from "@/lib/unit-filter";
import { filterByCategory, getEffectiveUnitFilter } from "@/lib/unit-filter";
import {
    deriveCategory,
    deriveUnitFilter,
    getDashboardSkin,
    getHierarchyLabel,
    isGlazeDwCategory,
    productListHasWwUnitFlags,
    productMatchesSearch,
    ONGLAZE_PRODUCT_PREFIX,
    type DwKind,
    type LineFamily,
    type WwTone,
} from "@/lib/sort-source";
import {
    qtyProcLineMatches,
    qtyProcMixKeys,
    qtyProcGroupLabels,
    qtyProcPruneGroups,
    qtyProcRowMatches,
    pRoundOf,
    type QtyProcCpFilter,
    type QtyProcLineFilter,
    type QtyProcPayload,
    type QtyProcScope,
    type QtyProcYearFilter,
} from "@/lib/qtyproc";
import { dashboardViewHref, parseDashboardView } from "@/lib/dashboard-view";

type DefectTrendCacheEntry = {
    trend?: DefectTrendPayload["trend"];
};

type DefectChartReady = {
    trend: DefectTrendPayload["trend"];
    jobMetrics: DefectTrendPayload["jobMetrics"];
};

/** AbortSignal.any is Chromium 116+ / Safari 17.4+ — polyfill for older clients. */
function mergeAbortSignals(signals: AbortSignal[]): AbortSignal {
    if (typeof AbortSignal.any === "function") {
        return AbortSignal.any(signals);
    }
    const controller = new AbortController();
    const onAbort = () => {
        controller.abort();
        for (const signal of signals) {
            signal.removeEventListener("abort", onAbort);
        }
    };
    for (const signal of signals) {
        if (signal.aborted) {
            controller.abort();
            return controller.signal;
        }
        signal.addEventListener("abort", onAbort);
    }
    return controller.signal;
}

function isAbortError(error: unknown): boolean {
    return (
        (error instanceof DOMException && error.name === "AbortError") ||
        (error instanceof Error && error.name === "AbortError")
    );
}

function Dashboard() {
    const PRODUCT_STATS_TIMEOUT_MS = 120000;
    const REASON_LOG_TIMEOUT_MS = 120000;
    const MONTHLY_STATS_TIMEOUT_MS = 120000;
    const MONTHLY_RAW_TIMEOUT_MS = 120000;
    const DEFECT_CHART_TIMEOUT_MS = 120000;
    const QTYPROC_TIMEOUT_MS = 120000;
    // ─── UI State ────────────────────────────────────────────
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [currentTheme, setCurrentTheme] = useState<ThemeName>("dark");
    const theme = themes[currentTheme];
    const searchParams = useSearchParams();
    const router = useRouter();
    const view = parseDashboardView(searchParams.get("view"));
    const setView = useCallback((next: ViewType) => {
        const href = dashboardViewHref(next === "defect-analysis" ? "qty-process" : next);
        router.push(href, { scroll: false });
    }, [router]);

    // ─── Overview State ──────────────────────────────────────
    const [data, setData] = useState<DataItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [lineFamily, setLineFamily] = useState<LineFamily>("ALL");
    const [wwTone, setWwTone] = useState<WwTone>("ALL");
    const [dwKind, setDwKind] = useState<DwKind>("ALL");
    const category = deriveCategory(lineFamily, dwKind);
    const unitFilter = deriveUnitFilter(lineFamily, wwTone);
    const overallUnitFilter = unitFilter;
    const defectUnitFilter = unitFilter;
    const [selectedDate, setSelectedDate] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");
    const [cpFilter, setCpFilter] = useState("ALL");
    const [overallCpFilter, setOverallCpFilter] = useState("ALL");
    const [refreshing, setRefreshing] = useState(false);
    const [isDailyMonitorFullscreen, setIsDailyMonitorFullscreen] = useState(false);
    const [selectedDailyRow, setSelectedDailyRow] = useState<GroupedRow | null>(null);

    // ─── Product Analysis State ──────────────────────────────
    const [productList, setProductList] = useState<ProductItem[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<string>("");
    const [productSearch, setProductSearch] = useState("");
    const [isProductListOpen, setIsProductListOpen] = useState(false);
    const [productStats, setProductStats] = useState<ProductStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(false);
    const [showReject, setShowReject] = useState(false);
    const [selectedReason, setSelectedReason] = useState<SelectedReason | null>(null);
    const [reasonLogData, setReasonLogData] = useState<ReasonLogEntry[]>([]);
    const [reasonLogLoading, setReasonLogLoading] = useState(false);
    const [reasonLogError, setReasonLogError] = useState<string | null>(null);
    const [reasonMonthly, setReasonMonthly] = useState<ReasonMonthlyEntry[]>([]);
    const [reasonChartMonth, setReasonChartMonth] = useState<string | null>(null);
    // Shared date range for Product Analysis + Monthly Analysis
    const [analysisStartDate, setAnalysisStartDate] = useState(() => {
        const now = new Date();
        const year = now.getFullYear() - 1;
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}-01`;
    });
    const [analysisEndDate, setAnalysisEndDate] = useState(() => {
        const now = new Date();
        return now.toISOString().split('T')[0];
    });

    // ─── Monthly Analysis State ──────────────────────────────
    const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);
    const [monthlyLoading, setMonthlyLoading] = useState(false);
    const [monthlyCpFilter, setMonthlyCpFilter] = useState("ALL");
    const [showMonthlyReject, setShowMonthlyReject] = useState(false);
    const [monthlyRawData, setMonthlyRawData] = useState<DataItem[]>([]);
    const [paRawData, setPaRawData] = useState<DataItem[]>([]);
    const [paRawLoading, setPaRawLoading] = useState(false);

    const [qtyProcPayload, setQtyProcPayload] = useState<QtyProcPayload | null>(null);
    const [qtyProcLoading, setQtyProcLoading] = useState(false);
    const [qtyProcError, setQtyProcError] = useState<string | null>(null);
    const [qtyProcYear, setQtyProcYear] = useState<QtyProcYearFilter>('all');
    const [qtyProcLine, setQtyProcLine] = useState<QtyProcLineFilter>('all');
    const [qtyProcCp, setQtyProcCp] = useState<QtyProcCpFilter>('all');
    const [qtyProcScope, setQtyProcScope] = useState<QtyProcScope>('ff');
    const [qtyProcGroup, setQtyProcGroup] = useState<string[]>([]);
    const [qtyProcForming, setQtyProcForming] = useState('all');
    const [qtyProcCustomer, setQtyProcCustomer] = useState('all');
    const [qtyProcGlaze, setQtyProcGlaze] = useState('all');

    // ─── Defect Analysis State ───────────────────────────────
    const [defectReasonList, setDefectReasonList] = useState<DefectReasonItem[]>([]);
    const [selectedDefect, setSelectedDefect] = useState("");
    const [defectSearch, setDefectSearch] = useState("");
    const [isDefectListOpen, setIsDefectListOpen] = useState(false);
    const [defectTrendPayload, setDefectTrendPayload] = useState<DefectTrendPayload>({
        trend: [],
        jobMetrics: [],
        products: [],
        wareKilns: [],
    });
    const [defectListMode, setDefectListMode] = useState<DefectListMode>("scrap");
    const [defectListLoading, setDefectListLoading] = useState(false);
    const [defectTrendLoading, setDefectTrendLoading] = useState(false);
    const defectListAbortRef = useRef<AbortController | null>(null);
    const defectChartAbortRef = useRef<AbortController | null>(null);
    const defectListCacheRef = useRef<Map<string, DefectReasonItem[]>>(new Map());
    const defectTrendCacheRef = useRef<Map<string, DefectTrendCacheEntry>>(new Map());
    const defectJobMetricsCacheRef = useRef<Map<string, DefectJobMetricRow[]>>(new Map());
    const defectDisplayedTrendKeyRef = useRef<string>("");

    const productStatsAbortRef = useRef<AbortController | null>(null);
    const paRawAbortRef = useRef<AbortController | null>(null);
    const reasonLogAbortRef = useRef<AbortController | null>(null);
    const monthlyStatsAbortRef = useRef<AbortController | null>(null);
    const dataAbortRef = useRef<AbortController | null>(null);
    const productListAbortRef = useRef<AbortController | null>(null);
    /** Product whose auto date range was last applied (skip repeat API on PA↔MA switch). */
    const appliedAutoDateRangeProductRef = useRef<string | null>(null);
    /** When set to selectedProduct, PA/MA data fetches may run with current analysis dates. */
    const [analysisDateRangeReadyFor, setAnalysisDateRangeReadyFor] = useState<string | null>(null);
    const skinId = getDashboardSkin(lineFamily, wwTone, dwKind);
    const hierarchyLabel = getHierarchyLabel(lineFamily, wwTone, dwKind);
    const qtyProcLineMix = useMemo(
        () => (qtyProcPayload?.mix || []).filter((r) => (
            qtyProcLineMatches(qtyProcLine, r.tone)
            && qtyProcRowMatches('all', r.cp, qtyProcScope)
        )),
        [qtyProcPayload, qtyProcLine, qtyProcScope],
    );
    const qtyProcCustomerKeys = useMemo(() => qtyProcMixKeys(qtyProcLineMix, 'customer'), [qtyProcLineMix]);
    const qtyProcScopedMix = useMemo(
        () => qtyProcCustomer === 'all'
            ? qtyProcLineMix
            : qtyProcLineMix.filter((r) => (r.customer || '(blank)') === qtyProcCustomer),
        [qtyProcLineMix, qtyProcCustomer],
    );
    const qtyProcGroupKeys = useMemo(() => qtyProcMixKeys(qtyProcScopedMix, 'group'), [qtyProcScopedMix]);
    const qtyProcGroupLabelMap = useMemo(() => qtyProcGroupLabels(qtyProcScopedMix), [qtyProcScopedMix]);
    const qtyProcFormingKeys = useMemo(() => qtyProcMixKeys(qtyProcScopedMix, 'forming'), [qtyProcScopedMix]);
    const [skinFadeOn, setSkinFadeOn] = useState(false);

    useEffect(() => {
        if (qtyProcCustomer !== 'all' && !qtyProcCustomerKeys.includes(qtyProcCustomer)) {
            setQtyProcCustomer('all');
        }
    }, [qtyProcCustomer, qtyProcCustomerKeys]);

    useEffect(() => {
        const next = qtyProcPruneGroups(qtyProcGroup, qtyProcGroupKeys);
        if (next !== qtyProcGroup) setQtyProcGroup(next);
    }, [qtyProcGroup, qtyProcGroupKeys]);

    useEffect(() => {
        if (qtyProcForming !== 'all' && !qtyProcFormingKeys.includes(qtyProcForming)) {
            setQtyProcForming('all');
        }
    }, [qtyProcForming, qtyProcFormingKeys]);

    useEffect(() => {
        if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setSkinFadeOn(false);
            return;
        }
        setSkinFadeOn(false);
        const id = requestAnimationFrame(() => {
            requestAnimationFrame(() => setSkinFadeOn(true));
        });
        return () => cancelAnimationFrame(id);
    }, [skinId]);

    const isValidDateRange = useCallback((startDate: string, endDate: string) => {
        return Boolean(startDate && endDate && startDate <= endDate);
    }, []);

    const fetchJsonWithTimeout = useCallback(async (url: string, timeoutMs: number, externalSignal?: AbortSignal) => {
        const timeoutController = new AbortController();
        let timedOut = false;
        const timeoutId = setTimeout(() => {
            timedOut = true;
            timeoutController.abort();
        }, timeoutMs);
        const mergedSignal = externalSignal
            ? mergeAbortSignals([externalSignal, timeoutController.signal])
            : timeoutController.signal;

        try {
            const res = await fetch(url, { signal: mergedSignal });
            return await res.json();
        } catch (error) {
            if (timedOut) {
                const timeoutError = new Error(`Request timed out after ${timeoutMs}ms`);
                timeoutError.name = "TimeoutError";
                throw timeoutError;
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    }, []);

    // ─── Data Fetching ───────────────────────────────────────
    const fetchProductAutoDateRange = useCallback(async (product: string) => {
        const unitQs = unitFilter !== 'ALL' ? `&unit=${unitFilter}` : '';
        const res = await fetch(
            `/api/product-date-range?product=${encodeURIComponent(product)}${unitQs}`,
        );
        const range = await res.json();
        if (range?.error) return null;
        if (range?.minDate && range?.maxDate) {
            return { minDate: range.minDate as string, maxDate: range.maxDate as string };
        }
        return null;
    }, [unitFilter]);

    const fetchProductList = useCallback(async (forceRefresh = false) => {
        productListAbortRef.current?.abort();
        const controller = new AbortController();
        productListAbortRef.current = controller;
        try {
            const url = forceRefresh ? "/api/products?refresh=1" : "/api/products";
            const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
            const data = await res.json();
            if (productListAbortRef.current !== controller) return;
            if (data?.error) return;
            const products: ProductItem[] = Array.isArray(data)
                ? data
                : Array.isArray(data?.items) ? data.items : [];
            if (!products.length) return;
            const hasOnglaze = products.some((item: ProductItem) =>
                String(item.value || '').startsWith(ONGLAZE_PRODUCT_PREFIX),
            );
            const hasUnitFlags = productListHasWwUnitFlags(products);
            if (!forceRefresh && (!hasOnglaze || !hasUnitFlags)) {
                await fetchProductList(true);
                return;
            }
            setProductList(products);
            if (!forceRefresh && data?.stale) {
                void fetchProductList(true);
            }
        } catch (e) {
            if (!isAbortError(e)) console.error(e);
        }
    }, []);

    const lastProductStatsKeyRef = useRef<string | null>(null);
    const autoAppliedStatsRangeRef = useRef<string | null>(null);
    const [paRawNeeded, setPaRawNeeded] = useState(false);
    const unitFilterRef = useRef(unitFilter);
    const analysisDatesRef = useRef({ start: analysisStartDate, end: analysisEndDate });
    unitFilterRef.current = unitFilter;
    analysisDatesRef.current = { start: analysisStartDate, end: analysisEndDate };

    const resetAnalysisSelection = useCallback(() => {
        productStatsAbortRef.current?.abort();
        paRawAbortRef.current?.abort();
        reasonLogAbortRef.current?.abort();
        monthlyStatsAbortRef.current?.abort();
        lastProductStatsKeyRef.current = null;
        autoAppliedStatsRangeRef.current = null;
        appliedAutoDateRangeProductRef.current = null;
        setSelectedProduct("");
        setIsProductListOpen(false);
        setProductSearch("");
        setProductStats(null);
        setStatsLoading(false);
        setMonthlyStats(null);
        setMonthlyLoading(false);
        setPaRawData([]);
        setPaRawNeeded(false);
        setPaRawLoading(false);
        setMonthlyRawData([]);
        setSelectedReason(null);
        setReasonLogData([]);
        setReasonMonthly([]);
        setReasonLogError(null);
        setReasonChartMonth(null);
        setAnalysisDateRangeReadyFor(null);
        setMonthlyCpFilter("ALL");
        setShowReject(false);
        setShowMonthlyReject(false);
        setQtyProcYear('all');
        setQtyProcCp('all');
        setQtyProcScope('ff');
        setQtyProcGroup([]);
        setQtyProcForming('all');
        setQtyProcGlaze('all');
    }, []);

    const handleLineFamilyChange = useCallback((next: LineFamily) => {
        if (next === lineFamily) return;
        setLineFamily(next);
        resetAnalysisSelection();
    }, [lineFamily, resetAnalysisSelection]);

    const handleWwToneChange = useCallback((next: WwTone) => {
        if (next === wwTone) return;
        setWwTone(next);
        resetAnalysisSelection();
    }, [wwTone, resetAnalysisSelection]);

    const handleDwKindChange = useCallback((next: DwKind) => {
        if (next === dwKind) return;
        setDwKind(next);
        resetAnalysisSelection();
    }, [dwKind, resetAnalysisSelection]);

    const analysisViewResetKey = `${lineFamily}|${wwTone}|${dwKind}`;

    const fetchProductStats = useCallback(async (product: string, options?: { autoRange?: boolean }) => {
        const autoRange = Boolean(options?.autoRange);
        const unit = unitFilterRef.current;
        const { start, end } = analysisDatesRef.current;
        if (!autoRange && !isValidDateRange(start, end)) {
            setProductStats(null);
            setStatsLoading(false);
            return;
        }
        productStatsAbortRef.current?.abort();
        const controller = new AbortController();
        productStatsAbortRef.current = controller;
        const requestKey = autoRange
            ? `${product}|auto|${unit}`
            : `${product}|${start}|${end}|${unit}`;
        if (lastProductStatsKeyRef.current?.split('|')[0] !== product) {
            setProductStats(null);
        }
        lastProductStatsKeyRef.current = requestKey;
        setStatsLoading(true);
        try {
            const dateParams = autoRange
                ? `&unit=${unit}`
                : `&startDate=${start}&endDate=${end}&unit=${unit}`;
            const result = await fetchJsonWithTimeout(
                `/api/product-stats?product=${encodeURIComponent(product)}${dateParams}`,
                PRODUCT_STATS_TIMEOUT_MS,
                controller.signal
            );
            if (lastProductStatsKeyRef.current !== requestKey) return;
            if (result.error) {
                setProductStats(null);
                return;
            }
            setProductStats(result);
            if (autoRange && result.dateRange?.minDate && result.dateRange?.maxDate) {
                const stamp = `${product}|${unit}|${result.dateRange.minDate}|${result.dateRange.maxDate}`;
                autoAppliedStatsRangeRef.current = stamp;
                appliedAutoDateRangeProductRef.current = `${product}|${unit}`;
                setAnalysisStartDate(result.dateRange.minDate);
                setAnalysisEndDate(result.dateRange.maxDate);
                setAnalysisDateRangeReadyFor(product);
            }
        } catch (e) {
            if (!isAbortError(e)) {
                console.error(e);
                if (lastProductStatsKeyRef.current === requestKey) setProductStats(null);
            }
        }
        finally {
            if (lastProductStatsKeyRef.current === requestKey) setStatsLoading(false);
        }
    }, [isValidDateRange, fetchJsonWithTimeout]);

    const fetchProductRawData = useCallback(async (product: string) => {
        if (!isValidDateRange(analysisStartDate, analysisEndDate)) {
            setPaRawData([]);
            setPaRawLoading(false);
            return;
        }
        paRawAbortRef.current?.abort();
        const controller = new AbortController();
        paRawAbortRef.current = controller;
        setPaRawLoading(true);
        try {
            const result = await fetchJsonWithTimeout(
                `/api/data?startDate=${analysisStartDate}&endDate=${analysisEndDate}&product=${encodeURIComponent(product)}&unit=${unitFilter}&jobsOnly=1`,
                MONTHLY_RAW_TIMEOUT_MS,
                controller.signal,
            );
            if (paRawAbortRef.current !== controller) return;
            setPaRawData(Array.isArray(result) ? result : []);
        } catch (e) {
            if (!isAbortError(e)) {
                console.error(e);
                if (paRawAbortRef.current === controller) setPaRawData([]);
            }
        } finally {
            if (paRawAbortRef.current === controller) {
                setPaRawLoading(false);
            }
        }
    }, [analysisStartDate, analysisEndDate, unitFilter, isValidDateRange, fetchJsonWithTimeout]);

    const buildDefectScopeKey = useCallback(() => {
        return `${analysisStartDate}|${analysisEndDate}|${category}|${defectListMode}|${unitFilter}`;
    }, [analysisStartDate, analysisEndDate, category, defectListMode, unitFilter]);

    const buildDefectTrendKey = useCallback(
        (rsnDesc: string, unit: UnitFilter = getEffectiveUnitFilter(defectUnitFilter, category)) =>
            `${buildDefectScopeKey()}|${rsnDesc}|${unit}`,
        [buildDefectScopeKey, defectUnitFilter, category],
    );

    const getDefectChartUnit = useCallback(
        () => getEffectiveUnitFilter(defectUnitFilter, category),
        [defectUnitFilter, category],
    );

    const buildDefectJobMetricsKey = useCallback(
        (unit: UnitFilter = getEffectiveUnitFilter(defectUnitFilter, category)) =>
            `${analysisStartDate}|${analysisEndDate}|${category}|${unit}`,
        [analysisStartDate, analysisEndDate, category, defectUnitFilter],
    );

    const getDefectChartFromCache = useCallback(
        (trendKey: string, unit: UnitFilter): DefectChartReady | null => {
            const trendEntry = defectTrendCacheRef.current.get(trendKey);
            const jobMetrics = defectJobMetricsCacheRef.current.get(buildDefectJobMetricsKey(unit));
            if (!trendEntry?.trend || jobMetrics === undefined) return null;
            return { trend: trendEntry.trend, jobMetrics };
        },
        [buildDefectJobMetricsKey],
    );

    const mergeDefectTrendCache = useCallback((trendKey: string, trend: DefectTrendPayload["trend"]) => {
        const prev = defectTrendCacheRef.current.get(trendKey);
        const next: DefectTrendCacheEntry = { ...prev, trend };
        defectTrendCacheRef.current.set(trendKey, next);
        return next;
    }, []);

    const applyDefectTrendPayload = useCallback((entry: DefectChartReady, trendKey: string) => {
        setDefectTrendPayload({
            trend: entry.trend,
            jobMetrics: entry.jobMetrics,
            products: [],
            wareKilns: [],
        });
        defectDisplayedTrendKeyRef.current = trendKey;
    }, []);

    const defectChartPending = useMemo(() => {
        if (view !== "defect-analysis" || !selectedDefect) return false;
        const expectedKey = buildDefectTrendKey(selectedDefect);
        return defectTrendLoading || expectedKey !== defectDisplayedTrendKeyRef.current;
    }, [view, selectedDefect, defectTrendLoading, buildDefectTrendKey, defectTrendPayload]);

    const tryApplyDefectTrend = useCallback(
        (trendKey: string, currentTrendKey: string, unit: UnitFilter, options?: { allowPartialChart?: boolean }) => {
            if (trendKey !== currentTrendKey) return false;
            const chart = getDefectChartFromCache(trendKey, unit);
            if (!chart) return false;

            if (options?.allowPartialChart) {
                const sameScopeAsDisplayed = defectDisplayedTrendKeyRef.current === trendKey;
                const noDisplayYet = defectDisplayedTrendKeyRef.current === "";
                if (!sameScopeAsDisplayed && !noDisplayYet) return false;
            }

            applyDefectTrendPayload(chart, trendKey);
            return true;
        },
        [applyDefectTrendPayload, getDefectChartFromCache],
    );

    const fetchDefectJobMetrics = useCallback(async (
        unit: UnitFilter,
        signal?: AbortSignal,
        forceRefresh = false,
    ): Promise<DefectJobMetricRow[] | null> => {
        if (!isValidDateRange(analysisStartDate, analysisEndDate)) return null;

        const metricsKey = buildDefectJobMetricsKey(unit);
        if (!forceRefresh) {
            const cached = defectJobMetricsCacheRef.current.get(metricsKey);
            if (cached) return cached;
        } else {
            defectJobMetricsCacheRef.current.delete(metricsKey);
        }

        try {
            const params = new URLSearchParams({
                startDate: analysisStartDate,
                endDate: analysisEndDate,
                category,
                unit,
                part: 'job-metrics',
            });
            if (forceRefresh) params.set('refresh', '1');
            const result = await fetchJsonWithTimeout(
                `/api/defect-trend?${params}`,
                DEFECT_CHART_TIMEOUT_MS,
                signal,
            );
            if (signal?.aborted) return null;
            const jobMetrics = Array.isArray(result?.jobMetrics) ? result.jobMetrics as DefectJobMetricRow[] : [];
            defectJobMetricsCacheRef.current.set(metricsKey, jobMetrics);
            return jobMetrics;
        } catch (e) {
            if (!isAbortError(e)) {
                console.error(e);
            }
            return null;
        }
    }, [analysisStartDate, analysisEndDate, category, buildDefectJobMetricsKey, isValidDateRange, fetchJsonWithTimeout]);

    const fetchDefectReasonList = useCallback(async (forceRefresh = false) => {
        if (!isValidDateRange(analysisStartDate, analysisEndDate)) {
            setDefectReasonList([]);
            setDefectListLoading(false);
            return;
        }
        const cacheKey = buildDefectScopeKey();
        if (!forceRefresh) {
            const cached = defectListCacheRef.current.get(cacheKey);
            if (cached) {
                setDefectReasonList(cached);
                setDefectListLoading(false);
                return;
            }
        }
        defectListAbortRef.current?.abort();
        const controller = new AbortController();
        defectListAbortRef.current = controller;
        setDefectListLoading(true);
        try {
            const params = new URLSearchParams({
                startDate: analysisStartDate,
                endDate: analysisEndDate,
                category,
                mode: defectListMode,
                unit: getEffectiveUnitFilter(unitFilter, category),
            });
            if (forceRefresh) params.set('refresh', '1');
            const result = await fetchJsonWithTimeout(
                `/api/defect-reasons?${params}`,
                MONTHLY_RAW_TIMEOUT_MS,
                controller.signal,
            );
            if (controller.signal.aborted) return;
            const list = Array.isArray(result) ? result : [];
            defectListCacheRef.current.set(cacheKey, list);
            setDefectReasonList(list);
        } catch (e) {
            if (!isAbortError(e)) {
                console.error(e);
            }
        } finally {
            if (defectListAbortRef.current === controller) {
                setDefectListLoading(false);
            }
        }
    }, [analysisStartDate, analysisEndDate, category, unitFilter, defectListMode, buildDefectScopeKey, isValidDateRange, fetchJsonWithTimeout]);

    const fetchDefectChart = useCallback(async (
        rsnDesc: string,
        forceRefresh = false,
        options?: { unit?: UnitFilter; prefetch?: boolean },
    ) => {
        if (!isValidDateRange(analysisStartDate, analysisEndDate) || !rsnDesc) {
            if (!options?.prefetch) setDefectTrendLoading(false);
            return;
        }
        const unit = options?.unit ?? getDefectChartUnit();
        const trendKey = buildDefectTrendKey(rsnDesc, unit);
        const displayedTrendKey = buildDefectTrendKey(rsnDesc);

        if (!forceRefresh) {
            if (getDefectChartFromCache(trendKey, unit)) {
                if (
                    !options?.prefetch &&
                    tryApplyDefectTrend(trendKey, displayedTrendKey, unit, { allowPartialChart: true })
                ) {
                    setDefectTrendLoading(false);
                    return;
                }
                if (options?.prefetch) return;
            }
        } else if (!options?.prefetch) {
            defectTrendCacheRef.current.delete(trendKey);
        }

        const controller = new AbortController();
        if (!options?.prefetch) {
            defectChartAbortRef.current?.abort();
            defectChartAbortRef.current = controller;
            setDefectTrendLoading(true);
        }

        try {
            const jobMetrics = await fetchDefectJobMetrics(unit, controller.signal, forceRefresh);
            if (controller.signal.aborted) return;
            if (!jobMetrics) return;

            const params = new URLSearchParams({
                startDate: analysisStartDate,
                endDate: analysisEndDate,
                category,
                rsn_desc: rsnDesc,
                mode: defectListMode,
                unit,
                part: 'trend',
            });
            if (forceRefresh) params.set('refresh', '1');
            const result = await fetchJsonWithTimeout(
                `/api/defect-trend?${params}`,
                DEFECT_CHART_TIMEOUT_MS,
                controller.signal,
            );
            if (controller.signal.aborted) return;
            const trend = Array.isArray(result?.trend) ? result.trend : [];
            mergeDefectTrendCache(trendKey, trend);
            if (!options?.prefetch && trendKey === displayedTrendKey) {
                applyDefectTrendPayload({ trend, jobMetrics }, trendKey);
            }

            if (!options?.prefetch && !isGlazeDwCategory(category)) {
                const siblingUnit: UnitFilter | undefined =
                    unit === 'WW_WHITE' ? 'WW_BLACK' : unit === 'WW_BLACK' ? 'WW_WHITE' : undefined;
                if (siblingUnit) {
                    const siblingKey = buildDefectTrendKey(rsnDesc, siblingUnit);
                    if (!getDefectChartFromCache(siblingKey, siblingUnit)) {
                        void fetchDefectChart(rsnDesc, false, { unit: siblingUnit, prefetch: true });
                    }
                }
            }
        } catch (e) {
            if (!isAbortError(e)) {
                console.error(e);
            }
        } finally {
            if (!options?.prefetch && defectChartAbortRef.current === controller) {
                setDefectTrendLoading(false);
            }
        }
    }, [
        analysisStartDate,
        analysisEndDate,
        category,
        defectListMode,
        getDefectChartUnit,
        buildDefectTrendKey,
        isValidDateRange,
        fetchJsonWithTimeout,
        mergeDefectTrendCache,
        applyDefectTrendPayload,
        tryApplyDefectTrend,
        getDefectChartFromCache,
        fetchDefectJobMetrics,
    ]);

    const ensureDefectTrendLoaded = useCallback(
        async (rsnDesc: string, forceRefresh = false) => {
            if (!isValidDateRange(analysisStartDate, analysisEndDate) || !rsnDesc) return;

            const unit = getDefectChartUnit();
            const trendKey = buildDefectTrendKey(rsnDesc);
            if (!forceRefresh) {
                const chart = getDefectChartFromCache(trendKey, unit);
                if (chart) {
                    applyDefectTrendPayload(chart, trendKey);
                    setDefectTrendLoading(false);
                    return;
                }
            } else {
                defectTrendCacheRef.current.delete(trendKey);
                defectJobMetricsCacheRef.current.delete(buildDefectJobMetricsKey(unit));
                defectDisplayedTrendKeyRef.current = "";
            }

            await fetchDefectChart(rsnDesc, forceRefresh);
        },
        [
            analysisStartDate,
            analysisEndDate,
            buildDefectTrendKey,
            buildDefectJobMetricsKey,
            getDefectChartUnit,
            isValidDateRange,
            applyDefectTrendPayload,
            fetchDefectChart,
            getDefectChartFromCache,
        ],
    );

    const fetchReasonLog = useCallback(async (product: string, reason: SelectedReason) => {
        if (!isValidDateRange(analysisStartDate, analysisEndDate)) {
            setReasonLogData([]);
            setReasonMonthly([]);
            setReasonLogError(null);
            setReasonLogLoading(false);
            return;
        }
        reasonLogAbortRef.current?.abort();
        const controller = new AbortController();
        reasonLogAbortRef.current = controller;
        setReasonLogData([]);
        setReasonMonthly([]);
        setReasonLogError(null);
        setReasonLogLoading(true);
        try {
            const params = new URLSearchParams({
                product,
                startDate: analysisStartDate,
                endDate: analysisEndDate,
                rsn_desc: reason.rsn_desc,
                sub_type: reason.sub_type,
                unit: unitFilter,
            });
            if (reason.combined_p_cps?.length) {
                params.set('combined_p_cps', reason.combined_p_cps.join(','));
            } else if (reason.combined_p) {
                params.set('combined_p', '1');
            } else if (reason.m_cp) {
                params.set('m_cp', reason.m_cp);
            }
            if (reason.is_round1 !== undefined) {
                params.set('is_round1', reason.is_round1 ? '1' : '0');
            }
            const result = await fetchJsonWithTimeout(`/api/product-reason-log?${params}`, REASON_LOG_TIMEOUT_MS, controller.signal);
            if (reasonLogAbortRef.current !== controller) return;
            if (result.error) {
                setReasonLogData([]);
                setReasonMonthly([]);
                setReasonLogError(String(result.error));
            } else {
                setReasonLogData(result.log || []);
                setReasonMonthly(result.monthly || []);
                setReasonLogError(null);
            }
        } catch (e) {
            if (isAbortError(e)) return;
            console.error(e);
            if (reasonLogAbortRef.current === controller) {
                setReasonLogData([]);
                setReasonMonthly([]);
                setReasonLogError(
                    e instanceof Error && e.name === "TimeoutError"
                        ? "Timed out loading reason log. Try a narrower date range, then click the reason again."
                        : e instanceof Error
                          ? e.message
                          : "Failed to load reason log",
                );
            }
        } finally {
            if (reasonLogAbortRef.current === controller) {
                setReasonLogLoading(false);
            }
        }
    }, [analysisStartDate, analysisEndDate, unitFilter, isValidDateRange, fetchJsonWithTimeout]);

    const fetchMonthlyStats = useCallback(async (product: string) => {
        if (!isValidDateRange(analysisStartDate, analysisEndDate)) {
            setMonthlyStats(null);
            setMonthlyRawData([]);
            setMonthlyLoading(false);
            return;
        }
        monthlyStatsAbortRef.current?.abort();
        const controller = new AbortController();
        monthlyStatsAbortRef.current = controller;
        setMonthlyStats(null);
        setMonthlyRawData([]);
        setMonthlyLoading(true);
        try {
            const dateParams = `&startDate=${analysisStartDate}&endDate=${analysisEndDate}&unit=${unitFilter}`;
            const cpParam = monthlyCpFilter !== 'ALL' ? `&m_cp=${encodeURIComponent(monthlyCpFilter)}` : '';
            const statsResult = await fetchJsonWithTimeout(
                `/api/monthly-stats?product=${encodeURIComponent(product)}${dateParams}${cpParam}`,
                MONTHLY_STATS_TIMEOUT_MS,
                controller.signal
            );
            if (monthlyStatsAbortRef.current !== controller) return;
            setMonthlyStats(statsResult?.error ? null : statsResult);
            setMonthlyLoading(false);

            fetchJsonWithTimeout(
                `/api/data?startDate=${analysisStartDate}&endDate=${analysisEndDate}&product=${encodeURIComponent(product)}&unit=${unitFilter}`,
                MONTHLY_RAW_TIMEOUT_MS,
                controller.signal
            ).then((rawResult) => {
                if (monthlyStatsAbortRef.current !== controller) return;
                if (Array.isArray(rawResult)) setMonthlyRawData(rawResult);
            }).catch((error) => {
                if (!isAbortError(error)) {
                    console.error(error);
                    if (monthlyStatsAbortRef.current === controller) setMonthlyRawData([]);
                }
            });
        } catch (e) {
            if (!isAbortError(e)) {
                console.error(e);
                if (monthlyStatsAbortRef.current === controller) {
                    setMonthlyStats(null);
                    setMonthlyRawData([]);
                }
            }
        } finally {
            if (monthlyStatsAbortRef.current === controller) {
                setMonthlyLoading(false);
            }
        }
    }, [analysisStartDate, analysisEndDate, unitFilter, monthlyCpFilter, isValidDateRange, fetchJsonWithTimeout]);

    const fetchData = useCallback(async (date?: string) => {
        dataAbortRef.current?.abort();
        const controller = new AbortController();
        dataAbortRef.current = controller;
        setLoading(true); setRefreshing(true);
        try {
            const url = date ? `/api/data?date=${date}` : "/api/data";
            const res = await fetch(url, { signal: controller.signal });
            const result = await res.json();
            if (dataAbortRef.current !== controller) return;
            if (Array.isArray(result)) {
                setData(normalizeDataRows(result));
                if (result.length > 0 && !date) {
                    const latest = result[0].m_date.split("T")[0];
                    setSelectedDate(prev => prev || latest);
                }
            } else {
                setData([]);
            }
        } catch (e) {
            if (!isAbortError(e)) console.error(e);
        } finally {
            if (dataAbortRef.current === controller) {
                setLoading(false); setRefreshing(false);
            }
        }
    }, []);

    const fetchQtyProc = useCallback(async (forceRefresh = false, silent = false) => {
        if (!silent) setQtyProcLoading(true);
        setQtyProcError(null);
        try {
            const qs = new URLSearchParams({ category: 'WW', unit: 'ALL' });
            if (forceRefresh) qs.set('refresh', '1');
            const result = await fetchJsonWithTimeout(`/api/qtyproc?${qs}`, QTYPROC_TIMEOUT_MS);
            if (result?.error) {
                setQtyProcError(String(result.error));
                return;
            }
            setQtyProcPayload(result as QtyProcPayload);
            if (!forceRefresh && result?.stale) {
                void fetchQtyProc(true, true);
            }
        } catch (e) {
            console.error(e);
            if (!silent) setQtyProcError(e instanceof Error ? e.message : 'Production Mix failed');
        } finally {
            if (!silent) setQtyProcLoading(false);
        }
    }, [fetchJsonWithTimeout]);

    const handleRefresh = useCallback(async () => {
        if (view === "overview") {
            await fetchData(selectedDate);
            return;
        }
        if (view === "product-analysis" || view === "monthly-analysis") {
            setRefreshing(true);
            try {
                await fetchProductList(true);
                if (selectedProduct) {
                    if (view === "product-analysis") {
                        const tasks: Promise<unknown>[] = [fetchProductStats(selectedProduct)];
                        if (paRawNeeded) tasks.push(fetchProductRawData(selectedProduct));
                        await Promise.all(tasks);
                    } else {
                        await fetchMonthlyStats(selectedProduct);
                    }
                }
            } finally {
                setRefreshing(false);
            }
            return;
        }
        if (view === "qty-process") {
            setRefreshing(true);
            try {
                await fetchQtyProc(true);
            } finally {
                setRefreshing(false);
            }
            return;
        }
        if (view === "defect-analysis") {
            setRefreshing(true);
            try {
                defectListCacheRef.current.clear();
                defectTrendCacheRef.current.clear();
                defectJobMetricsCacheRef.current.clear();
                defectDisplayedTrendKeyRef.current = "";
                await fetchDefectReasonList(true);
                if (selectedDefect) {
                    await ensureDefectTrendLoaded(selectedDefect, true);
                }
            } finally {
                setRefreshing(false);
            }
        }
    }, [
        view,
        selectedDate,
        selectedProduct,
        fetchData,
        fetchProductList,
        fetchProductStats,
        fetchProductRawData,
        fetchMonthlyStats,
        fetchDefectReasonList,
        ensureDefectTrendLoaded,
        fetchQtyProc,
        selectedDefect,
        paRawNeeded,
    ]);

    // ─── Effects ─────────────────────────────────────────────
    useEffect(() => {
        if (view !== "overview") {
            dataAbortRef.current?.abort();
            return;
        }
        if (selectedDate) fetchData(selectedDate);
        else fetchData();
    }, [view, selectedDate, fetchData]);

    useEffect(() => {
        if (view !== "product-analysis" && view !== "monthly-analysis") {
            productListAbortRef.current?.abort();
            return;
        }
        void fetchProductList(false);
    }, [view, fetchProductList]);

    useEffect(() => {
        if (view !== "product-analysis" && view !== "monthly-analysis") return;
        const needsOnglaze = category === "DW_ONGLAZE" || category === "DW_ALL";
        const hasOnglaze = productList.some((item) =>
            String(item.value || "").startsWith(ONGLAZE_PRODUCT_PREFIX),
        );
        const needsUnitFlags = category === "WW" && wwTone !== "ALL";
        const hasUnitFlags = productListHasWwUnitFlags(productList);
        void fetchProductList(
            (needsOnglaze && !hasOnglaze) || (needsUnitFlags && !hasUnitFlags),
        );
    }, [view, category, wwTone, fetchProductList]);

    useEffect(() => {
        if (view !== "qty-process") return;
        void fetchQtyProc(false);
    }, [view, fetchQtyProc]);

    useEffect(() => {
        if (view !== "defect-analysis") return;
        fetchDefectReasonList();
    }, [view, fetchDefectReasonList]);

    useEffect(() => {
        if (!selectedProduct) {
            appliedAutoDateRangeProductRef.current = null;
            setAnalysisDateRangeReadyFor(null);
            setSelectedReason(null);
            setReasonLogData([]);
            setReasonMonthly([]);
            setReasonLogError(null);
            setPaRawNeeded(false);
            setPaRawData([]);
            return;
        }
        if (view !== "product-analysis" && view !== "monthly-analysis") return;

        const appliedKey = `${selectedProduct}|${unitFilter}`;
        if (appliedAutoDateRangeProductRef.current === appliedKey) {
            setAnalysisDateRangeReadyFor(selectedProduct);
            return;
        }

        let cancelled = false;
        setAnalysisDateRangeReadyFor(null);
        reasonLogAbortRef.current?.abort();
        setSelectedReason(null);
        setReasonLogData([]);
        setReasonMonthly([]);
        setReasonLogError(null);
        setReasonLogLoading(false);

        if (view === "product-analysis") {
            setStatsLoading(true);
            void fetchProductStats(selectedProduct, { autoRange: true });
            return;
        }

        setMonthlyLoading(true);
        void (async () => {
            try {
                const range = await fetchProductAutoDateRange(selectedProduct);
                if (cancelled) return;
                if (range) {
                    setAnalysisStartDate(range.minDate);
                    setAnalysisEndDate(range.maxDate);
                }
            } catch (e) {
                console.error(e);
                if (cancelled) return;
            }
            if (cancelled) return;
            appliedAutoDateRangeProductRef.current = appliedKey;
            setAnalysisDateRangeReadyFor(selectedProduct);
        })();

        return () => {
            cancelled = true;
        };
    }, [selectedProduct, unitFilter, view, fetchProductAutoDateRange, fetchProductStats]);

    useEffect(() => {
        if (!selectedProduct || view !== "product-analysis") return;
        if (analysisDateRangeReadyFor !== selectedProduct) return;
        if (appliedAutoDateRangeProductRef.current !== `${selectedProduct}|${unitFilter}`) return;
        const stamp = `${selectedProduct}|${unitFilter}|${analysisStartDate}|${analysisEndDate}`;
        if (autoAppliedStatsRangeRef.current === stamp) {
            autoAppliedStatsRangeRef.current = null;
            return;
        }
        fetchProductStats(selectedProduct);
    }, [selectedProduct, view, analysisDateRangeReadyFor, analysisStartDate, analysisEndDate, unitFilter, fetchProductStats]);

    useEffect(() => {
        if (!paRawNeeded || !selectedProduct || view !== "product-analysis") return;
        if (analysisDateRangeReadyFor !== selectedProduct) return;
        fetchProductRawData(selectedProduct);
    }, [paRawNeeded, selectedProduct, view, analysisDateRangeReadyFor, analysisStartDate, analysisEndDate, fetchProductRawData]);

    const requestPaRawData = useCallback(() => {
        setPaRawNeeded(true);
    }, []);

    useEffect(() => {
        if (view !== "defect-analysis" || !selectedDefect) {
            setDefectTrendPayload({ trend: [], jobMetrics: [], products: [], wareKilns: [] });
            defectDisplayedTrendKeyRef.current = "";
            setDefectTrendLoading(false);
            return;
        }

        const trendKey = buildDefectTrendKey(selectedDefect);
        if (defectDisplayedTrendKeyRef.current !== trendKey) {
            setDefectTrendPayload({ trend: [], jobMetrics: [], products: [], wareKilns: [] });
            defectDisplayedTrendKeyRef.current = "";
        }
        setDefectTrendLoading(true);
        void ensureDefectTrendLoaded(selectedDefect);
    }, [
        view,
        selectedDefect,
        defectUnitFilter,
        category,
        analysisStartDate,
        analysisEndDate,
        ensureDefectTrendLoaded,
        buildDefectTrendKey,
    ]);

    useEffect(() => {
        if (view !== "defect-analysis") return;
        setSelectedDefect("");
        setDefectTrendPayload({ trend: [], jobMetrics: [], products: [], wareKilns: [] });
        defectDisplayedTrendKeyRef.current = "";
    }, [view, category, defectListMode]);
    useEffect(() => {
        if (!(selectedReason && selectedProduct && view === "product-analysis" && analysisDateRangeReadyFor === selectedProduct)) {
            return;
        }
        fetchReasonLog(selectedProduct, selectedReason);
    }, [selectedReason, selectedProduct, view, analysisDateRangeReadyFor, fetchReasonLog]);
    useEffect(() => {
        if (selectedProduct && view === "monthly-analysis" && analysisDateRangeReadyFor === selectedProduct) {
            fetchMonthlyStats(selectedProduct);
        }
    }, [selectedProduct, view, analysisDateRangeReadyFor, fetchMonthlyStats]);
    useEffect(() => {
        return () => {
            productStatsAbortRef.current?.abort();
            paRawAbortRef.current?.abort();
            reasonLogAbortRef.current?.abort();
            monthlyStatsAbortRef.current?.abort();
            defectListAbortRef.current?.abort();
            defectChartAbortRef.current?.abort();
            dataAbortRef.current?.abort();
            productListAbortRef.current?.abort();
        };
    }, []);

    // ─── Data Processing ─────────────────────────────────────
    const filteredData = useMemo(() => {
        return filterByCategory(data, category);
    }, [data, category]);

    const aggregateMetrics = (items: DataItem[]) => {
        const uniqueGroups = new Map<string, { qtyp: number; qtycomp: number; qtyscrp: number; qtyrjct: number }>();
        const specialAdjustments = new Map<string, number>();

        items.forEach(item => {
            const key = `${item.m_doc}|${item.m_job}|${item.m_date}|${item.m_kiln}|${item.m_cp}|${item.pt_desc1}|${item.pt_desc2 || ''}`;
            const next = {
                qtyp: item.qtyp || 0,
                qtycomp: item.qtycomp || 0,
                qtyscrp: item.qtyscrp || 0,
                qtyrjct: item.qtyrjct || 0,
            };
            const existing = uniqueGroups.get(key);
            if (!existing) {
                uniqueGroups.set(key, next);
            } else {
                existing.qtyp = Math.max(existing.qtyp, next.qtyp);
                existing.qtycomp = Math.max(existing.qtycomp, next.qtycomp);
                existing.qtyscrp = Math.max(existing.qtyscrp, next.qtyscrp);
                existing.qtyrjct = Math.max(existing.qtyrjct, next.qtyrjct);
            }
            if (isC1SpecialReasonForRecord(item)) {
                specialAdjustments.set(key, (specialAdjustments.get(key) || 0) + (item.sub_qty || 0));
            }
        });

        specialAdjustments.forEach((adjQty, key) => {
            const group = uniqueGroups.get(key);
            if (group) { group.qtycomp += adjQty; group.qtyrjct = Math.max(0, group.qtyrjct - adjQty); }
        });

        let totalQtyp = 0, totalQtya = 0, totalScrap = 0, totalReject = 0;
        uniqueGroups.forEach(val => { totalQtyp += val.qtyp; totalQtya += val.qtycomp; totalScrap += val.qtyscrp; totalReject += val.qtyrjct; });

        const scrapRate = totalQtyp > 0 ? (totalScrap / totalQtyp) * 100 : 0;
        const rejectRate = totalQtyp > 0 ? (totalReject / totalQtyp) * 100 : 0;
        const compRate = totalQtyp > 0 ? (totalQtya / totalQtyp) * 100 : 0;
        return { totalQtyp, totalQtya, totalScrap, totalReject, scrapRate, rejectRate, compRate };
    };

    const getEffectiveCp = (item: DataItem) => {
        return isSomboonCpC(item) ? 'C1' : item.m_cp;
    };

    useEffect(() => {
        if (view !== "defect-analysis") return;
        setSelectedDefect((current) => {
            if (!current) return current;
            return defectReasonList.some((item) => item.value === current) ? current : "";
        });
    }, [view, defectReasonList]);

    const filteredProducts = useMemo(() => {
        const q = productSearch.toLowerCase();
        return productList.filter((p) =>
            productMatchesSearch(p, category, wwTone)
            && (p.searchText || '').toLowerCase().includes(q),
        );
    }, [productList, productSearch, category, wwTone]);

    useEffect(() => {
        if (!selectedProduct) return;
        if (productList.length === 0) return;
        const item = productList.find((p) => p.value === selectedProduct);
        if (productMatchesSearch(item ?? { value: selectedProduct }, category, wwTone)) return;
        resetAnalysisSelection();
    }, [category, wwTone, selectedProduct, productList, resetAnalysisSelection]);

    const filteredDefects = useMemo(() => {
        const query = defectSearch.toLowerCase().trim();
        if (!query) return defectReasonList;
        return defectReasonList.filter((item) => (item.searchText || '').toLowerCase().includes(query));
    }, [defectReasonList, defectSearch]);

    const selectedProductLabel = useMemo(() => {
        const item = productList.find(p => p.value === selectedProduct);
        return item?.label ?? formatProductDescription(selectedProduct);
    }, [productList, selectedProduct]);

    const selectedDefectLabel = useMemo(() => {
        const item = defectReasonList.find((d) => d.value === selectedDefect);
        return item?.label ?? selectedDefect;
    }, [defectReasonList, selectedDefect]);

    const dailyMetrics = useMemo(() => {
        const dayData = filteredData.filter(item => {
            if (!item.m_date.startsWith(selectedDate)) return false;
            const effectiveUnit = isGlazeDwCategory(category) ? 'ALL' : overallUnitFilter;
            if (effectiveUnit === "WW_WHITE" && !(item.unit || '').startsWith("W5240")) return false;
            if (effectiveUnit === "WW_BLACK" && !(item.unit || '').startsWith("W5241")) return false;
            if (overallCpFilter !== "ALL") { if (getEffectiveCp(item) !== overallCpFilter) return false; }
            return true;
        });
        return aggregateMetrics(dayData);
    }, [filteredData, selectedDate, overallUnitFilter, overallCpFilter, category]);

    const weeklyMetrics = useMemo(() => {
        const weekData = filteredData.filter(item => {
            const effectiveUnit = isGlazeDwCategory(category) ? 'ALL' : overallUnitFilter;
            if (effectiveUnit === "WW_WHITE" && !(item.unit || '').startsWith("W5240")) return false;
            if (effectiveUnit === "WW_BLACK" && !(item.unit || '').startsWith("W5241")) return false;
            if (overallCpFilter !== "ALL") { if (getEffectiveCp(item) !== overallCpFilter) return false; }
            return true;
        });
        return aggregateMetrics(weekData);
    }, [filteredData, overallUnitFilter, overallCpFilter, category]);

    const trendData = useMemo(() => {
        const dates = [...new Set(filteredData.map(i => i.m_date.split("T")[0]))].sort();
        return dates.slice(-7).map(d => {
            const dData = filteredData.filter(item => {
                if (!item.m_date.startsWith(d)) return false;
                const effectiveUnit = isGlazeDwCategory(category) ? 'ALL' : overallUnitFilter;
                if (effectiveUnit === "WW_WHITE" && !(item.unit || '').startsWith("W5240")) return false;
                if (effectiveUnit === "WW_BLACK" && !(item.unit || '').startsWith("W5241")) return false;
                if (overallCpFilter !== "ALL") { if (getEffectiveCp(item) !== overallCpFilter) return false; }
                return true;
            });
            const metrics = aggregateMetrics(dData);
            return {
                name: formatDateShort(d),
                scrap: parseFloat(metrics.scrapRate.toFixed(1)),
                reject: parseFloat(metrics.rejectRate.toFixed(1)),
                comp: parseFloat(metrics.compRate.toFixed(1)),
            };
        });
    }, [filteredData, overallUnitFilter, overallCpFilter, category]);

    const cpOptions = useMemo(() => {
        const opsSet = new Set(filteredData.map(item => item.m_cp));
        opsSet.add('C1');
        const ops = [...opsSet].sort((a, b) => {
            if (a === 'C1' && b !== 'C1') return -1;
            if (b === 'C1' && a !== 'C1') return 1;
            if (a === 'C' && b !== 'C') return -1;
            if (b === 'C' && a !== 'C') return 1;
            return a.localeCompare(b);
        });
        return ["ALL", ...ops];
    }, [filteredData]);

    const monthlyCpOptions = useMemo(() => {
        return [...(monthlyStats?.cpOptions || [])].sort((a, b) => {
            if (a === 'C1' && b !== 'C1') return -1;
            if (b === 'C1' && a !== 'C1') return 1;
            if (a === 'C' && b !== 'C') return -1;
            if (b === 'C' && a !== 'C') return 1;
            return a.localeCompare(b);
        });
    }, [monthlyStats]);

    const dailyActivityTable = useMemo(() => {
        if (!selectedDate) return [];
        return buildDailyActivityTable(filteredData, {
            date: selectedDate,
            unitFilter: (isGlazeDwCategory(category) ? 'ALL' : overallUnitFilter) as UnitFilter,
            cpFilter: overallCpFilter,
            category,
        });
    }, [filteredData, selectedDate, overallCpFilter, overallUnitFilter, category]);

    /** Full filtered Sorting Logs (7-day window). UI shows top 100; Excel exports all. */
    const activityTableAll = useMemo(() => {
        const grouped = new Map<string, GroupedRow>();

        filteredData
            .filter(item => {
                const effectiveUnit = isGlazeDwCategory(category) ? 'ALL' : unitFilter;
                if (effectiveUnit === "ALL") return true;
                if (effectiveUnit === "WW_WHITE") return (item.unit || '').startsWith("W5240");
                if (effectiveUnit === "WW_BLACK") return (item.unit || '').startsWith("W5241");
                return true;
            })
            .forEach(item => {
                const dateStr = item.m_date.split('T')[0];
                const displayCp = isSomboonCpC(item) ? 'C1' : item.m_cp;
                const key = `${item.m_doc}-${item.m_job}-${dateStr}-${item.m_kiln}-${displayCp}`;

                if (!grouped.has(key)) {
                    grouped.set(key, {
                        ...item, m_cp: displayCp,
                        cdReasons: new Map<string, number>(), pjReasons: new Map<string, number>(),
                        totalScrap: item.qtyscrp || 0, totalReject: item.qtyrjct || 0
                    });
                }
                const g = grouped.get(key)!;

                if (item.rsn_desc) {
                    if (isC1SpecialReasonForRecord(item)) {
                        g.qtycomp += (item.sub_qty || 0);
                        g.totalReject = Math.max(0, g.totalReject - (item.sub_qty || 0));
                    } else if (isScrapSubTyp(item.sub_typ)) {
                        g.cdReasons.set(item.rsn_desc, (g.cdReasons.get(item.rsn_desc) || 0) + (item.sub_qty || 0));
                    } else if (isRejectSubTyp(item.sub_typ)) {
                        g.pjReasons.set(item.rsn_desc, (g.pjReasons.get(item.rsn_desc) || 0) + (item.sub_qty || 0));
                    }
                }
            });

        return Array.from(grouped.values())
            .filter(item => {
                const q = searchQuery.toLowerCase();
                const job = (item.m_job || '').toLowerCase();
                const part = (item.m_part || '').toLowerCase();
                const desc1 = (item.pt_desc1 || '').toLowerCase();
                const desc2 = (item.pt_desc2 || '').toLowerCase();
                const matchesSearch = !q ||
                    job.includes(q) ||
                    part.includes(q) ||
                    desc1.includes(q) ||
                    (part.startsWith('143') && desc2.includes(q));
                const matchesCP = cpFilter === "ALL" || item.m_cp === cpFilter || (cpFilter === 'C' && item.m_cp === 'C1');
                return matchesSearch && matchesCP;
            })
            .sort((a, b) => {
                const dateA = new Date(a.m_date).getTime();
                const dateB = new Date(b.m_date).getTime();
                if (dateA !== dateB) return dateB - dateA;
                const getOrder = (cp: string) => {
                    if (cp === 'C') return 0;
                    if (cp === 'C1') return 0.5;
                    if (cp.startsWith('P')) { const num = parseInt(cp.slice(1)); return isNaN(num) ? 999 : num; }
                    return 1000;
                };
                return getOrder(a.m_cp) - getOrder(b.m_cp);
            });
    }, [filteredData, searchQuery, cpFilter, unitFilter, category]);

    const activityTable = useMemo(() => activityTableAll.slice(0, 100), [activityTableAll]);
    const pinCodewareTitle = view === "product-analysis" || view === "monthly-analysis";

    // ─── Render ──────────────────────────────────────────────
    return (
        <div className={`dash-skin flex h-screen ${theme.pageBg} ${theme.textPrimary} font-sans overflow-hidden transition-colors duration-300`} data-skin={skinId} data-ui-theme={currentTheme}>
            {/* Sidebar Overlay for Mobile */}
            {isSidebarOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300" onClick={() => setSidebarOpen(false)} />
            )}

            <Sidebar
                theme={theme}
                view={view === "defect-analysis" ? "qty-process" : view}
                isSidebarOpen={isSidebarOpen}
                onSetView={(next) => setView(next === "defect-analysis" ? "qty-process" : next)}
                onClose={() => setSidebarOpen(false)}
            />

            <main className="flex-1 flex flex-col overflow-hidden">
                <Header
                    theme={theme}
                    currentTheme={currentTheme}
                    setCurrentTheme={setCurrentTheme}
                    view={view}
                    lineFamily={lineFamily}
                    setLineFamily={handleLineFamilyChange}
                    wwTone={wwTone}
                    setWwTone={handleWwToneChange}
                    dwKind={dwKind}
                    setDwKind={handleDwKindChange}
                    selectedDate={selectedDate}
                    setSelectedDate={setSelectedDate}
                    refreshing={refreshing}
                    onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
                    onRefresh={() => void handleRefresh()}
                    isRefreshDisabled={refreshing}
                    selectedProduct={selectedProduct}
                    productSearch={productSearch}
                    setProductSearch={setProductSearch}
                    isProductListOpen={isProductListOpen}
                    setIsProductListOpen={setIsProductListOpen}
                    filteredProducts={filteredProducts}
                    setSelectedProduct={setSelectedProduct}
                    selectedProductLabel={selectedProductLabel}
                    overallCpFilter={overallCpFilter}
                    setOverallCpFilter={setOverallCpFilter}
                    cpOptions={cpOptions}
                    defectSearch={defectSearch}
                    setDefectSearch={setDefectSearch}
                    isDefectListOpen={isDefectListOpen}
                    setIsDefectListOpen={setIsDefectListOpen}
                    filteredDefects={filteredDefects}
                    selectedDefect={selectedDefect}
                    selectedDefectLabel={selectedDefectLabel}
                    setSelectedDefect={setSelectedDefect}
                    defectListMode={defectListMode}
                    setDefectListMode={setDefectListMode}
                    defectListLoading={defectListLoading}
                    defectReasonCount={defectReasonList.length}
                    qtyProcYear={qtyProcYear}
                    setQtyProcYear={setQtyProcYear}
                    qtyProcLine={qtyProcLine}
                    setQtyProcLine={setQtyProcLine}
                    qtyProcCp={qtyProcCp}
                    setQtyProcCp={setQtyProcCp}
                    qtyProcScope={qtyProcScope}
                    setQtyProcScope={(next) => {
                        setQtyProcScope(next);
                        if (next === 'ff' && (pRoundOf(qtyProcCp) || qtyProcCp === 'CUSTOM')) setQtyProcCp('all');
                        if (next === 'all' && (qtyProcCp === 'FRIT' || qtyProcCp === 'BOM')) setQtyProcCp('C1');
                    }}
                    qtyProcGroup={qtyProcGroup}
                    setQtyProcGroup={setQtyProcGroup}
                    qtyProcForming={qtyProcForming}
                    setQtyProcForming={setQtyProcForming}
                    qtyProcCustomer={qtyProcCustomer}
                    setQtyProcCustomer={setQtyProcCustomer}
                    qtyProcGlaze={qtyProcGlaze}
                    setQtyProcGlaze={setQtyProcGlaze}
                    qtyProcGroupKeys={qtyProcGroupKeys}
                    qtyProcGroupLabels={qtyProcGroupLabelMap}
                    qtyProcFormingKeys={qtyProcFormingKeys}
                    qtyProcCustomerKeys={qtyProcCustomerKeys}
                />
                {!pinCodewareTitle && <div className="dash-skin-bar" />}

                <div className={`flex-1 overflow-y-auto overflow-x-hidden min-h-0 ${
                    pinCodewareTitle
                        ? 'pt-0 px-3 sm:px-4 md:px-8 pb-3 sm:pb-4 md:pb-8'
                        : 'p-3 sm:p-4 md:p-8'
                } space-y-6 sm:space-y-8 md:space-y-10 ${skinFadeOn ? 'dash-fade' : ''}`}>
                    {((loading && view === "overview")) ? (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4">
                            <div className={`w-12 h-12 border-4 ${theme.badgeBorder} skin-accent-spinner rounded-full animate-spin`} />
                            <p className={`${theme.textMuted} font-medium animate-pulse`}>
                                Fetching latest sorting data...
                            </p>
                        </div>
                    ) : view === "overview" ? (
                        <OverviewView
                            theme={theme}
                            currentTheme={currentTheme}
                            selectedDate={selectedDate}
                            dailyMetrics={dailyMetrics}
                            weeklyMetrics={weeklyMetrics}
                            trendData={trendData}
                            dailyActivityTable={dailyActivityTable}
                            activityTable={activityTable}
                            activityTableExportRows={activityTableAll}
                            isDailyMonitorFullscreen={isDailyMonitorFullscreen}
                            setIsDailyMonitorFullscreen={setIsDailyMonitorFullscreen}
                            setSelectedDailyRow={setSelectedDailyRow}
                            cpFilter={cpFilter}
                            setCpFilter={setCpFilter}
                            unitFilter={unitFilter}
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            cpOptions={cpOptions}
                            overallCpFilter={overallCpFilter}
                            setOverallCpFilter={setOverallCpFilter}
                            setSelectedDate={setSelectedDate}
                        />
                    ) : view === "product-analysis" ? (
                        <ProductAnalysisView
                            key={analysisViewResetKey}
                            theme={theme}
                            currentTheme={currentTheme}
                            selectedProduct={selectedProduct}
                            selectedProductLabel={selectedProductLabel}
                            productStats={productStats}
                            statsLoading={statsLoading}
                            paRawData={paRawData}
                            paRawLoading={paRawLoading}
                            showReject={showReject}
                            setShowReject={setShowReject}
                            selectedReason={selectedReason}
                            setSelectedReason={setSelectedReason}
                            reasonLogData={reasonLogData}
                            reasonLogLoading={reasonLogLoading}
                            reasonLogError={reasonLogError}
                            reasonMonthly={reasonMonthly}
                            reasonChartMonth={reasonChartMonth}
                            setReasonChartMonth={setReasonChartMonth}
                            analysisStartDate={analysisStartDate}
                            setAnalysisStartDate={setAnalysisStartDate}
                            analysisEndDate={analysisEndDate}
                            setAnalysisEndDate={setAnalysisEndDate}
                            onNeedPaRawData={requestPaRawData}
                            unitFilter={unitFilter}
                        />
                    ) : view === "monthly-analysis" ? (
                        <MonthlyAnalysisView
                            key={analysisViewResetKey}
                            theme={theme}
                            currentTheme={currentTheme}
                            selectedProduct={selectedProduct}
                            selectedProductLabel={selectedProductLabel}
                            monthlyStats={monthlyStats}
                            monthlyLoading={monthlyLoading}
                            showMonthlyReject={showMonthlyReject}
                            setShowMonthlyReject={setShowMonthlyReject}
                            allData={monthlyRawData}
                            cpOptions={['ALL', ...monthlyCpOptions]}
                            monthlyCpFilter={monthlyCpFilter}
                            setMonthlyCpFilter={setMonthlyCpFilter}
                            analysisStartDate={analysisStartDate}
                            setAnalysisStartDate={setAnalysisStartDate}
                            analysisEndDate={analysisEndDate}
                            setAnalysisEndDate={setAnalysisEndDate}
                        />
                    ) : view === "qty-process" || view === "defect-analysis" ? (
                        <QtyProcessView
                            theme={theme}
                            currentTheme={currentTheme}
                            payload={qtyProcPayload}
                            loading={qtyProcLoading}
                            error={qtyProcError}
                            categoryLabel={qtyProcLine === 'all' ? 'WW' : qtyProcLine === 'WHITE' ? 'WW · White' : 'WW · Black'}
                            year={qtyProcYear}
                            line={qtyProcLine}
                            cp={qtyProcCp}
                            scope={qtyProcScope}
                            group={qtyProcGroup}
                            forming={qtyProcForming}
                            customer={qtyProcCustomer}
                            glaze={qtyProcGlaze}
                        />
                    ) : (
                        <SettingsView
                            theme={theme}
                            currentTheme={currentTheme}
                            setCurrentTheme={setCurrentTheme}
                        />
                    )}
                </div>
            </main>

            {/* Daily Detail Modal */}
            {selectedDailyRow && (
                <DailyDetailModal
                    row={selectedDailyRow}
                    theme={theme}
                    currentTheme={currentTheme}
                    onClose={() => setSelectedDailyRow(null)}
                />
            )}
        </div>
    );
}

function DashboardFallback() {
    return (
        <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-400">
            <div className="flex flex-col items-center gap-3">
                <div className="h-10 w-10 rounded-full border-4 border-zinc-700 border-t-blue-500 animate-spin" />
                <p className="text-sm font-medium">Loading dashboard...</p>
            </div>
        </div>
    );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<DashboardFallback />}>
            <Dashboard />
        </Suspense>
    );
}
