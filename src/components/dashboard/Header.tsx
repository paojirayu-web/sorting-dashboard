"use client";

import { Menu, Sun, Moon, Calendar, Search, RefreshCw, AlertCircle, XCircle } from 'lucide-react';
import type { Theme, ThemeName } from '@/lib/themes';
import type { ViewType, ProductItem, DefectReasonItem, DefectListMode } from '@/types/dashboard';

interface HeaderProps {
    theme: Theme;
    currentTheme: ThemeName;
    setCurrentTheme: (t: ThemeName) => void;
    view: ViewType;
    category: string;
    setCategory: (c: string) => void;
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
    overallUnitFilter: string;
    setOverallUnitFilter: (v: string) => void;
    cpOptions: string[];
    monthlyCpFilter: string;
    setMonthlyCpFilter: (v: string) => void;
    monthlyCpOptions: string[];
    analysisStartDate: string;
    setAnalysisStartDate: (d: string) => void;
    analysisEndDate: string;
    setAnalysisEndDate: (d: string) => void;
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
}

const viewTitles: Record<ViewType, string> = {
    overview: "Overview",
    "product-analysis": "Product Analysis",
    "monthly-analysis": "Monthly Analysis",
    "defect-analysis": "Defect Analysis",
    settings: "Settings",
};

