/** ค่าเริ่มต้น — ขยาย layout ก่อนจับภาพให้ตัวอักษรใน LINE ใหญ่ขึ้น */
export const LINE_EXPORT_ZOOM_DEFAULT = 1.65;

/** อ่านจาก .env ได้เฉพาะฝั่ง server (Puppeteer) */
export function getLineExportZoom(): number {
    const n = Number(process.env.LINE_SCREENSHOT_ZOOM);
    return Number.isFinite(n) && n > 0 ? n : LINE_EXPORT_ZOOM_DEFAULT;
}
