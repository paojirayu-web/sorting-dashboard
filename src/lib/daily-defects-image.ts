import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import path from 'path';
import type { DailyDefectExportRow } from '@/lib/daily-defects';
import { formatDateDisplay } from '@/lib/utils';

const COLORS = {
    pageBg: '#0a0a0a',
    cardBg: '#141414',
    border: '#2a2a2a',
    text: '#ffffff',
    muted: '#9ca3af',
    secondary: '#d1d5db',
    green: '#22c55e',
    red: '#ef4444',
    orange: '#fb923c',
    yellow: '#eab308',
    headerBg: '#1a1a1a',
};

const COLS = [
    { key: 'desc', label: 'Description', width: 200, align: 'left' as const },
    { key: 'kiln', label: 'Kiln/CP/Date', width: 118, align: 'left' as const },
    { key: 'proc', label: 'Process', width: 72, align: 'right' as const },
    { key: 'good', label: 'Good', width: 78, align: 'right' as const },
    { key: 'scrap', label: 'Scrap', width: 78, align: 'right' as const },
    { key: 'reject', label: 'Reject', width: 78, align: 'right' as const },
    { key: 'topc', label: 'Top Defect(C)', width: 168, align: 'left' as const },
    { key: 'topp', label: 'Top Defect(P)', width: 168, align: 'left' as const },
];

const TABLE_WIDTH = COLS.reduce((s, c) => s + c.width, 0);
const PAD = 20;
const HEADER_H = 36;
const ROW_H = 58;
const TITLE_H = 56;

let fontReady = false;

function ensureFont() {
    if (fontReady) return;
    const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansThai-Regular.ttf');
    try {
        GlobalFonts.registerFromPath(fontPath, 'NotoSansThai');
        fontReady = true;
    } catch {
        fontReady = true;
    }
}

function font(size: number, bold = false) {
    return `${bold ? 'bold ' : ''}${size}px NotoSansThai, Tahoma, Segoe UI, sans-serif`;
}

function truncate(ctx: { measureText: (t: string) => { width: number } }, text: string, maxWidth: number): string {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) {
        t = t.slice(0, -1);
    }
    return `${t}…`;
}

function wrapLines(
    ctx: { measureText: (t: string) => { width: number }; font: string },
    text: string,
    maxWidth: number,
    maxLines: number,
): string[] {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width <= maxWidth) {
            line = test;
        } else {
            if (line) lines.push(line);
            line = word;
            if (lines.length >= maxLines) break;
        }
    }
    if (line && lines.length < maxLines) lines.push(line);
    if (lines.length === 0) lines.push(truncate(ctx, text, maxWidth));
    return lines.slice(0, maxLines);
}

export interface RenderTableImageOptions {
    unitLabel: string;
    reportDate: string;
    rows: DailyDefectExportRow[];
    maxRows?: number;
}

