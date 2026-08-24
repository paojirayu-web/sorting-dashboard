"use client";

import { LayoutDashboard, BarChart3, Settings, TrendingUp, LineChart, X, ChevronLeft } from 'lucide-react';
import type { Theme } from '@/lib/themes';
import type { ViewType } from '@/types/dashboard';

interface SidebarProps {
    theme: Theme;
    view: ViewType;
    isSidebarOpen: boolean;
    onSetView: (view: ViewType) => void;
    onClose: () => void;
}

export function Sidebar({ theme, view, isSidebarOpen, onSetView, onClose }: SidebarProps) {
    const handleNav = (targetView: ViewType) => {
        onSetView(targetView);
        if (window.innerWidth < 768) onClose();
    };

    return (
        <aside className={`fixed inset-y-0 left-0 z-50 ${theme.sidebarBg} border-r ${theme.borderColor} flex flex-col transition-all duration-300 transform ${isSidebarOpen ? "translate-x-0 w-64 max-w-[85vw]" : "-translate-x-full w-64 md:translate-x-0 md:w-20"} md:relative`}>
            <div className="p-4 sm:p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${theme.accentBg} rounded-xl flex items-center justify-center shadow-lg ${theme.accentShadow}`}>
                        <LayoutDashboard size={24} className="text-white" />
                    </div>
                    {isSidebarOpen && (
                        <span className={`text-xl font-bold tracking-tight ${theme.textWhite}`}>
                            Sorting<span className={theme.accentText}>DB</span>
                        </span>
                    )}
                </div>
                {isSidebarOpen && (
                    <button onClick={onClose} className="p-2 md:hidden" title="Close Sidebar">
                        <X size={20} className={theme.textSecondary} />
                    </button>
                )}
            </div>

            <nav className="flex-1 px-4 mt-4 space-y-2">
                <button
                    onClick={() => handleNav("overview")}
                    className={`w-full flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 rounded-xl transition-all touch-manipulation ${view === "overview" ? `${theme.accentBg} text-white shadow-lg ${theme.accentShadow}` : `${theme.textSecondary} hover:${theme.tableRowHover}`}`}
                    title="Overview"
                >
                    <LayoutDashboard size={20} />
                    {isSidebarOpen && <span className={view === "overview" ? "font-semibold" : "font-medium"}>Overview</span>}
                </button>
                <button
                    onClick={() => handleNav("product-analysis")}
                    className={`w-full flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 rounded-xl transition-all touch-manipulation ${view === "product-analysis" ? `${theme.accentBg} text-white shadow-lg ${theme.accentShadow}` : `${theme.textSecondary} hover:${theme.tableRowHover}`}`}
                    title="Product Analysis"
                >
                    <BarChart3 size={20} />
                    {isSidebarOpen && <span className={view === "product-analysis" ? "font-semibold" : "font-medium"}>Product Analysis</span>}
                </button>
                <button
                    onClick={() => handleNav("monthly-analysis")}
                    className={`w-full flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 rounded-xl transition-all touch-manipulation ${view === "monthly-analysis" ? `${theme.accentBg} text-white shadow-lg ${theme.accentShadow}` : `${theme.textSecondary} hover:${theme.tableRowHover}`}`}
                    title="Monthly Analysis"
                >
                    <TrendingUp size={20} />
                    {isSidebarOpen && <span className={view === "monthly-analysis" ? "font-semibold" : "font-medium"}>Monthly Analysis</span>}
                </button>
                <button
                    onClick={() => handleNav("defect-analysis")}
                    className={`w-full flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 rounded-xl transition-all touch-manipulation ${view === "defect-analysis" ? `${theme.accentBg} text-white shadow-lg ${theme.accentShadow}` : `${theme.textSecondary} hover:${theme.tableRowHover}`}`}
                    title="Defect Analysis"
                >
                    <LineChart size={20} />
                    {isSidebarOpen && <span className={view === "defect-analysis" ? "font-semibold" : "font-medium"}>Defect Analysis</span>}
                </button>
            </nav>

            <div className="p-4 border-t border-white/5 space-y-2 mt-auto">
                <button
                    onClick={() => handleNav("settings")}
                    className={`w-full flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 rounded-xl transition-all touch-manipulation ${view === "settings" ? `${theme.accentBg} text-white shadow-lg ${theme.accentShadow}` : `${theme.textSecondary} hover:${theme.tableRowHover}`}`}
                    title="Settings"
                >
                    <Settings size={20} />
                    {isSidebarOpen && <span className={view === "settings" ? "font-semibold" : "font-medium"}>Settings</span>}
                </button>

                {isSidebarOpen && (
                    <button
                        onClick={onClose}
                        className={`w-full hidden md:flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${theme.textSecondary} hover:${theme.tableRowHover}`}
                        title="Collapse Sidebar"
                    >
                        <ChevronLeft size={20} />
                        <span className="font-medium">Collapse</span>
                    </button>
                )}
            </div>
        </aside>
    );
}
