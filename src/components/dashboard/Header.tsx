"use client";

import type { ReactNode } from 'react';
import { Menu, Sun, Moon, Calendar, Search, RefreshCw, AlertCircle, XCircle, Flame, Shapes, Layers, Users, Droplet } from 'lucide-react';
import type { Theme, ThemeName } from '@/lib/themes';
import type { ViewType, ProductItem, DefectReasonItem, DefectListMode } from '@/types/dashboard';
import {
    DW_KIND_OPTIONS,
    LINE_FAMILY_OPTIONS,
    WW_TONE_OPTIONS,
    type DwKind,
    type LineFamily,
    type WwTone,
} from '@/lib/sort-source';
import {
    QTYPROC_DISPLAY_BE_YEARS,
    QTYPROC_GLAZE_TYPES,
    QTYPROC_PAGE_TITLE,
    QTYPROC_P_ROUNDS,
    QTYPROC_SCOPE_OPTIONS,
    GLAZE_LABEL,
    SHAPE_LABEL,
    type QtyProcCpFilter,
    type QtyProcLineFilter,
    type QtyProcScope,
    type QtyProcYearFilter,
} from '@/lib/qtyproc';

interface HeaderProps {
    theme: Theme;
    currentTheme: ThemeName;
    setCurrentTheme: (t: ThemeName) => void;
    view: ViewType;
    lineFamily: LineFamily;
    setLineFamily: (v: LineFamily) => void;
    wwTone: WwTone;
    setWwTone: (v: WwTone) => void;
    dwKind: DwKind;
    setDwKind: (v: DwKind) => void;
    selectedDate: string;
    setSelectedDate: (d: string) => void;
    refreshing: boolean;
    onToggleSidebar: () => void;
    onRefresh: () => void;
    isRefreshDisabled: boolean;
    selectedProduct: string;
    selectedProductLabel: string;
    productSearch: string;
    setProductSearch: (v: string) => void;
    isProductListOpen: boolean;
    setIsProductListOpen: (v: boolean) => void;
    filteredProducts: ProductItem[];
    setSelectedProduct: (v: string) => void;
    overallCpFilter: string;
    setOverallCpFilter: (v: string) => void;
    cpOptions: string[];
    defectSearch: string;
    setDefectSearch: (v: string) => void;
    isDefectListOpen: boolean;
    setIsDefectListOpen: (v: boolean) => void;
    filteredDefects: DefectReasonItem[];
    selectedDefect: string;
    selectedDefectLabel: string;
    setSelectedDefect: (v: string) => void;
    defectListMode: DefectListMode;
    setDefectListMode: (m: DefectListMode) => void;
    defectListLoading: boolean;
    defectReasonCount: number;
    qtyProcYear: QtyProcYearFilter;
    setQtyProcYear: (v: QtyProcYearFilter) => void;
    qtyProcLine: QtyProcLineFilter;
    setQtyProcLine: (v: QtyProcLineFilter) => void;
    qtyProcCp: QtyProcCpFilter;
    setQtyProcCp: (v: QtyProcCpFilter) => void;
    qtyProcScope: QtyProcScope;
    setQtyProcScope: (v: QtyProcScope) => void;
    qtyProcShape: string;
    setQtyProcShape: (v: string) => void;
    qtyProcForming: string;
    setQtyProcForming: (v: string) => void;
    qtyProcCustomer: string;
    setQtyProcCustomer: (v: string) => void;
    qtyProcGlaze: string;
    setQtyProcGlaze: (v: string) => void;
    qtyProcShapeKeys: string[];
    qtyProcFormingKeys: string[];
    qtyProcCustomerKeys: string[];
}

const viewTitles: Record<ViewType, string> = {
    overview: "Overview",
    "product-analysis": "Product Analysis",
    "monthly-analysis": "Monthly Analysis",
    "qty-process": QTYPROC_PAGE_TITLE,
    "defect-analysis": QTYPROC_PAGE_TITLE,
    settings: "Settings",
};