export async function renderDailyDefectsTablePng(
    options: RenderTableImageOptions,
): Promise<Buffer> {
    ensureFont();
    const { unitLabel, reportDate, rows, maxRows = 40 } = options;
    const displayRows = rows.slice(0, maxRows);
    const extra = rows.length > maxRows ? rows.length - maxRows : 0;

    const height =
        PAD * 2 + TITLE_H + HEADER_H + displayRows.length * ROW_H + (extra > 0 ? 28 : 0) + 12;
    const width = TABLE_WIDTH + PAD * 2;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = COLORS.pageBg;
    ctx.fillRect(0, 0, width, height);

    let y = PAD;

    ctx.fillStyle = COLORS.text;
    ctx.font = font(18, true);
    ctx.fillText('Daily Defects Monitor', PAD, y + 20);
    ctx.font = font(12);
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(`${unitLabel}  ·  ${formatDateDisplay(reportDate)}  ·  ${rows.length} รายการ`, PAD, y + 40);
    y += TITLE_H;

    const tableX = PAD;
    ctx.fillStyle = COLORS.cardBg;
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;
    ctx.fillRect(tableX, y, TABLE_WIDTH, HEADER_H + displayRows.length * ROW_H);
    ctx.strokeRect(tableX, y, TABLE_WIDTH, HEADER_H + displayRows.length * ROW_H);

    let x = tableX;
    ctx.fillStyle = COLORS.headerBg;
    ctx.fillRect(tableX, y, TABLE_WIDTH, HEADER_H);
    ctx.fillStyle = COLORS.muted;
    ctx.font = font(9, true);
    for (const col of COLS) {
        const tx =
            col.align === 'right'
                ? x + col.width - 6 - ctx.measureText(col.label).width
                : x + 6;
        ctx.fillText(col.label.toUpperCase(), tx, y + 22);
        x += col.width;
    }
    y += HEADER_H;

    displayRows.forEach((row, ri) => {
        if (ri % 2 === 1) {
            ctx.fillStyle = 'rgba(255,255,255,0.02)';
            ctx.fillRect(tableX, y, TABLE_WIDTH, ROW_H);
        }
        x = tableX;
        ctx.font = font(10, true);
        ctx.fillStyle = COLORS.text;
        const desc = row.description2 ? `${row.description}\n${row.description2}` : row.description;
        const descLines = wrapLines(ctx, desc, COLS[0].width - 10, 2);
        descLines.forEach((ln, i) => ctx.fillText(ln, x + 6, y + 16 + i * 12));
        ctx.font = font(8);
        ctx.fillStyle = COLORS.muted;
        ctx.fillText(truncate(ctx, row.m_doc, COLS[0].width - 12), x + 6, y + 42);
        x += COLS[0].width;

        ctx.font = font(9, true);
        ctx.fillStyle = COLORS.secondary;
        ctx.fillText(row.m_kiln, x + 6, y + 18);
        ctx.font = font(9);
        ctx.fillText(row.m_cp, x + 40, y + 18);
        ctx.fillStyle = COLORS.muted;
        ctx.font = font(8);
        ctx.fillText(row.m_date, x + 6, y + 36);
        x += COLS[1].width;

        ctx.font = font(10, true);
        ctx.fillStyle = COLORS.secondary;
        const proc = row.qtyp.toLocaleString();
        ctx.fillText(proc, x + COLS[2].width - 6 - ctx.measureText(proc).width, y + 28);
        x += COLS[2].width;

        ctx.fillStyle = COLORS.green;
        const good = row.qtycomp.toLocaleString();
        ctx.fillText(good, x + COLS[3].width - 6 - ctx.measureText(good).width, y + 20);
        ctx.font = font(8);
        ctx.fillText(`${row.compPct.toFixed(0)}%`, x + COLS[3].width - 6 - ctx.measureText(`${row.compPct.toFixed(0)}%`).width, y + 36);
        x += COLS[3].width;

        ctx.font = font(10, true);
        ctx.fillStyle = COLORS.red;
        const scrap = row.totalScrap.toLocaleString();
        ctx.fillText(scrap, x + COLS[4].width - 6 - ctx.measureText(scrap).width, y + 20);
        ctx.font = font(8);
        ctx.fillText(`${row.scrapPct.toFixed(0)}%`, x + COLS[4].width - 6 - ctx.measureText(`${row.scrapPct.toFixed(0)}%`).width, y + 36);
        x += COLS[4].width;

        ctx.font = font(10, true);
        ctx.fillStyle = COLORS.orange;
        const rej = row.totalReject.toLocaleString();
        ctx.fillText(rej, x + COLS[5].width - 6 - ctx.measureText(rej).width, y + 20);
        ctx.font = font(8);
        ctx.fillText(`${row.rejectPct.toFixed(0)}%`, x + COLS[5].width - 6 - ctx.measureText(`${row.rejectPct.toFixed(0)}%`).width, y + 36);
        x += COLS[5].width;

        ctx.font = font(8);
        ctx.fillStyle = COLORS.secondary;
        ctx.fillText(truncate(ctx, row.topDefectC, COLS[6].width - 10), x + 6, y + 28);
        x += COLS[6].width;
        ctx.fillStyle = COLORS.yellow;
        ctx.fillText(truncate(ctx, row.topDefectP, COLS[7].width - 10), x + 6, y + 28);

        ctx.strokeStyle = COLORS.border;
        ctx.beginPath();
        ctx.moveTo(tableX, y + ROW_H);
        ctx.lineTo(tableX + TABLE_WIDTH, y + ROW_H);
        ctx.stroke();

        y += ROW_H;
    });

    if (extra > 0) {
        ctx.fillStyle = COLORS.muted;
        ctx.font = font(10);
        ctx.fillText(`… และอีก ${extra} รายการ (ดูใน Excel)`, PAD, y + 16);
    }

    return canvas.toBuffer('image/png');
}
