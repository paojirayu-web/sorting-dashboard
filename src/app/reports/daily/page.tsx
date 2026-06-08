import { formatDateDisplay } from '@/lib/utils';

interface PageProps {
    searchParams: Promise<{ date?: string; category?: string }>;
}

export default async function DailyReportPage({ searchParams }: PageProps) {
    const { date, category = 'WW' } = await searchParams;

    if (!date) {
        return (
            <main className="min-h-screen bg-[#0a0a0a] text-white p-8">
                <h1 className="text-xl font-bold">Daily Defects Report</h1>
                <p className="text-gray-400 mt-2">
                    ระบุวันที่ใน URL เช่น <code className="text-green-400">/reports/daily?date=2026-05-16</code>
                </p>
            </main>
        );
    }

    const imgParams = (unit: string) =>
        `/api/export/daily-defects/image?date=${encodeURIComponent(date)}&unit=${unit}&category=${encodeURIComponent(category)}`;

    return (
        <main className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8">
            <header className="mb-6">
                <h1 className="text-xl font-bold">Daily Defects Monitor</h1>
                <p className="text-gray-400 text-sm mt-1">
                    วันที่ {formatDateDisplay(date)} · {category}
                </p>
            </header>

            <section className="mb-8">
                <h2 className="text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">WW (white)</h2>
                <div className="overflow-x-auto rounded-xl border border-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={imgParams('WW_WHITE')}
                        alt={`Daily defects WW white ${date}`}
                        className="max-w-none"
                    />
                </div>
            </section>

            <section className="mb-8">
                <h2 className="text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">WW (black)</h2>
                <div className="overflow-x-auto rounded-xl border border-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={imgParams('WW_BLACK')}
                        alt={`Daily defects WW black ${date}`}
                        className="max-w-none"
                    />
                </div>
            </section>

            <p className="text-xs text-gray-500">
                <a
                    href={`/api/export/daily-defects/excel?date=${encodeURIComponent(date)}&category=${encodeURIComponent(category)}`}
                    className="text-green-500 underline"
                >
                    ดาวน์โหลด Excel
                </a>
            </p>
        </main>
    );
}