function FilterChip({
    theme,
    label,
    children,
    disabled,
}: {
    theme: Theme;
    label: string;
    children: React.ReactNode;
    disabled?: boolean;
}) {
    return (
        <div className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 ${theme.inputBg} rounded-xl border ${theme.borderColor} shrink-0 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {label ? <span className={`text-[10px] sm:text-xs font-bold ${theme.textMuted} whitespace-nowrap`}>{label}</span> : null}
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
            {isProductListOpen && filteredProducts.length > 0 && (
                <div className={`absolute top-full left-0 right-0 mt-2 max-h-[min(300px,50vh)] overflow-y-auto ${theme.cardBg} border ${theme.borderColor} rounded-xl shadow-2xl z-50 p-2`}>
                    {filteredProducts.map(item => (
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
                    ))}
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
                            <span className="inline-flex h-3 w-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin shrink-0" />
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

function CategoryToggle({
    theme,
    category,
    setCategory,
    className = '',
}: {
    theme: Theme;
    category: string;
    setCategory: (c: string) => void;
    className?: string;
}) {
    return (
        <div className={`flex items-center ${theme.inputBg} rounded-xl p-1 border ${theme.borderColor} shrink-0 ${className}`}>
            {["ALL", "WW", "DW"].map((cat) => (
                <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${category === cat ? theme.accentBg + " text-white shadow-md" : theme.textMuted + " hover:" + theme.textWhite}`}
                >
                    {cat}
                </button>
            ))}
        </div>
    );
}

function OverviewFilters({
    theme,
    currentTheme,
    category,
    overallCpFilter,
    setOverallCpFilter,
    overallUnitFilter,
    setOverallUnitFilter,
    selectedDate,
    setSelectedDate,
    cpOptions,
}: Pick<HeaderProps, 'theme' | 'currentTheme' | 'category' | 'overallCpFilter' | 'setOverallCpFilter' | 'overallUnitFilter' | 'setOverallUnitFilter' | 'selectedDate' | 'setSelectedDate' | 'cpOptions'>) {
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
            <FilterChip theme={theme} label="Unit" disabled={category === 'DW'}>
                <select
                    value={overallUnitFilter}
                    onChange={(e) => setOverallUnitFilter(e.target.value)}
                    disabled={category === 'DW'}
                    className={`bg-transparent outline-none text-[10px] sm:text-xs font-bold ${theme.textWhite} cursor-pointer max-w-[80px] sm:max-w-none`}
                    title="Select Unit"
                >
                    <option value="ALL" className={currentTheme === "dark" ? "bg-[#141414]" : "bg-white"}>ALL</option>
                    <option value="WW_WHITE" className={currentTheme === "dark" ? "bg-[#141414]" : "bg-white"}>WW(white)</option>
                    <option value="WW_BLACK" className={currentTheme === "dark" ? "bg-[#141414]" : "bg-white"}>WW(black)</option>
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

function MonthlyFilters({
    theme,
    currentTheme,
    monthlyCpFilter,
    setMonthlyCpFilter,
    monthlyCpOptions,
    analysisStartDate,
    setAnalysisStartDate,
    analysisEndDate,
    setAnalysisEndDate,
}: Pick<HeaderProps, 'theme' | 'currentTheme' | 'monthlyCpFilter' | 'setMonthlyCpFilter' | 'monthlyCpOptions' | 'analysisStartDate' | 'setAnalysisStartDate' | 'analysisEndDate' | 'setAnalysisEndDate'>) {
    return (
        <>
            <FilterChip theme={theme} label="CP">
                <select
                    value={monthlyCpFilter}
                    onChange={(e) => setMonthlyCpFilter(e.target.value)}
                    className={`bg-transparent outline-none text-[10px] sm:text-xs font-bold ${theme.textWhite} cursor-pointer`}
                    title="MA CP filter"
                >
                    <option value="ALL" className={currentTheme === "dark" ? "bg-[#141414]" : "bg-white"}>ALL</option>
                    {monthlyCpOptions.map(cp => (
                        <option key={cp} value={cp} className={currentTheme === "dark" ? "bg-[#141414]" : "bg-white"}>{cp}</option>
                    ))}
                </select>
            </FilterChip>
            <FilterChip theme={theme} label="From">
                <input
                    type="date"
                    value={analysisStartDate}
                    onChange={(e) => setAnalysisStartDate(e.target.value)}
                    style={{ colorScheme: currentTheme }}
                    className={`bg-transparent outline-none text-[10px] sm:text-xs font-bold ${theme.textWhite} cursor-pointer w-[7.5rem] sm:w-auto`}
                    title="MA Start Date"
                />
            </FilterChip>
            <FilterChip theme={theme} label="To">
                <input
                    type="date"
                    value={analysisEndDate}
                    onChange={(e) => setAnalysisEndDate(e.target.value)}
                    style={{ colorScheme: currentTheme }}
                    className={`bg-transparent outline-none text-[10px] sm:text-xs font-bold ${theme.textWhite} cursor-pointer w-[7.5rem] sm:w-auto`}
                    title="Analysis end date (synced with Product Analysis)"
                />
            </FilterChip>
        </>
    );
}

export function Header(props: HeaderProps) {
    const {
        theme,
        currentTheme,
        setCurrentTheme,
        view,
        category,
        setCategory,
        selectedDate,
        setSelectedDate,
        refreshing,
        onToggleSidebar,
        onRefresh,
        isRefreshDisabled,
        overallCpFilter,
        setOverallCpFilter,
        overallUnitFilter,
        setOverallUnitFilter,
        cpOptions,
        monthlyCpFilter,
        setMonthlyCpFilter,
        monthlyCpOptions,
        analysisStartDate,
        setAnalysisStartDate,
        analysisEndDate,
        setAnalysisEndDate,
    } = props;

    const iconBtn = `p-2 sm:p-2.5 rounded-xl ${theme.inputBg} ${theme.textSecondary} hover:${theme.textWhite} transition-all shrink-0 touch-manipulation`;

    return (
        <header className={`sticky top-0 z-40 ${theme.headerBg} backdrop-blur-xl border-b ${theme.borderColor}`}>
            <div className="flex items-center justify-between gap-2 px-3 sm:px-4 md:px-6 h-14 md:h-16 min-w-0">
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
                    {(view === "overview" || view === "defect-analysis") && (
                        <CategoryToggle
                            theme={theme}
                            category={category}
                            setCategory={setCategory}
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
                                category={category}
                                overallCpFilter={overallCpFilter}
                                setOverallCpFilter={setOverallCpFilter}
                                overallUnitFilter={overallUnitFilter}
                                setOverallUnitFilter={setOverallUnitFilter}
                                selectedDate={selectedDate}
                                setSelectedDate={setSelectedDate}
                                cpOptions={cpOptions}
                            />
                        </div>
                    )}
                    {view === "monthly-analysis" && (
                        <div className="hidden lg:flex items-center gap-2">
                            <MonthlyFilters
                                theme={theme}
                                currentTheme={currentTheme}
                                monthlyCpFilter={monthlyCpFilter}
                                setMonthlyCpFilter={setMonthlyCpFilter}
                                monthlyCpOptions={monthlyCpOptions}
                                analysisStartDate={analysisStartDate}
                                setAnalysisStartDate={setAnalysisStartDate}
                                analysisEndDate={analysisEndDate}
                                setAnalysisEndDate={setAnalysisEndDate}
                            />
                        </div>
                    )}
                    <button
                        onClick={onRefresh}
                        disabled={isRefreshDisabled}
                        className={`${iconBtn} ${isRefreshDisabled ? "animate-spin" : ""}`}
                        title="Refresh Data"
                        aria-label="Refresh data"
                    >
                        <RefreshCw size={18} className={isRefreshDisabled ? "text-blue-500" : ""} />
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

            {view === "overview" && (
                <div className={`lg:hidden border-t ${theme.borderColor} px-3 sm:px-4 pb-3 pt-2 space-y-2`}>
                    <CategoryToggle theme={theme} category={category} setCategory={setCategory} className="w-full justify-center" />
                    <div className="flex items-center gap-2 overflow-x-auto pb-0.5 -mx-1 px-1">
                        <OverviewFilters
                            theme={theme}
                            currentTheme={currentTheme}
                            category={category}
                            overallCpFilter={overallCpFilter}
                            setOverallCpFilter={setOverallCpFilter}
                            overallUnitFilter={overallUnitFilter}
                            setOverallUnitFilter={setOverallUnitFilter}
                            selectedDate={selectedDate}
                            setSelectedDate={setSelectedDate}
                            cpOptions={cpOptions}
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
                    <CategoryToggle theme={theme} category={category} setCategory={setCategory} className="w-full justify-center" />
                    <DefectModeToggle
                        theme={theme}
                        defectListMode={props.defectListMode}
                        setDefectListMode={props.setDefectListMode}
                        className="w-full justify-center"
                    />
                    <DefectSearch {...props} />
                </div>
            )}

            {view === "monthly-analysis" && (
                <div className={`lg:hidden border-t ${theme.borderColor} px-3 sm:px-4 pb-3 pt-2`}>
                    <div className="flex items-center gap-2 overflow-x-auto pb-0.5 -mx-1 px-1">
                        <MonthlyFilters
                            theme={theme}
                            currentTheme={currentTheme}
                            monthlyCpFilter={monthlyCpFilter}
                            setMonthlyCpFilter={setMonthlyCpFilter}
                            monthlyCpOptions={monthlyCpOptions}
                            analysisStartDate={analysisStartDate}
                            setAnalysisStartDate={setAnalysisStartDate}
                            analysisEndDate={analysisEndDate}
                            setAnalysisEndDate={setAnalysisEndDate}
                        />
                    </div>
                </div>
            )}
        </header>
    );
}
