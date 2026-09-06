import type { DataItem, GroupedRow } from '@/types/dashboard';
import { isC1SpecialReasonForRecord } from '@/lib/c1-special-reason';
import { formatProductDescription, formatDateDisplay, normalizeMDate } from '@/lib/utils';
import { isGlazeDwCategory } from '@/lib/sort-source';
import { getDisplayCp, matchesUnitFilter } from '@/lib/unit-filter';
import { isRejectSubTyp, isScrapSubTyp } from '@/lib/sub-typ';

export interface DailyDefectsOptions {
    date: string;
    unitFilter: 'ALL' | 'WW_WHITE' | 'WW_BLACK';
    cpFilter?: string;
    category?: string;
}

/** Serializable row for API / Excel / LINE */
export interface DailyDefectExportRow {
    description: string;
    description2?: string;
    m_doc: string;
    m_kiln: string;
    m_cp: string;
    m_date: string;
    qtyp: number;
    qtycomp: number;
    compPct: number;
    totalScrap: number;
    scrapPct: number;
    totalReject: number;
    rejectPct: number;
    topDefectC: string;
    topDefectP: string;
}

export function buildDailyActivityTable(
    data: DataItem[],
    options: DailyDefectsOptions,
): GroupedRow[] {
    const { date, unitFilter, cpFilter = 'ALL', category = 'WW' } = options;
    const grouped = new Map<string, GroupedRow>();

    data
        .filter((item) => normalizeMDate(item.m_date).startsWith(date))
        .filter((item) => matchesUnitFilter(item, unitFilter, category))
        .forEach((item) => {
            const dateStr = normalizeMDate(item.m_date);
            const displayCp = getDisplayCp(item);
            const key = `${item.m_doc}-${item.pt_desc1}-${item.m_kiln}-${dateStr}-${displayCp}`;

            if (!grouped.has(key)) {
                grouped.set(key, {
                    ...item,
                    m_cp: displayCp,
                    cdReasons: new Map<string, number>(),
                    pjReasons: new Map<string, number>(),
                    totalScrap: item.qtyscrp || 0,
                    totalReject: item.qtyrjct || 0,
                });
            }
            const g = grouped.get(key)!;

            if (item.rsn_desc) {
                if (isC1SpecialReasonForRecord(item)) {
                    g.qtycomp += item.sub_qty || 0;
                    g.totalReject = Math.max(0, g.totalReject - (item.sub_qty || 0));
                } else if (isScrapSubTyp(item.sub_typ)) {
                    g.cdReasons.set(
                        item.rsn_desc,
                        (g.cdReasons.get(item.rsn_desc) || 0) + (item.sub_qty || 0),
                    );
                } else if (isRejectSubTyp(item.sub_typ)) {
                    g.pjReasons.set(
                        item.rsn_desc,
                        (g.pjReasons.get(item.rsn_desc) || 0) + (item.sub_qty || 0),
                    );
                }
            }
        });

    return Array.from(grouped.values())
        .filter((item) => {
            const scrapPct = item.qtyp > 0 ? (item.totalScrap / item.qtyp) * 100 : 0;
            const rejectPct = item.qtyp > 0 ? (item.totalReject / item.qtyp) * 100 : 0;
            const compPct = item.qtyp > 0 ? (item.qtycomp / item.qtyp) * 100 : 0;

            let meetsThreshold = false;
            if (isGlazeDwCategory(category)) {
                meetsThreshold =
                    item.qtyp >= 300 &&
                    (scrapPct >= 10 || rejectPct >= 20 || compPct <= 70);
            } else {
                meetsThreshold =
                    item.qtyp >= 500 &&
                    (scrapPct >= 15 || rejectPct >= 30 || compPct <= 45);
            }
            if (!meetsThreshold) return false;

            const matchesCP =
                cpFilter === 'ALL' ||
                item.m_cp === cpFilter ||
                (cpFilter === 'C' && item.m_cp === 'C1');
            return matchesCP;
        })
        .sort((a, b) => b.qtyp - a.qtyp);
}

function formatTopDefects(reasons: Map<string, number>, qtyp: number): string {
    const top = [...reasons.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2);
    if (top.length === 0) return '-';
    return top
        .map(([r, q]) => {
            const pct = qtyp > 0 ? ((q / qtyp) * 100).toFixed(0) : '0';
            return `${r} (${q}, ${pct}%)`;
        })
        .join(' | ');
}

export function toExportRows(rows: GroupedRow[]): DailyDefectExportRow[] {
    return rows.map((item) => {
        const compPct = item.qtyp > 0 ? (item.qtycomp / item.qtyp) * 100 : 0;
        const scrapPct = item.qtyp > 0 ? (item.totalScrap / item.qtyp) * 100 : 0;
        const rejectPct = item.qtyp > 0 ? (item.totalReject / item.qtyp) * 100 : 0;
        const isDw =
            (item.pt_desc1 || '').startsWith('143') ||
            (item.m_part || '').startsWith('143');

        return {
            description: formatProductDescription(item.pt_desc1),
            description2: isDw && item.pt_desc2 ? item.pt_desc2 : undefined,
            m_doc: item.m_doc,
            m_kiln: item.m_kiln,
            m_cp: item.m_cp,
            m_date: formatDateDisplay(normalizeMDate(item.m_date)),
            qtyp: item.qtyp,
            qtycomp: item.qtycomp,
            compPct,
            totalScrap: item.totalScrap,
            scrapPct,
            totalReject: item.totalReject,
            rejectPct,
            topDefectC: formatTopDefects(item.cdReasons, item.qtyp),
            topDefectP: formatTopDefects(item.pjReasons, item.qtyp),
        };
    });
}

export function buildLineTextSummary(
    unitLabel: string,
    date: string,
    rows: DailyDefectExportRow[],
): string {
    const header = `📋 Daily Defects Monitor\n📅 ${formatDateDisplay(date)}\n🏭 ${unitLabel} — ${rows.length} รายการ\n`;
    if (rows.length === 0) {
        return `${header}\nไม่มีรายการที่ผ่านเกณฑ์ในวันนี้`;
    }

    const lines = rows.slice(0, 25).map((r, i) => {
        return (
            `${i + 1}. ${r.description}\n` +
            `   Doc ${r.m_doc} | ${r.m_kiln} ${r.m_cp} | ${r.m_date}\n` +
            `   P ${r.qtyp.toLocaleString()} | Good ${r.compPct.toFixed(0)}% | Scrap ${r.scrapPct.toFixed(0)}% | Reject ${r.rejectPct.toFixed(0)}%\n` +
            `   C: ${r.topDefectC}\n` +
            `   P: ${r.topDefectP}`
        );
    });

    let body = lines.join('\n\n');
    if (rows.length > 25) {
        body += `\n\n… และอีก ${rows.length - 25} รายการ (ดูในไฟล์ Excel)`;
    }
    return `${header}\n${body}`;
}

function formatBangkokDate(date: Date): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(date);
}

/** วันนี้ตามเวลาไทย (YYYY-MM-DD) — ใช้กับ cron 20:30 */
export function getTodayReportDateBangkok(): string {
    return formatBangkokDate(new Date());
}

/** Default report date: yesterday in Asia/Bangkok */
export function getDefaultReportDate(): string {
    const now = new Date();
    const bangkok = new Date(
        now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }),
    );
    bangkok.setDate(bangkok.getDate() - 1);
    const y = bangkok.getFullYear();
    const m = String(bangkok.getMonth() + 1).padStart(2, '0');
    const d = String(bangkok.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
