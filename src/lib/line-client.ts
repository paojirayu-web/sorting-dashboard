export interface LinePushResult {
    ok: boolean;
    status: number;
    error?: string;
}

export type LineMessage =
    | { type: 'text'; text: string }
    | { type: 'image'; originalContentUrl: string; previewImageUrl?: string };

function getLineConfig() {
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const groupId = process.env.LINE_GROUP_ID;
    return { token, groupId };
}

export function isLineConfigured(): boolean {
    const { token, groupId } = getLineConfig();
    return Boolean(token && groupId);
}

/** Push mixed text + image messages (max 5 per request). */
export async function pushLineMessages(messages: LineMessage[]): Promise<LinePushResult> {
    const { token, groupId } = getLineConfig();
    if (!token || !groupId) {
        return { ok: false, status: 0, error: 'LINE_CHANNEL_ACCESS_TOKEN or LINE_GROUP_ID not set' };
    }

    const payload = messages.slice(0, 5).map((m) => {
        if (m.type === 'text') {
            return { type: 'text' as const, text: m.text.slice(0, 5000) };
        }
        return {
            type: 'image' as const,
            originalContentUrl: m.originalContentUrl,
            previewImageUrl: m.previewImageUrl ?? m.originalContentUrl,
        };
    });

    const res = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ to: groupId, messages: payload }),
    });

    if (!res.ok) {
        const body = await res.text();
        return { ok: false, status: res.status, error: body };
    }
    return { ok: true, status: res.status };
}

/** ส่งข้อความทีละ batch ละ 5 (LINE Messaging API limit) */
export async function pushLineMessagesBatched(
    messages: LineMessage[],
): Promise<LinePushResult> {
    if (messages.length === 0) {
        return { ok: true, status: 200 };
    }

    const errors: string[] = [];
    for (let i = 0; i < messages.length; i += 5) {
        const batch = messages.slice(i, i + 5);
        const result = await pushLineMessages(batch);
        if (!result.ok) {
            errors.push(result.error || `HTTP ${result.status}`);
        }
    }

    if (errors.length > 0) {
        return { ok: false, status: 400, error: errors.join('; ') };
    }
    return { ok: true, status: 200 };
}

/** Push text messages to LINE group (Messaging API). */
export async function pushLineTextMessages(texts: string[]): Promise<LinePushResult> {
    return pushLineMessages(texts.map((text) => ({ type: 'text', text })));
}

/** Push image by public HTTPS URL (original + preview can be same). */
export async function pushLineImage(
    imageUrl: string,
): Promise<LinePushResult> {
    const { token, groupId } = getLineConfig();
    if (!token || !groupId) {
        return { ok: false, status: 0, error: 'LINE not configured' };
    }

    const res = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            to: groupId,
            messages: [
                {
                    type: 'image',
                    originalContentUrl: imageUrl,
                    previewImageUrl: imageUrl,
                },
            ],
        }),
    });

    if (!res.ok) {
        const body = await res.text();
        return { ok: false, status: res.status, error: body };
    }
    return { ok: true, status: res.status };
}
