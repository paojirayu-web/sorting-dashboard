"use client";

import { useState } from 'react';
import { Download, Send, Loader2 } from 'lucide-react';
import type { Theme } from '@/lib/themes';

function todayBangkok(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
}

interface ExportDailyDefectsActionsProps {
    theme: Theme;
    selectedDate?: string;
    category?: string;
    showDatePicker?: boolean;
    layout?: 'inline' | 'stacked';
}

export function ExportDailyDefectsActions({
    theme,
    selectedDate: selectedDateProp,
    category = 'WW',
    showDatePicker = false,
    layout = 'inline',
}: ExportDailyDefectsActionsProps) {
    const [reportDate, setReportDate] = useState(selectedDateProp || todayBangkok());
    const selectedDate = selectedDateProp ?? reportDate;
    const [loading, setLoading] = useState<'excel' | 'line' | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const downloadExcel = async () => {
        if (!selectedDate) return;
        setLoading('excel');
        setMessage(null);
        try {
            const params = new URLSearchParams({ date: selectedDate, category });
            const res = await fetch(`/api/export/daily-defects/excel?${params}`);
            if (!res.ok) throw new Error('Export failed');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Daily_Defects_${selectedDate.replace(/-/g, '')}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
            setMessage('Excel downloaded (WW white + WW black sheets)');
        } catch {
            setMessage('Excel export failed');
        } finally {
            setLoading(null);
        }
    };

    const sendLine = async () => {
        if (!selectedDate) return;
        const secret = window.prompt('Enter CRON_SECRET (from .env) to send the report to LINE');
        if (!secret) return;

        setLoading('line');
        setMessage(null);
        try {
            const res = await fetch('/api/automation/daily-report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-cron-secret': secret,
                },
                body: JSON.stringify({
                    date: selectedDate,
                    category,
                    sendLine: true,
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || data.line?.errors?.[0] || 'Send failed');
            }
            if (data.line?.mode === 'text' && data.line?.errors?.length) {
                throw new Error(data.line.errors.join(' · '));
            }
            const kind = data.line?.mode === 'image' ? 'images' : 'text';
            setMessage(
                `LINE sent (${kind}) — WW(white) ${data.wwWhite?.count ?? 0} | WW(black) ${data.wwBlack?.count ?? 0}`,
            );
        } catch (e) {
            setMessage(e instanceof Error ? e.message : 'LINE send failed');
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className={layout === 'stacked' ? 'space-y-3' : 'flex flex-wrap items-center gap-2'}>
            {showDatePicker && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <label className={`text-xs font-bold ${theme.textMuted}`}>Report date</label>
                    <input
                        type="date"
                        value={reportDate}
                        onChange={(e) => setReportDate(e.target.value)}
                        className={`px-3 py-2 rounded-xl text-sm border ${theme.borderColor} ${theme.inputBg} ${theme.textWhite}`}
                    />
                </div>
            )}
            <div className={layout === 'stacked' ? 'flex flex-wrap gap-2' : 'contents'}>
                <button
                    type="button"
                    onClick={downloadExcel}
                    disabled={loading !== null}
                    className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border ${theme.borderColor} ${theme.inputBg} ${theme.textSecondary} hover:opacity-90 transition-all disabled:opacity-50`}
                >
                    {loading === 'excel' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    Export Excel
                </button>
                <button
                    type="button"
                    onClick={sendLine}
                    disabled={loading !== null}
                    className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border border-green-500/40 bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-all disabled:opacity-50`}
                >
                    {loading === 'line' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    Send LINE
                </button>
            </div>
            {message && (
                <p className={`text-xs ${theme.textMuted}`}>{message}</p>
            )}
        </div>
    );
}
