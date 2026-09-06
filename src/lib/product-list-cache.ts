import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { getAppDataDir } from '@/lib/daily-report-automation-settings';
import { isSdbConfigured } from '@/lib/db';
import {
    getProductListStartDate,
    PRODUCT_LIST_CACHE_SECONDS,
    queryProductListFromDb,
    type ProductListItem,
} from '@/lib/product-list';
import { ONGLAZE_PRODUCT_PREFIX, productListHasWwUnitFlags } from '@/lib/sort-source';

export type ProductListApiPayload = {
    items: ProductListItem[];
    since: string;
    fromCache?: boolean;
    stale?: boolean;
};

type CacheEntry = { at: number; key: string; items: ProductListItem[] };

const memCache = new Map<string, CacheEntry>();
const FRESH_MS = PRODUCT_LIST_CACHE_SECONDS * 1000;
const CACHE_VERSION = 'v6';

let rebuildInflight: Promise<CacheEntry> | null = null;

function cacheKey(startDate: string) {
    return `${CACHE_VERSION}|${startDate}`;
}

function cacheFilePath() {
    return path.join(getAppDataDir(), 'data', 'product-list-cache.json');
}

function listIsUsable(items: ProductListItem[] | undefined): items is ProductListItem[] {
    if (!Array.isArray(items) || items.length === 0) return false;
    if (!productListHasWwUnitFlags(items)) return false;
    if (isSdbConfigured() && !items.some((item) => String(item.value || '').startsWith(ONGLAZE_PRODUCT_PREFIX))) {
        return false;
    }
    return true;
}

async function queryList(): Promise<CacheEntry> {
    const startDate = getProductListStartDate();
    const t0 = Date.now();
    const items = await queryProductListFromDb(startDate);
    console.info(`[products] ${Date.now() - t0}ms items=${items.length} since=${startDate}`);
    return { at: Date.now(), key: cacheKey(startDate), items };
}

async function readDiskCache(): Promise<CacheEntry | null> {
    try {
        const parsed = JSON.parse(await readFile(cacheFilePath(), 'utf8')) as CacheEntry;
        if (parsed?.at && parsed.key === cacheKey(getProductListStartDate()) && listIsUsable(parsed.items)) {
            return parsed;
        }
    } catch {
        /* no disk cache */
    }
    return null;
}

function writeDiskCache(entry: CacheEntry) {
    mkdir(path.dirname(cacheFilePath()), { recursive: true })
        .then(() => writeFile(cacheFilePath(), JSON.stringify(entry), 'utf8'))
        .catch(() => { /* ignore cache write errors */ });
}

function remember(entry: CacheEntry) {
    memCache.set(entry.key, entry);
    writeDiskCache(entry);
}

function rebuildCache(): Promise<CacheEntry> {
    if (rebuildInflight) return rebuildInflight;
    rebuildInflight = queryList()
        .then((entry) => {
            remember(entry);
            return entry;
        })
        .finally(() => {
            rebuildInflight = null;
        });
    return rebuildInflight;
}

function withMeta(entry: CacheEntry, fromCache: boolean): ProductListApiPayload {
    const age = Date.now() - entry.at;
    return {
        items: entry.items,
        since: getProductListStartDate(),
        fromCache,
        stale: fromCache && age > FRESH_MS,
    };
}

export async function getProductListResponse(forceRefresh = false): Promise<ProductListApiPayload> {
    const key = cacheKey(getProductListStartDate());
    if (forceRefresh) {
        return withMeta(await rebuildCache(), false);
    }

    const mem = memCache.get(key);
    if (mem && listIsUsable(mem.items)) {
        if (Date.now() - mem.at > FRESH_MS) void rebuildCache();
        return withMeta(mem, true);
    }

    const disk = await readDiskCache();
    if (disk) {
        remember(disk);
        if (Date.now() - disk.at > FRESH_MS) void rebuildCache();
        return withMeta(disk, true);
    }

    return withMeta(await rebuildCache(), false);
}

export function warmProductListCache() {
    void getProductListResponse(false).catch((err) => {
        console.error('[products] warm failed:', err);
    });
}
