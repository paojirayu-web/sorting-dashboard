import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { isLineAccessibleBaseUrl } from '@/lib/app-url';

/**
 * LINE ต้องดึงรูปจาก HTTPS สาธารณะ — IP ภายใน (192.168.x.x) ใช้ไม่ได้โดยตรง
 * อัปโหลดชั่วคราวเพื่อได้ URL ให้ LINE แสดงรูปในแชท (ไม่ใช่ลิงก์ให้ user กด)
 */
export async function publishPngForLinePush(
    png: Buffer,
    filename: string,
): Promise<string> {
    const mode = process.env.LINE_IMAGE_UPLOAD || 'temp_host';

    if (mode === 'none') {
        throw new Error('LINE_IMAGE_UPLOAD=none — cannot push inline images');
    }

    const publicBase = process.env.LINE_IMAGE_PUBLIC_BASE_URL?.replace(/\/$/, '');
    if (publicBase && isLineAccessibleBaseUrl(publicBase)) {
        const dir = path.join(process.cwd(), 'public', 'line-push');
        await mkdir(dir, { recursive: true });
        const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        await writeFile(path.join(dir, safeName), png);
        return `${publicBase}/line-push/${safeName}`;
    }

    if (mode === 'self' && publicBase) {
        const dir = path.join(process.cwd(), 'public', 'line-push');
        await mkdir(dir, { recursive: true });
        const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        await writeFile(path.join(dir, safeName), png);
        return `${publicBase}/line-push/${safeName}`;
    }

    return uploadToTempHost(png, filename);
}

async function uploadToTempHost(png: Buffer, filename: string): Promise<string> {
    const safeName = filename.endsWith('.png') ? filename : `${filename}.png`;
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', new Blob([new Uint8Array(png)], { type: 'image/png' }), safeName);

    const res = await fetch('https://catbox.moe/user/api.php', {
        method: 'POST',
        body: form,
    });

    const text = (await res.text()).trim();
    if (!res.ok || !text.startsWith('https://')) {
        throw new Error(`Image upload failed: ${text || res.statusText}`);
    }
    return text;
}
