"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, BarChart3, Settings, TrendingUp, PieChart, ListTree, X, ChevronLeft } from 'lucide-react';
import type { Theme } from '@/lib/themes';
import type { ViewType } from '@/types/dashboard';
import { dashboardViewHref } from '@/lib/dashboard-view';
import { QTYPROC_PAGE_TITLE } from '@/lib/qtyproc';

interface SidebarProps {
    theme: Theme;
    view: ViewType;
    isSidebarOpen: boolean;
    onSetView: (view: ViewType) => void;
    onClose: () => void;
}

export function Sidebar({ theme, view, isSidebarOpen, onSetView, onClose }: SidebarProps) {
    const pathname = usePathname();
    const onReasons = pathname === '/reasons' || pathname.startsWith('/reasons/');

    const handleNav = (targetView: ViewType) => {
        onSetView(targetView);
        if (window.innerWidth < 768) onClose();
    };

    const dashLink = (targetView: ViewType) => ({
        href: dashboardViewHref(targetView),
        onClick: () => handleNav(targetView),
    });

    const itemClass = (active: boolean) =>
        `w-full flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 rounded-xl transition-all touch-manipulation no-underline ${
            active ? `${theme.accentBg} text-white shadow-lg ${theme.accentShadow}` : `${theme.textSecondary} hover:${theme.tableRowHover}`
        }`;

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
                <Link
                    {...dashLink("overview")}
                    className={itemClass(!onReasons && view === "overview")}
                    title="Overview"
                >
                    <LayoutDashboard size={20} />
                    {isSidebarOpen && <span className={!onReasons && view === "overview" ? "font-semibold" : "font-medium"}>Overview</span>}
                </Link>
                <Link
                    {...dashLink("product-analysis")}
                    className={itemClass(!onReasons && view === "product-analysis")}
                    title="Product Analysis"
                >
                    <BarChart3 size={20} />
                    {isSidebarOpen && <span className={!onReasons && view === "product-analysis" ? "font-semibold" : "font-medium"}>Product Analysis</span>}
                </Link>
                <Link
                    {...dashLink("monthly-analysis")}
                    className={itemClass(!onReasons && view === "monthly-analysis")}
                    title="Monthly Analysis"
                >
                    <TrendingUp size={20} />
                    {isSidebarOpen && <span className={!onReasons && view === "monthly-analysis" ? "font-semibold" : "font-medium"}>Monthly Analysis</span>}
                </Link>
                <Link
                    {...dashLink("qty-process")}
                    className={itemClass(!onReasons && view === "qty-process")}
                    title={QTYPROC_PAGE_TITLE}
                >
                    <PieChart size={20} />
                    {isSidebarOpen && <span className={!onReasons && view === "qty-process" ? "font-semibold" : "font-medium"}>{QTYPROC_PAGE_TITLE}</span>}
                </Link>
                <Link
                    href="/reasons"
                    onClick={() => {
                        if (window.innerWidth < 768) onClose();
                    }}
                    className={itemClass(onReasons)}
                    title="Defects Overview"
                >
                    <ListTree size={20} />
                    {isSidebarOpen && <span className={onReasons ? "font-semibold" : "font-medium"}>Defects</span>}
                </Link>
            </nav>

            <div className="p-4 border-t border-white/5 space-y-2 mt-auto">
                <Link
                    {...dashLink("settings")}
                    className={itemClass(!onReasons && view === "settings")}
                    title="Settings"
                >
                    <Settings size={20} />
                    {isSidebarOpen && <span className={!onReasons && view === "settings" ? "font-semibold" : "font-medium"}>Settings</span>}
                </Link>

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
