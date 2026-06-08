"use client";

import { useCallback, useEffect, useState } from 'react';
import { Clock, Loader2, Save } from 'lucide-react';
import type { Theme } from '@/lib/themes';

interface AutomationConfig {
    enabled: boolean;
    hour: number;
    minute: number;
    timezone: string;
    timeLabel?: string;
    schedulerRunning?: boolean;
    settingsFile?: string;
}

interface DailyReportAutomationSettingsProps {
    theme: Theme;
}

function toTimeInputValue(hour: number, minute: number): string {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function parseTimeInput(value: string): { hour: number; minute: number } {
    const [h, m] = value.split(':').map((x) => parseInt(x, 10));
    return {
        hour: Number.isFinite(h) ? h : 20,
        minute: Number.isFinite(m) ? m : 30,
    };
}

export function DailyReportAutomationSettings({ theme }: DailyReportAutomationSettingsProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [enabled, setEnabled] = useState(false);
    const [time, setTime] = useState('20:30');
    const [timezone, setTimezone] = useState('Asia/Bangkok');
    const [message, setMessage] = useState<string | null>(null);
    const [schedulerRunning, setSchedulerRunning] = useState<boolean | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/settings/daily-report-automation');
            const data: AutomationConfig = await res.json();
            if (!res.ok) throw new Error('Failed to load schedule settings');
            setEnabled(data.enabled);
            setTime(toTimeInputValue(data.hour, data.minute));
            setTimezone(data.timezone || 'Asia/Bangkok');
            setSchedulerRunning(data.schedulerRunning ?? null);
            if (data.enabled && data.schedulerRunning === false) {
                setMessage(
                    'Schedule is enabled but the cron job is not running — open Settings on the server and click Save schedule again, then check pm2 logs.',
                );
            }
        } catch (e) {
            setMessage(e instanceof Error ? e.message : 'Failed to load');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const save = async () => {
        const secret = window.prompt('Enter CRON_SECRET to save the automation schedule');
        if (!secret) return;

        const { hour, minute } = parseTimeInput(time);
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch('/api/settings/daily-report-automation', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-cron-secret': secret,
                },
                body: JSON.stringify({ enabled, hour, minute, timezone }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Save failed');
            }
            setSchedulerRunning(data.schedulerRunning ?? null);
            setMessage(
                data.enabled
                    ? `Saved — LINE report daily at ${data.timeLabel} (${data.timezone})${data.schedulerRunning ? ' · scheduler active' : ' · scheduler NOT active (check pm2 logs)'}`
                    : 'Saved — automatic LINE report disabled',
            );
        } catch (e) {
            setMessage(e instanceof Error ? e.message : 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <p className={`text-xs ${theme.textMuted} flex items-center gap-2`}>
                <Loader2 size={14} className="animate-spin" />
                Loading schedule…
            </p>
        );
    }

    return (
        <div className="space-y-3 pt-3 border-t border-dashed border-white/10">
            <div className="flex items-center gap-2">
                <Clock size={16} className={theme.accentText} />
                <h4 className={`text-sm font-bold ${theme.textWhite}`}>Automatic LINE report</h4>
            </div>
            <p className={`text-xs ${theme.textSecondary}`}>
                Sends WW(white) and WW(black) table images to LINE at the scheduled time.
            </p>
            <p className={`text-xs ${theme.textMuted}`}>
                <strong className={theme.textSecondary}>Report date:</strong> uses{' '}
                <strong className={theme.textSecondary}>today</strong> (Asia/Bangkok) each time the job
                runs — you do not set the date here.
            </p>

            <label className="flex items-center gap-3 cursor-pointer">
                <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="w-4 h-4 rounded accent-green-500"
                />
                <span className={`text-sm font-medium ${theme.textWhite}`}>Enabled</span>
            </label>

            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="flex flex-col gap-1">
                    <label className={`text-xs font-bold ${theme.textMuted}`}>Send time (24h)</label>
                    <input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        disabled={!enabled}
                        className={`px-3 py-2 rounded-xl text-sm border ${theme.borderColor} ${theme.inputBg} ${theme.textWhite} disabled:opacity-40`}
                    />
                </div>
                <button
                    type="button"
                    onClick={save}
                    disabled={saving}
                    className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border border-blue-500/40 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all disabled:opacity-50`}
                >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Save schedule
                </button>
            </div>

            {message && <p className={`text-xs ${theme.textMuted}`}>{message}</p>}
            {enabled && schedulerRunning === true && (
                <p className={`text-xs text-green-500/90`}>Scheduler is active on this server.</p>
            )}
            <p className={`text-[10px] ${theme.textMuted} leading-relaxed`}>
                The app process must stay running on the server (e.g.{' '}
                <code className={`${theme.inputBg} px-1 rounded`}>pm2</code>,{' '}
                <code className={`${theme.inputBg} px-1 rounded`}>npm start</code>). Settings are
                stored on the server and apply immediately after save. PM2 is fine — same as keeping
                the Node server alive.
            </p>
        </div>
    );
}
