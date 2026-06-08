'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import type { Theme } from '@/lib/themes';
import type { GroupedRow } from '@/types/dashboard';
import { toProductSortingLogExportRows } from '@/lib/product-sorting-log';

interface ExportProductSortingLogButtonProps {
    rows: GroupedRow[];
    productLabel: string;
    startDate: string;
    endDate: string;
    cpFilters: string[];
    kilnFilters: string[];
    theme: Theme;
    disabled?: boolean;
}

export function ExportProductSortingLogButton({
    rows,
    productLabel,
    startDate,
    endDate,
    cpFilters,
    kilnFilters,
    theme,
    disabled = false,
}: ExportProductSortingLogButtonProps) {
    const [loading, setLoading] = useState(false);

    const exportExcel = async () => {
        if (rows.length === 0 || loading) return;
        setLoading(true);
        try {
            const payload = {
                productLabel,
                startDate,
                endDate,
                cpFilters,
                kilnFilters,
                rows: toProductSortingLogExportRows(rows),
            };

            const res = await fetch('/api/export/product-sorting-log/excel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error('Export failed');

            const blob = await res.blob();
            const disposition = res.headers.get('Content-Disposition') ?? '';
            const match = disposition.match(/filename="([^"]+)"/);
            const filename =
                match?.[1] ??
                `Sorting_Log_${startDate.replace(/-/g, '')}_${endDate.replace(/-/g, '')}.xlsx`;

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('product sorting log excel export failed:', err);
            window.alert('Export Excel failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            type="button"
            onClick={exportExcel}
            disabled={disabled || loading || rows.length === 0}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border ${theme.borderColor} ${theme.inputBg} ${theme.textSecondary} hover:opacity-90 transition-all disabled:opacity-50`}
            title={rows.length === 0 ? 'No data to export' : 'Export table to Excel'}
        >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Export Excel
        </button>
    );
}
