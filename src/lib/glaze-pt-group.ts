import { getGlazeConnection } from '@/lib/db';
import type { QtyProcGroupInfo } from '@/lib/qtyproc';

type CacheEntry = { at: number; map: Map<string, QtyProcGroupInfo> };

const FRESH_MS = 2 * 60 * 60 * 1000;
let mem: CacheEntry | null = null;
let inflight: Promise<Map<string, QtyProcGroupInfo>> | null = null;

function normalizePart(value: unknown): string {
    return String(value || '').trim();
}

export async function loadGlazePtGroupMap(): Promise<Map<string, QtyProcGroupInfo>> {
    if (mem && Date.now() - mem.at < FRESH_MS && mem.map.size > 0) return mem.map;
    if (inflight) return inflight;

    inflight = (async () => {
        const pool = await getGlazeConnection();
        const result = await pool.request().query<{
            pt_part: string;
            pt_group: string;
            group_name: string;
        }>(`
            SELECT
                LTRIM(RTRIM(p.pt_part)) AS pt_part,
                LTRIM(RTRIM(ISNULL(p.pt_group, ''))) AS pt_group,
                LTRIM(RTRIM(ISNULL(ig.code_cmmt1, ISNULL(p.pt_group, '')))) AS group_name
            FROM dbo.pt_mstr AS p WITH (NOLOCK)
            LEFT JOIN dbo.itemgroup AS ig WITH (NOLOCK)
                ON LTRIM(RTRIM(p.pt_group)) = LTRIM(RTRIM(ig.code_value1))
            WHERE p.pt_part IS NOT NULL
              AND LTRIM(RTRIM(p.pt_part)) <> ''
        `);
        const map = new Map<string, QtyProcGroupInfo>();
        for (const row of result.recordset) {
            const part = normalizePart(row.pt_part);
            const code = normalizePart(row.pt_group);
            if (!part || !code) continue;
            map.set(part, {
                code,
                name: normalizePart(row.group_name) || code,
            });
        }
        mem = { at: Date.now(), map };
        console.info(`[glaze-group] loaded ${map.size} pt_mstr parts`);
        return map;
    })().finally(() => {
        inflight = null;
    });

    return inflight;
}
