import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

/** Save PNG under public/reports for LAN viewing; returns web path e.g. /reports/... */
export async function saveReportImage(
    buffer: Buffer,
    date: string,
    unit: string,
): Promise<string> {
    const dir = path.join(process.cwd(), 'public', 'reports');
    await mkdir(dir, { recursive: true });
    const filename = `daily_${date.replace(/-/g, '')}_${unit}.png`;
    await writeFile(path.join(dir, filename), buffer);
    return `/reports/${filename}`;
}