function FilterChip({
    theme,
    label,
    icon,
    children,
    disabled,
    fill,
}: {
    theme: Theme;
    label: string;
    icon?: ReactNode;
    children: ReactNode;
    disabled?: boolean;
    fill?: boolean;
}) {
    return (
        <div
            className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 sm:py-2 ${theme.inputBg} rounded-xl border ${theme.borderColor} ${fill ? 'min-w-0 flex-1' : 'shrink-0'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            {icon ? <span className={`${theme.textMuted} shrink-0`}>{icon}</span> : null}
            {label ? <span className={`text-[10px] sm:text-xs font-bold ${theme.textMuted} whitespace-nowrap shrink-0`}>{label}</span> : null}
            {children}
        </div>
    );
}

function ProductSearch({
    theme,
    view,
    selectedProduct,
    selectedProductLabel,
    productSearch,
    setProductSearch,
    isProductListOpen,
    setIsProductListOpen,
    filteredProducts,
    setSelectedProduct,
}: Pick<HeaderProps, 'theme' | 'view' | 'selectedProduct' | 'selectedProductLabel' | 'productSearch' | 'setProductSearch' | 'isProductListOpen' | 'setIsProductListOpen' | 'filteredProducts' | 'setSelectedProduct'>) {
    if (view !== 'product-analysis' && view !== 'monthly-analysis') return null;

    return (
        <div className="relative w-full min-w-0">
            <div
                className={`flex items-center gap-2 px-3 py-2 ${theme.inputBg} rounded-xl border ${theme.borderColor} cursor-pointer`}
                onClick={() => setIsProductListOpen(!isProductListOpen)}
            >
                <Search size={16} className={`${theme.textMuted} shrink-0`} />
                <input
                    type="text"
                    placeholder="Search product..."
                    title="Search Product"
                    value={isProductListOpen ? productSearch : selectedProductLabel}
                    onChange={(e) => {
                        setProductSearch(e.target.value);
                        if (!isProductListOpen) setIsProductListOpen(true);
                    }}
                    onFocus={() => {
                        setProductSearch("");
                        setIsProductListOpen(true);
                    }}
                    className={`bg-transparent border-none outline-none text-xs sm:text-sm font-bold ${theme.textWhite} w-full min-w-0`}
                />
            </div>
            {isProductListOpen && (
                <div className={`absolute top-full left-0 right-0 mt-2 max-h-[min(300px,50vh)] overflow-y-auto ${theme.cardBg} border ${theme.borderColor} rounded-xl shadow-2xl z-50 p-2`}>
                    {filteredProducts.length > 0 ? (
                        filteredProducts.map(item => (
                            <button
                                key={item.value}
                                onClick={() => {
                                    setSelectedProduct(item.value);
                                    setIsProductListOpen(false);
                                    setProductSearch("");
                                }}
                                className={`w-full text-left px-3 sm:px-4 py-2.5 rounded-lg text-xs sm:text-sm transition-all ${selectedProduct === item.value ? `${theme.accentBg} text-white` : `${theme.textSecondary} hover:${theme.tableRowHover}`}`}
                            >
                                {item.label}
                            </button>
                        ))
                    ) : (
                        <div className={`px-3 py-6 text-center text-xs ${theme.textMuted}`}>
                            No products in this category.
                        </div>
                    )}
                </div>
            )}
            {isProductListOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setIsProductListOpen(false)} />
            )}
        </div>
    );
}

function DefectModeToggle({
    theme,
    defectListMode,
    setDefectListMode,
    className = '',
}: {
    theme: Theme;
    defectListMode: DefectListMode;
    setDefectListMode: (m: DefectListMode) => void;
    className?: string;
}) {
    return (
        <div className={`flex items-center ${theme.inputBg} rounded-xl p-1 border ${theme.borderColor} shrink-0 ${className}`}>
            <button
                type="button"
                onClick={() => setDefectListMode('scrap')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${defectListMode === 'scrap'
                    ? 'bg-red-500 text-white shadow-md'
                    : theme.textMuted + ' hover:' + theme.textWhite}`}
            >
                <AlertCircle size={14} />
                Scrap
            </button>
            <button
                type="button"
                onClick={() => setDefectListMode('reject')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${defectListMode === 'reject'
                    ? 'bg-orange-500 text-white shadow-md'
                    : theme.textMuted + ' hover:' + theme.textWhite}`}
            >
                <XCircle size={14} />
                Reject
            </button>
        </div>
    );
}

