"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { themes, type ThemeName } from "@/lib/themes";
import { formatDateShort, formatProductDescription } from "@/lib/utils";
import type { DataItem, ProductStats, MonthlyStats, SelectedReason, ViewType, GroupedRow, ReasonLogEntry, ReasonMonthlyEntry, ProductItem, DefectReasonItem, DefectListMode } from "@/types/dashboard";
import type { DefectTrendPayload } from "@/lib/defect-reason-query";
import {
    Sidebar,
    Header,
    DailyDetailModal,
    OverviewView,
    ProductAnalysisView,
    MonthlyAnalysisView,
    DefectAnalysisView,
    SettingsView,
} from "@/components/dashboard";
import { buildDailyActivityTable } from "@/lib/daily-defects";
import { isC1SpecialReasonForRecord, isSomboonCpC } from "@/lib/c1-special-reason";
import { isRejectSubTyp, isScrapSubTyp } from "@/lib/sub-typ";
import type { UnitFilter } from "@/lib/unit-filter";

export default function Dashboard() {
    const PRODUCT_STATS_TIMEOUT_MS = 120000;
    const REASON_LOG_TIMEOUT_MS = 60000;
    const MONTHLY_STATS_TIMEOUT_MS = 120000;
    const MONTHLY_RAW_TIMEOUT_MS = 120000;
    // ─── UI State ────────────────────────────────────────────
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [currentTheme, setCurrentTheme] = useState<ThemeName>("dark");
    const theme = themes[currentTheme];
    const [view, setView] = useState<ViewType>("overview");

    // ─── Overview State ──────────────────────────────────────
    const [data, setData] = useState<DataItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState("ALL");
    const [selectedDate, setSelectedDate] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");
    const [cpFilter, setCpFilter] = useState("ALL");
    const [unitFilter, setUnitFilter] = useState("ALL");
    const [overallCpFilter, setOverallCpFilter] = useState("ALL");
    const [overallUnitFilter, setOverallUnitFilter] = useState("ALL");
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
    const [reasonMonthly, setReasonMonthly] = useState<ReasonMonthlyEntry[]>([]);
    const [reasonChartMonth, setReasonChartMonth] = useState<string | null>(null);
    // Shared date range for Product Analysis + Monthly Analysis
    const [analysisStartDate, setAnalysisStartDate] = useState(() => {
        const now = new Date();
        return `${now.getFullYear() - 1}-01-01`;
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
    const defectTrendAbortRef = useRef<AbortController | null>(null);

    const productStatsAbortRef = useRef<AbortController | null>(null);
    const paRawAbortRef = useRef<AbortController | null>(null);
    const reasonLogAbortRef = useRef<AbortController | null>(null);
    const monthlyStatsAbortRef = useRef<AbortController | null>(null);
    const autoDateRangeProductRef = useRef<string | null>(null);

    const isValidDateRange = useCallback((startDate: string, endDate: string) => {
        return Boolean(startDate && endDate && startDate <= endDate);
    }, []);

    const fetchJsonWithTimeout = useCallback(async (url: string, timeoutMs: number, externalSignal?: AbortSignal) => {
        const timeoutController = new AbortController();
        const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);
        const mergedSignal = externalSignal
            ? AbortSignal.any([externalSignal, timeoutController.signal])
            : timeoutController.signal;

        try {
            const res = await fetch(url, { signal: mergedSignal });
            return await res.json();
        } finally {
            clearTimeout(timeoutId);
        }
    }, []);

    // ─── Data Fetching ───────────────────────────────────────
    const applyAutoDateRangeForProduct = useCallback(async (product: string) => {
        try {
            const res = await fetch(
                `/api/product-date-range?product=${encodeURIComponent(product)}`,
            );
            const range = await res.json();
            if (range?.minDate && range?.maxDate) {
                setAnalysisStartDate(range.minDate);
                setAnalysisEndDate(range.maxDate);
            }
        } catch (e) {
            console.error(e);
        }
    }, []);

    const fetchProductList = useCallback(async (forceRefresh = false) => {
        try {
            const url = forceRefresh ? "/api/products?refresh=1" : "/api/products";
            const res = await fetch(url, forceRefresh ? { cache: 'no-store' } : undefined);
            const products = await res.json();
            if (Array.isArray(products)) setProductList(products);
        } catch (e) { console.error(e); }
    }, []);

    const fetchProductStats = useCallback(async (product: string) => {
        if (!isValidDateRange(analysisStartDate, analysisEndDate)) {
            setProductStats(null);
            setStatsLoading(false);
            return;
        }
        productStatsAbortRef.current?.abort();
        const controller = new AbortController();
        productStatsAbortRef.current = controller;
        // Clear stale stats immediately so users can see that a new range is loading.
        setProductStats(null);
        setStatsLoading(true);
        try {
            const dateParams = `&startDate=${analysisStartDate}&endDate=${analysisEndDate}`;
            const result = await fetchJsonWithTimeout(
                `/api/product-stats?product=${encodeURIComponent(product)}${dateParams}`,
                PRODUCT_STATS_TIMEOUT_MS,
                controller.signal
            );
            setProductStats(result.error ? null : result);
        } catch (e) {
            if ((e as Error).name !== "AbortError") {
                console.error(e);
                setProductStats(null);
            }
        }
        finally { setStatsLoading(false); }
    }, [analysisStartDate, analysisEndDate, isValidDateRange, fetchJsonWithTimeout]);

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
                `/api/data?startDate=${analysisStartDate}&endDate=${analysisEndDate}&product=${encodeURIComponent(product)}`,
                MONTHLY_RAW_TIMEOUT_MS,
                controller.signal,
            );
            setPaRawData(Array.isArray(result) ? result : []);
        } catch (e) {
            if ((e as Error).name !== "AbortError") {
                console.error(e);
                setPaRawData([]);
            }
        } finally {
            setPaRawLoading(false);
        }
    }, [analysisStartDate, analysisEndDate, isValidDateRange, fetchJsonWithTimeout]);

    const fetchDefectReasonList = useCallback(async () => {
        if (!isValidDateRange(analysisStartDate, analysisEndDate)) {
            setDefectReasonList([]);
            setDefectListLoading(false);
            return;
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
            });
            const result = await fetchJsonWithTimeout(
                `/api/defect-reasons?${params}`,
                MONTHLY_RAW_TIMEOUT_MS,
                controller.signal,
            );
            if (controller.signal.aborted) return;
            setDefectReasonList(Array.isArray(result) ? result : []);
        } catch (e) {
            if ((e as Error).name !== "AbortError") {
                console.error(e);
                setDefectReasonList([]);
            }
        } finally {
            if (defectListAbortRef.current === controller) {
                setDefectListLoading(false);
            }
        }
    }, [analysisStartDate, analysisEndDate, category, defectListMode, isValidDateRange, fetchJsonWithTimeout]);

    const fetchDefectTrend = useCallback(async (rsnDesc: string) => {
        if (!isValidDateRange(analysisStartDate, analysisEndDate) || !rsnDesc) {
            setDefectTrendPayload({ trend: [], jobMetrics: [], products: [], wareKilns: [] });
            setDefectTrendLoading(false);
            return;
        }
        defectTrendAbortRef.current?.abort();
        const controller = new AbortController();
        defectTrendAbortRef.current = controller;
        setDefectTrendLoading(true);
        try {
            const params = new URLSearchParams({
                startDate: analysisStartDate,
                endDate: analysisEndDate,
                category,
                rsn_desc: rsnDesc,
                mode: defectListMode,
            });
            const result = await fetchJsonWithTimeout(
                `/api/defect-trend?${params}`,
                MONTHLY_RAW_TIMEOUT_MS,
                controller.signal,
            );
            if (controller.signal.aborted) return;
            if (result && Array.isArray(result.trend)) {
                setDefectTrendPayload({
                    trend: result.trend,
                    jobMetrics: Array.isArray(result.jobMetrics) ? result.jobMetrics : [],
                    products: Array.isArray(result.products) ? result.products : [],
                    wareKilns: Array.isArray(result.wareKilns) ? result.wareKilns : [],
                });
            } else if (Array.isArray(result)) {
                setDefectTrendPayload({ trend: result, jobMetrics: [], products: [], wareKilns: [] });
            } else {
                setDefectTrendPayload({ trend: [], jobMetrics: [], products: [], wareKilns: [] });
            }
        } catch (e) {
            if ((e as Error).name !== "AbortError") {
                console.error(e);
                setDefectTrendPayload({ trend: [], jobMetrics: [], products: [], wareKilns: [] });
            }
        } finally {
            setDefectTrendLoading(false);
        }
    }, [analysisStartDate, analysisEndDate, category, defectListMode, isValidDateRange, fetchJsonWithTimeout]);

    const fetchReasonLog = useCallback(async (product: string, reason: SelectedReason) => {
        if (!isValidDateRange(analysisStartDate, analysisEndDate)) {
            setReasonLogData([]);
            setReasonMonthly([]);
            setReasonLogLoading(false);
            return;
        }
        reasonLogAbortRef.current?.abort();
        const controller = new AbortController();
        reasonLogAbortRef.current = controller;
        setReasonLogData([]);
        setReasonMonthly([]);
        setReasonLogLoading(true);
        try {
            const params = new URLSearchParams({
                product,
                startDate: analysisStartDate,
                endDate: analysisEndDate,
                rsn_desc: reason.rsn_desc,
                sub_type: reason.sub_type,
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
            if (result.error) { setReasonLogData([]); setReasonMonthly([]); }
            else { setReasonLogData(result.log || []); setReasonMonthly(result.monthly || []); }
        } catch (e) {
            if ((e as Error).name !== "AbortError") {
                console.error(e);
                setReasonLogData([]);
                setReasonMonthly([]);
            }
        }
        finally { setReasonLogLoading(false); }
    }, [analysisStartDate, analysisEndDate, isValidDateRange, fetchJsonWithTimeout]);

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
            const dateParams = `&startDate=${analysisStartDate}&endDate=${analysisEndDate}`;
            const cpParam = monthlyCpFilter !== 'ALL' ? `&m_cp=${encodeURIComponent(monthlyCpFilter)}` : '';
            const statsResult = await fetchJsonWithTimeout(
                `/api/monthly-stats?product=${encodeURIComponent(product)}${dateParams}${cpParam}`,
                MONTHLY_STATS_TIMEOUT_MS,
                controller.signal
            );
            setMonthlyStats(statsResult?.error ? null : statsResult);
            setMonthlyLoading(false);

            fetchJsonWithTimeout(
                `/api/data?startDate=${analysisStartDate}&endDate=${analysisEndDate}&product=${encodeURIComponent(product)}`,
                MONTHLY_RAW_TIMEOUT_MS,
                controller.signal
            ).then((rawResult) => {
                if (Array.isArray(rawResult)) setMonthlyRawData(rawResult);
            }).catch((error) => {
                if ((error as Error).name !== "AbortError") {
                    console.error(error);
                    setMonthlyRawData([]);
                }
            });
        } catch (e) {
            if ((e as Error).name !== "AbortError") {
                console.error(e);
                setMonthlyStats(null);
                setMonthlyRawData([]);
            }
        } finally {
            setMonthlyLoading(false);
        }
    }, [analysisStartDate, analysisEndDate, monthlyCpFilter, isValidDateRange, fetchJsonWithTimeout]);

    const fetchData = useCallback(async (date?: string) => {
        setLoading(true); setRefreshing(true);
        try {
            const url = date ? `/api/data?date=${date}` : "/api/data";
            const res = await fetch(url);
            const result = await res.json();
            if (Array.isArray(result)) {
                setData(result);
                if (result.length > 0 && !date) {
                    const latest = result[0].m_date.split("T")[0];
                    setSelectedDate(prev => prev || latest);
                }
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

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
                        await Promise.all([
                            fetchProductStats(selectedProduct),
                            fetchProductRawData(selectedProduct),
                        ]);
                    } else {
                        await fetchMonthlyStats(selectedProduct);
                    }
                }
            } finally {
                setRefreshing(false);
            }
            return;
        }
        if (view === "defect-analysis") {
            setRefreshing(true);
            try {
                await fetchDefectReasonList();
                if (selectedDefect) {
                    await fetchDefectTrend(selectedDefect);
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
        fetchDefectTrend,
        selectedDefect,
    ]);

    // ─── Effects ─────────────────────────────────────────────
    useEffect(() => {
        if (selectedDate) fetchData(selectedDate);
        else fetchData();
    }, [selectedDate, fetchData]);

    useEffect(() => {
        if (view === "product-analysis" || view === "monthly-analysis") {
            fetchProductList();
        }
    }, [view, fetchProductList]);

    useEffect(() => {
        if (view !== "defect-analysis") return;
        fetchDefectReasonList();
    }, [view, fetchDefectReasonList]);

    useEffect(() => {
        if (!selectedProduct) {
            autoDateRangeProductRef.current = null;
            return;
        }
        if (view !== "product-analysis" && view !== "monthly-analysis") return;
        if (autoDateRangeProductRef.current === selectedProduct) return;

        let cancelled = false;
        void (async () => {
            await applyAutoDateRangeForProduct(selectedProduct);
            if (!cancelled) {
                autoDateRangeProductRef.current = selectedProduct;
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [selectedProduct, view, applyAutoDateRangeForProduct]);

    useEffect(() => {
        if (!selectedProduct || view !== "product-analysis") return;
        fetchProductStats(selectedProduct);
        fetchProductRawData(selectedProduct);
    }, [selectedProduct, view, analysisStartDate, analysisEndDate, fetchProductStats, fetchProductRawData]);

    useEffect(() => {
        if (view !== "defect-analysis") return;
        setSelectedDefect((current) => {
            if (!current) return current;
            return defectReasonList.some((item) => item.value === current) ? current : "";
        });
    }, [view, defectReasonList]);

    useEffect(() => {
        if (view !== "defect-analysis" || !selectedDefect) {
            setDefectTrendPayload({ trend: [], jobMetrics: [], products: [], wareKilns: [] });
            return;
        }
        fetchDefectTrend(selectedDefect);
    }, [view, selectedDefect, fetchDefectTrend]);

    useEffect(() => {
        if (view !== "defect-analysis") return;
        setSelectedDefect("");
        setDefectTrendPayload({ trend: [], jobMetrics: [], products: [], wareKilns: [] });
    }, [view, category, defectListMode]);
    useEffect(() => { if (selectedReason && selectedProduct && view === "product-analysis") fetchReasonLog(selectedProduct, selectedReason); }, [selectedReason, selectedProduct, view, fetchReasonLog]);
    useEffect(() => { if (selectedProduct && view === "monthly-analysis") fetchMonthlyStats(selectedProduct); }, [selectedProduct, view, fetchMonthlyStats]);
    useEffect(() => {
        return () => {
            productStatsAbortRef.current?.abort();
            paRawAbortRef.current?.abort();
            reasonLogAbortRef.current?.abort();
            monthlyStatsAbortRef.current?.abort();
            defectListAbortRef.current?.abort();
            defectTrendAbortRef.current?.abort();
        };
    }, []);

    // ─── Data Processing ─────────────────────────────────────
    const filteredData = useMemo(() => {
        return data.map(item => {
            let cp = item.m_cp || '';
            if (cp === 'c') cp = 'C';
            if (cp === 'C(FRIT&BOM)' || cp === 'Cs') cp = 'C1';
            return { ...item, m_cp: cp };
        }).filter(item => {
            if (category === "WW") return item.m_part.startsWith("142");
            if (category === "DW") return item.m_part.startsWith("143");
            return true;
        });
    }, [data, category]);

    const aggregateMetrics = (items: DataItem[]) => {
        const uniqueGroups = new Map<string, { qtyp: number; qtycomp: number; qtyscrp: number; qtyrjct: number }>();
        const specialAdjustments = new Map<string, number>();

        items.forEach(item => {
            const key = `${item.m_doc}-${item.m_job}-${item.m_date}-${item.m_kiln}-${item.m_cp}`;
            if (!uniqueGroups.has(key)) {
                uniqueGroups.set(key, { qtyp: item.qtyp || 0, qtycomp: item.qtycomp || 0, qtyscrp: item.qtyscrp || 0, qtyrjct: item.qtyrjct || 0 });
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

    const filteredProducts = useMemo(() => {
        return productList.filter(p => p.searchText.toLowerCase().includes(productSearch.toLowerCase()));
    }, [productList, productSearch]);

    const filteredDefects = useMemo(() => {
        const query = defectSearch.toLowerCase().trim();
        if (!query) return defectReasonList;
        return defectReasonList.filter((item) => item.searchText.toLowerCase().includes(query));
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
            const effectiveUnit = category === 'DW' ? 'ALL' : overallUnitFilter;
            if (effectiveUnit === "WW_WHITE" && !(item.unit || '').startsWith("W5240")) return false;
            if (effectiveUnit === "WW_BLACK" && !(item.unit || '').startsWith("W5241")) return false;
            if (overallCpFilter !== "ALL") { if (getEffectiveCp(item) !== overallCpFilter) return false; }
            return true;
        });
        return aggregateMetrics(dayData);
    }, [filteredData, selectedDate, overallUnitFilter, overallCpFilter, category]);

    const weeklyMetrics = useMemo(() => {
        const weekData = filteredData.filter(item => {
            const effectiveUnit = category === 'DW' ? 'ALL' : overallUnitFilter;
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
                const effectiveUnit = category === 'DW' ? 'ALL' : overallUnitFilter;
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
            unitFilter: (category === 'DW' ? 'ALL' : overallUnitFilter) as UnitFilter,
            cpFilter: overallCpFilter,
            category,
        });
    }, [filteredData, selectedDate, overallCpFilter, overallUnitFilter, category]);

    const activityTable = useMemo(() => {
        const grouped = new Map<string, GroupedRow>();

        filteredData
            .filter(item => {
                const effectiveUnit = category === 'DW' ? 'ALL' : unitFilter;
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
                const matchesSearch = item.m_job.toLowerCase().includes(q) ||
                    item.m_part.toLowerCase().includes(q) ||
                    item.pt_desc1.toLowerCase().includes(q) ||
                    (item.m_part.startsWith('143') && (item.pt_desc2 || '').toLowerCase().includes(q));
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
            })
            .slice(0, 100);
    }, [filteredData, searchQuery, cpFilter, unitFilter, category]);

    // ─── Render ──────────────────────────────────────────────
    return (
        <div className={`flex h-screen ${theme.pageBg} ${theme.textPrimary} font-sans overflow-hidden transition-colors duration-300`}>
            {/* Sidebar Overlay for Mobile */}
            {isSidebarOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300" onClick={() => setSidebarOpen(false)} />
            )}

            <Sidebar
                theme={theme}
                view={view}
                isSidebarOpen={isSidebarOpen}
                onSetView={setView}
                onClose={() => setSidebarOpen(false)}
            />

            <main className="flex-1 flex flex-col overflow-hidden">
                <Header
                    theme={theme}
                    currentTheme={currentTheme}
                    setCurrentTheme={setCurrentTheme}
                    view={view}
                    category={category}
                    setCategory={setCategory}
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
                    overallUnitFilter={overallUnitFilter}
                    setOverallUnitFilter={setOverallUnitFilter}
                    cpOptions={cpOptions}
                    monthlyCpFilter={monthlyCpFilter}
                    setMonthlyCpFilter={setMonthlyCpFilter}
                    monthlyCpOptions={monthlyCpOptions}
                    analysisStartDate={analysisStartDate}
                    setAnalysisStartDate={setAnalysisStartDate}
                    analysisEndDate={analysisEndDate}
                    setAnalysisEndDate={setAnalysisEndDate}
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
                />

                <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-8 space-y-6 sm:space-y-8 md:space-y-10 min-h-0">
                    {(loading || (view === "product-analysis" && statsLoading && !productStats) || (view === "monthly-analysis" && monthlyLoading && !monthlyStats)) ? (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4">
                            <div className={`w-12 h-12 border-4 ${theme.badgeBorder} border-t-blue-500 rounded-full animate-spin`} />
                            <p className={`${theme.textMuted} font-medium animate-pulse`}>
                                {view === "overview" ? "Fetching latest sorting data..." :
                                    view === "monthly-analysis" ? "Aggregating monthly statistics..." :
                                        "Analyzing product data (2-year scope)..."}
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
                            isDailyMonitorFullscreen={isDailyMonitorFullscreen}
                            setIsDailyMonitorFullscreen={setIsDailyMonitorFullscreen}
                            setSelectedDailyRow={setSelectedDailyRow}
                            cpFilter={cpFilter}
                            setCpFilter={setCpFilter}
                            unitFilter={unitFilter}
                            setUnitFilter={setUnitFilter}
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            cpOptions={cpOptions}
                            overallCpFilter={overallCpFilter}
                            setOverallCpFilter={setOverallCpFilter}
                            overallUnitFilter={overallUnitFilter}
                            setOverallUnitFilter={setOverallUnitFilter}
                            setSelectedDate={setSelectedDate}
                            category={category}
                        />
                    ) : view === "product-analysis" ? (
                        <ProductAnalysisView
                            theme={theme}
                            currentTheme={currentTheme}
                            selectedProduct={selectedProduct}
                            selectedProductLabel={selectedProductLabel}
                            productStats={productStats}
                            paRawData={paRawData}
                            paRawLoading={paRawLoading}
                            showReject={showReject}
                            setShowReject={setShowReject}
                            selectedReason={selectedReason}
                            setSelectedReason={setSelectedReason}
                            reasonLogData={reasonLogData}
                            reasonLogLoading={reasonLogLoading}
                            reasonMonthly={reasonMonthly}
                            reasonChartMonth={reasonChartMonth}
                            setReasonChartMonth={setReasonChartMonth}
                            analysisStartDate={analysisStartDate}
                            setAnalysisStartDate={setAnalysisStartDate}
                            analysisEndDate={analysisEndDate}
                            setAnalysisEndDate={setAnalysisEndDate}
                        />
                    ) : view === "monthly-analysis" ? (
                        <MonthlyAnalysisView
                            theme={theme}
                            currentTheme={currentTheme}
                            selectedProduct={selectedProduct}
                            selectedProductLabel={selectedProductLabel}
                            monthlyStats={monthlyStats}
                            showMonthlyReject={showMonthlyReject}
                            setShowMonthlyReject={setShowMonthlyReject}
                            allData={monthlyRawData}
                            cpOptions={['ALL', ...monthlyCpOptions]}
                        />
                    ) : view === "defect-analysis" ? (
                        <DefectAnalysisView
                            theme={theme}
                            currentTheme={currentTheme}
                            category={category}
                            defectMode={defectListMode}
                            selectedDefect={selectedDefect}
                            selectedDefectLabel={selectedDefectLabel}
                            trendPayload={defectTrendPayload}
                            loading={defectListLoading || defectTrendLoading}
                            analysisStartDate={analysisStartDate}
                            setAnalysisStartDate={setAnalysisStartDate}
                            analysisEndDate={analysisEndDate}
                            setAnalysisEndDate={setAnalysisEndDate}
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