function DefectSearch({
    theme,
    view,
    selectedDefect,
    selectedDefectLabel,
    defectSearch,
    setDefectSearch,
    isDefectListOpen,
    setIsDefectListOpen,
    filteredDefects,
    setSelectedDefect,
    defectListMode,
    defectListLoading,
    defectReasonCount,
}: Pick<HeaderProps, 'theme' | 'view' | 'selectedDefect' | 'selectedDefectLabel' | 'defectSearch' | 'setDefectSearch' | 'isDefectListOpen' | 'setIsDefectListOpen' | 'filteredDefects' | 'setSelectedDefect' | 'defectListMode' | 'defectListLoading' | 'defectReasonCount'>) {
    if (view !== 'defect-analysis') return null;

    const modeLabel = defectListMode === 'scrap' ? 'Scrap' : 'Reject';
    const openList = () => setIsDefectListOpen(true);

    return (
        <div className="relative w-full min-w-0">
            <div
                className={`flex items-center gap-2 px-3 py-2 ${theme.inputBg} rounded-xl border ${theme.borderColor} cursor-text`}
                onClick={() => {
                    if (!isDefectListOpen) openList();
                }}
            >
                <Search size={16} className={`${theme.textMuted} shrink-0`} />
                <input
                    type="text"
                    placeholder={`Search rsn_desc (${modeLabel})...`}
                    title="Search rsn_desc"
                    value={isDefectListOpen ? defectSearch : selectedDefectLabel}
                    onChange={(e) => {
                        setDefectSearch(e.target.value);
                        openList();
                    }}
                    onFocus={() => {
                        setDefectSearch("");
                        openList();
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    className={`bg-transparent border-none outline-none text-xs sm:text-sm font-bold ${theme.textWhite} w-full min-w-0`}
                />
            </div>
            {isDefectListOpen && (
                <div className={`absolute top-full left-0 right-0 mt-2 max-h-[min(300px,50vh)] overflow-y-auto ${theme.cardBg} border ${theme.borderColor} rounded-xl shadow-2xl z-50`}>
                    <div className={`sticky top-0 px-3 py-2 border-b ${theme.borderColor} ${theme.inputBg} flex items-center justify-between gap-2`}>
                        <span className={`text-[10px] font-bold ${theme.textMuted}`}>
                            {defectListLoading
                                ? 'Loading rsn_desc...'
                                : `${filteredDefects.length.toLocaleString()} of ${defectReasonCount.toLocaleString()} ${modeLabel.toLowerCase()} defects`}
                        </span>
                        {defectListLoading && (
                            <span className="inline-flex h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin shrink-0 skin-accent-text" />
                        )}
                    </div>
                    {defectListLoading && filteredDefects.length === 0 ? (
                        <div className={`px-4 py-6 text-center text-xs ${theme.textMuted}`}>
                            Fetching defect list — this may take a few seconds...
                        </div>
                    ) : filteredDefects.length > 0 ? (
                        <div className="p-2">
                            {filteredDefects.slice(0, 150).map((item) => (
                                <button
                                    key={item.value}
                                    type="button"
                                    onClick={() => {
                                        setSelectedDefect(item.value);
                                        setIsDefectListOpen(false);
                                        setDefectSearch("");
                                    }}
                                    className={`w-full text-left px-3 sm:px-4 py-2.5 rounded-lg text-xs sm:text-sm transition-all ${selectedDefect === item.value ? `${theme.accentBg} text-white` : `${theme.textSecondary} hover:${theme.tableRowHover}`}`}
                                >
                                    <span className="block font-medium">{item.label}</span>
                                    <span className={`block text-[10px] mt-0.5 ${selectedDefect === item.value ? 'text-white/80' : theme.textMuted}`}>
                                        {modeLabel} {item.qty.toLocaleString()}
                                    </span>
                                </button>
                            ))}
                            {filteredDefects.length > 150 && (
                                <p className={`px-3 py-2 text-[10px] ${theme.textMuted}`}>
                                    Type to narrow results ({filteredDefects.length - 150} more hidden)
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className={`px-4 py-6 text-center text-xs ${theme.textMuted}`}>
                            No {modeLabel.toLowerCase()} defects found for this category and date range.
                        </div>
                    )}
                </div>
            )}
            {isDefectListOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setIsDefectListOpen(false)} />
            )}
        </div>
    );
}

function SegmentedPills<T extends string>({
    theme,
    value,
    onChange,
    options,
    className = '',
}: {
    theme: Theme;
    value: T;
    onChange: (v: T) => void;
    options: { value: T; label: string }[];
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
                        style={active ? { backgroundColor: 'var(--skin-accent, #2563eb)' } : undefined}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}

function QtyProcScopeSwitch({
    theme,
    value,
    onChange,
}: {
    theme: Theme;
    value: QtyProcScope;
    onChange: (v: QtyProcScope) => void;
}) {
    return (
        <div
            className={`flex items-center ${theme.inputBg} rounded-xl p-1 border ${theme.borderColor} shrink-0`}
            role="group"
            aria-label="First fire or all firings"
            title="FF = first fire. All includes P1–P5."
        >
            {QTYPROC_SCOPE_OPTIONS.map((opt) => {
                const active = value === opt.value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange(opt.value)}
                        className={`min-w-[2.75rem] px-2.5 py-1.5 rounded-lg text-xs font-bold leading-tight transition-colors ${
                            active ? 'text-white shadow-md' : `${theme.textMuted} hover:${theme.textWhite}`
                        }`}
                        style={active ? { backgroundColor: 'var(--skin-accent, #2563eb)' } : undefined}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}

function CategoryToggle({
    theme,
    lineFamily,
    setLineFamily,
    wwTone,
    setWwTone,
    dwKind,
    setDwKind,
    className = '',
}: {
    theme: Theme;
    lineFamily: LineFamily;
    setLineFamily: (v: LineFamily) => void;
    wwTone: WwTone;
    setWwTone: (v: WwTone) => void;
    dwKind: DwKind;
    setDwKind: (v: DwKind) => void;
    className?: string;
}) {
    return (
        <div className={`flex flex-col lg:flex-row items-stretch lg:items-center gap-1 min-w-0 ${className}`}>
            <SegmentedPills
                theme={theme}
                value={lineFamily}
                onChange={setLineFamily}
                options={LINE_FAMILY_OPTIONS}
            />
            {lineFamily === 'WW' && (
                <SegmentedPills
                    theme={theme}
                    value={wwTone}
                    onChange={setWwTone}
                    options={WW_TONE_OPTIONS}
                    className="dash-subfade"
                />
            )}
            {lineFamily === 'DW' && (
                <SegmentedPills
                    theme={theme}
                    value={dwKind}
                    onChange={setDwKind}
                    options={DW_KIND_OPTIONS}
                    className="dash-subfade"
                />
            )}
        </div>
    );
}

function OverviewFilters({
    theme,
    currentTheme,
    overallCpFilter,
    setOverallCpFilter,
    selectedDate,
    setSelectedDate,
    cpOptions,
}: Pick<HeaderProps, 'theme' | 'currentTheme' | 'overallCpFilter' | 'setOverallCpFilter' | 'selectedDate' | 'setSelectedDate' | 'cpOptions'>) {
    return (
        <>
            <FilterChip theme={theme} label="CP">
                <select
                    value={overallCpFilter}
                    onChange={(e) => setOverallCpFilter(e.target.value)}
                    className={`bg-transparent outline-none text-[10px] sm:text-xs font-bold ${theme.textWhite} cursor-pointer max-w-[72px] sm:max-w-none`}
                    title="Select CP"
                >
                    {cpOptions.map(cp => <option key={cp} value={cp} className={currentTheme === "dark" ? "bg-[#141414]" : "bg-white"}>{cp}</option>)}
                </select>
            </FilterChip>
            <FilterChip theme={theme} label="">
                <Calendar size={16} className={`${theme.textMuted} shrink-0`} />
                <input
                    type="date"
                    title="Select Date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    style={{ colorScheme: currentTheme }}
                    className={`bg-transparent outline-none text-[10px] sm:text-sm font-bold ${theme.textWhite} cursor-pointer min-w-0`}
                />
            </FilterChip>
        </>
    );
}

function qtyProcToneValue(line: QtyProcLineFilter): WwTone {
    if (line === 'WHITE') return 'WW_WHITE';
    if (line === 'BLACK') return 'WW_BLACK';
    return 'ALL';
}

function qtyProcLineFromTone(tone: WwTone): QtyProcLineFilter {
    if (tone === 'WW_WHITE') return 'WHITE';
    if (tone === 'WW_BLACK') return 'BLACK';
    return 'all';
}

function QtyProcessFilters({
    theme,
    currentTheme,
    year,
    setYear,
    cp,
    setCp,
    scope,
    shape,
    setShape,
    forming,
    setForming,
    customer,
    setCustomer,
    glaze,
    setGlaze,
    shapeKeys,
    formingKeys,
    customerKeys,
}: {
    theme: Theme;
    currentTheme: ThemeName;
    year: QtyProcYearFilter;
    setYear: (v: QtyProcYearFilter) => void;
    cp: QtyProcCpFilter;
    setCp: (v: QtyProcCpFilter) => void;
    scope: QtyProcScope;
    shape: string;
    setShape: (v: string) => void;
    forming: string;
    setForming: (v: string) => void;
    customer: string;
    setCustomer: (v: string) => void;
    glaze: string;
    setGlaze: (v: string) => void;
    shapeKeys: string[];
    formingKeys: string[];
    customerKeys: string[];
}) {
    const optionClass = currentTheme === 'dark' ? 'bg-[#141414]' : 'bg-white';
    const selectClass = `bg-transparent outline-none text-[10px] sm:text-xs font-bold ${theme.textWhite} cursor-pointer min-w-0 w-full`;
    const includeP = scope === 'all';
    return (
        <div className="flex items-stretch gap-1.5 w-full min-w-0">
            <FilterChip fill theme={theme} label="Year" icon={<Calendar size={14} />}>
                <select
                    value={year === 'all' ? 'all' : String(year)}
                    onChange={(e) => setYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className={selectClass}
                    title="Year"
                >
                    <option value="all" className={optionClass}>All</option>
                    {QTYPROC_DISPLAY_BE_YEARS.map((y) => (
                        <option key={y} value={y} className={optionClass}>{y}</option>
                    ))}
                </select>
            </FilterChip>
            <FilterChip fill theme={theme} label="Firing" icon={<Flame size={14} />}>
                <select
                    value={cp}
                    onChange={(e) => setCp(e.target.value as QtyProcCpFilter)}
                    className={selectClass}
                    title="Firing type"
                >
                    <option value="all" className={optionClass}>All</option>
                    <option value="C" className={optionClass}>Standard (C)</option>
                    <option value="FRIT" className={optionClass}>FRIT</option>
                    <option value="BOM" className={optionClass}>BOM</option>
                    <option value="C1" className={optionClass}>Custom (FRIT+BOM)</option>
                    {includeP && QTYPROC_P_ROUNDS.map((round) => (
                        <option key={round} value={round} className={optionClass}>{round}</option>
                    ))}
                </select>
            </FilterChip>
            <FilterChip fill theme={theme} label="Shape" icon={<Shapes size={14} />}>
                <select
                    value={shape}
                    onChange={(e) => setShape(e.target.value)}
                    className={selectClass}
                    title="Shape"
                >
                    <option value="all" className={optionClass}>All</option>
                    {shapeKeys.map((k) => (
                        <option key={k} value={k} className={optionClass}>{SHAPE_LABEL[k] || k}</option>
                    ))}
                </select>
            </FilterChip>
            <FilterChip fill theme={theme} label="Forming" icon={<Layers size={14} />}>
                <select
                    value={forming}
                    onChange={(e) => setForming(e.target.value)}
                    className={selectClass}
                    title="Forming"
                >
                    <option value="all" className={optionClass}>All</option>
                    {formingKeys.map((k) => (
                        <option key={k} value={k} className={optionClass}>{k}</option>
                    ))}
                </select>
            </FilterChip>
            <FilterChip fill theme={theme} label="Glaze" icon={<Droplet size={14} />}>
                <select
                    value={glaze}
                    onChange={(e) => setGlaze(e.target.value)}
                    className={selectClass}
                    title="Glaze (first letter of glaze code)"
                >
                    <option value="all" className={optionClass}>All</option>
                    {QTYPROC_GLAZE_TYPES.map((k) => (
                        <option key={k} value={k} className={optionClass}>{GLAZE_LABEL[k]}</option>
                    ))}
                </select>
            </FilterChip>
            <FilterChip fill theme={theme} label="Customer" icon={<Users size={14} />}>
                <select
                    value={customer}
                    onChange={(e) => setCustomer(e.target.value)}
                    className={selectClass}
                    title="Customer (pt_desc2)"
                >
                    <option value="all" className={optionClass}>All</option>
                    {customerKeys.map((k) => (
                        <option key={k} value={k} className={optionClass}>{k}</option>
                    ))}
                </select>
            </FilterChip>
        </div>
    );
}

export function Header(props: HeaderProps) {
    const {
        theme,
        currentTheme,
        setCurrentTheme,
        view,
        lineFamily,
        setLineFamily,
        wwTone,
        setWwTone,
        dwKind,
        setDwKind,
        selectedDate,
        setSelectedDate,
        refreshing,
        onToggleSidebar,
        onRefresh,
        isRefreshDisabled,
        overallCpFilter,
        setOverallCpFilter,
        cpOptions,
    } = props;

    const iconBtn = `p-2 sm:p-2.5 rounded-xl ${theme.inputBg} ${theme.textSecondary} hover:${theme.textWhite} transition-all shrink-0 touch-manipulation`;

    return (
        <header className={`sticky top-0 z-40 ${theme.headerBg} backdrop-blur-xl border-b ${theme.borderColor}`}>
            <div className="flex items-center justify-between gap-2 px-3 sm:px-4 md:px-6 min-h-14 md:min-h-16 py-2 min-w-0">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <button
                        onClick={onToggleSidebar}
                        className={iconBtn}
                        title="Toggle Sidebar"
                        aria-label="Toggle sidebar"
                    >
                        <Menu size={20} />
                    </button>
                    <h1 className={`text-sm sm:text-base md:text-lg font-bold ${theme.textWhite} tracking-tight truncate flex items-center gap-2 min-w-0`}>
                        <span className="truncate">{viewTitles[view]}</span>
                        {refreshing && (
                            <span className="inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                        )}
                    </h1>
                    {view === "qty-process" && (
                        <SegmentedPills
                            theme={theme}
                            value={qtyProcToneValue(props.qtyProcLine)}
                            onChange={(v) => props.setQtyProcLine(qtyProcLineFromTone(v))}
                            options={WW_TONE_OPTIONS}
                            className="hidden lg:flex"
                        />
                    )}
                    {view !== "qty-process" && (
                    <CategoryToggle
                        theme={theme}
                        lineFamily={lineFamily}
                        setLineFamily={setLineFamily}
                        wwTone={wwTone}
                        setWwTone={setWwTone}
                        dwKind={dwKind}
                        setDwKind={setDwKind}
                        className="hidden lg:flex"
                    />
                    )}
                    {(view === "product-analysis" || view === "monthly-analysis") && (
                        <div className="hidden md:block flex-1 max-w-md min-w-0 ml-2">
                            <ProductSearch {...props} />
                        </div>
                    )}
                    {view === "defect-analysis" && (
                        <div className="hidden md:flex items-center gap-2 flex-1 min-w-0 ml-2">
                            <DefectModeToggle
                                theme={theme}
                                defectListMode={props.defectListMode}
                                setDefectListMode={props.setDefectListMode}
                            />
                            <div className="flex-1 min-w-0 max-w-md">
                                <DefectSearch {...props} />
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    {view === "overview" && (
                        <div className="hidden lg:flex items-center gap-2">
                            <OverviewFilters
                                theme={theme}
                                currentTheme={currentTheme}
                                overallCpFilter={overallCpFilter}
                                setOverallCpFilter={setOverallCpFilter}
                                selectedDate={selectedDate}
                                setSelectedDate={setSelectedDate}
                                cpOptions={cpOptions}
                            />
                        </div>
                    )}
                    {view === "qty-process" && (
                        <QtyProcScopeSwitch
                            theme={theme}
                            value={props.qtyProcScope}
                            onChange={props.setQtyProcScope}
                        />
                    )}
                    <button
                        onClick={onRefresh}
                        disabled={isRefreshDisabled}
                        className={`${iconBtn} ${isRefreshDisabled ? "animate-spin" : ""}`}
                        title="Refresh Data"
                        aria-label="Refresh data"
                    >
                        <RefreshCw size={18} className={isRefreshDisabled ? "skin-accent-text" : ""} />
                    </button>
                    <button
                        onClick={() => setCurrentTheme(currentTheme === "dark" ? "light" : "dark")}
                        className={iconBtn}
                        title="Toggle Theme"
                        aria-label="Toggle theme"
                    >
                        {currentTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                </div>
            </div>

            {(view === "qty-process" || view === "defect-analysis") && (
                <div className={`hidden lg:flex items-center w-full min-w-0 px-3 sm:px-4 md:px-6 py-2 border-t ${theme.borderColor}`}>
                    <QtyProcessFilters
                        theme={theme}
                        currentTheme={currentTheme}
                        year={props.qtyProcYear}
                        setYear={props.setQtyProcYear}
                        cp={props.qtyProcCp}
                        setCp={props.setQtyProcCp}
                        scope={props.qtyProcScope}
                        shape={props.qtyProcShape}
                        setShape={props.setQtyProcShape}
                        forming={props.qtyProcForming}
                        setForming={props.setQtyProcForming}
                        customer={props.qtyProcCustomer}
                        setCustomer={props.setQtyProcCustomer}
                        glaze={props.qtyProcGlaze}
                        setGlaze={props.setQtyProcGlaze}
                        shapeKeys={props.qtyProcShapeKeys}
                        formingKeys={props.qtyProcFormingKeys}
                        customerKeys={props.qtyProcCustomerKeys}
                    />
                </div>
            )}

            {view === "qty-process" && (
            <div className={`lg:hidden border-t ${theme.borderColor} px-3 sm:px-4 pt-2 pb-2`}>
                <SegmentedPills
                    theme={theme}
                    value={qtyProcToneValue(props.qtyProcLine)}
                    onChange={(v) => props.setQtyProcLine(qtyProcLineFromTone(v))}
                    options={WW_TONE_OPTIONS}
                    className="w-full"
                />
            </div>
            )}

            {view !== "qty-process" && (
            <div className={`lg:hidden border-t ${theme.borderColor} px-3 sm:px-4 pt-2 pb-2`}>
                <CategoryToggle
                    theme={theme}
                    lineFamily={lineFamily}
                    setLineFamily={setLineFamily}
                    wwTone={wwTone}
                    setWwTone={setWwTone}
                    dwKind={dwKind}
                    setDwKind={setDwKind}
                    className="w-full"
                />
            </div>
            )}

            {view === "overview" && (
                <div className={`lg:hidden border-t ${theme.borderColor} px-3 sm:px-4 pb-3 pt-2`}>
                    <div className="flex items-center gap-2 overflow-x-auto pb-0.5 -mx-1 px-1">
                        <OverviewFilters
                            theme={theme}
                            currentTheme={currentTheme}
                            overallCpFilter={overallCpFilter}
                            setOverallCpFilter={setOverallCpFilter}
                            selectedDate={selectedDate}
                            setSelectedDate={setSelectedDate}
                            cpOptions={cpOptions}
                        />
                    </div>
                </div>
            )}

            {(view === "qty-process" || view === "defect-analysis") && (
                <div className={`lg:hidden border-t ${theme.borderColor} px-3 sm:px-4 pb-3 pt-2`}>
                    <div className="flex items-center w-full min-w-0">
                        <QtyProcessFilters
                            theme={theme}
                            currentTheme={currentTheme}
                            year={props.qtyProcYear}
                            setYear={props.setQtyProcYear}
                            cp={props.qtyProcCp}
                            setCp={props.setQtyProcCp}
                            scope={props.qtyProcScope}
                            shape={props.qtyProcShape}
                            setShape={props.setQtyProcShape}
                            forming={props.qtyProcForming}
                            setForming={props.setQtyProcForming}
                            customer={props.qtyProcCustomer}
                            setCustomer={props.setQtyProcCustomer}
                            glaze={props.qtyProcGlaze}
                            setGlaze={props.setQtyProcGlaze}
                            shapeKeys={props.qtyProcShapeKeys}
                            formingKeys={props.qtyProcFormingKeys}
                            customerKeys={props.qtyProcCustomerKeys}
                        />
                    </div>
                </div>
            )}

            {(view === "product-analysis" || view === "monthly-analysis") && (
                <div className={`md:hidden border-t ${theme.borderColor} px-3 sm:px-4 pb-3 pt-2`}>
                    <ProductSearch {...props} />
                </div>
            )}

            {view === "defect-analysis" && (
                <div className={`md:hidden border-t ${theme.borderColor} px-3 sm:px-4 pb-3 pt-2 space-y-2`}>
                    <DefectModeToggle
                        theme={theme}
                        defectListMode={props.defectListMode}
                        setDefectListMode={props.setDefectListMode}
                        className="w-full justify-center"
                    />
                    <DefectSearch {...props} />
                </div>
            )}
        </header>
    );
}
