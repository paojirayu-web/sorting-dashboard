import {
    getConnection,
    getKilnSortDirectConnection,
    getSdbConnection,
    isKilnSortDirectEnabled,
    isSdbConfigured,
    sql,
} from '@/lib/db';
import { injectCategorySql } from '@/lib/defect-category-sql';
import {
    KILNDB_DIRECT_VIEW,
    KILNDB_VIEW,
    SORT_VIEW_TOKEN,
    type SortSourceId,
    viewForSource,
} from '@/lib/sort-source';

export type SortQueryBind = (req: sql.Request) => void;

type SourceTarget = {
    pool: sql.ConnectionPool;
    view: string;
    label: string;
};

let reasonsKilnDirectOk = isKilnSortDirectEnabled();

async function getKilnTarget(direct: boolean): Promise<SourceTarget> {
    if (!direct || !reasonsKilnDirectOk) {
        return { pool: await getConnection(), view: KILNDB_VIEW, label: 'kilndb' };
    }
    try {
        const pool = await getKilnSortDirectConnection();
        return { pool, view: KILNDB_DIRECT_VIEW, label: 'kilndb-direct' };
    } catch (err) {
        reasonsKilnDirectOk = false;
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`[kiln] direct Db_Sorting unavailable, using linked ${KILNDB_VIEW}: ${message}`);
        return { pool: await getConnection(), view: KILNDB_VIEW, label: 'kilndb' };
    }
}

async function getTargetForSource(source: SortSourceId, kilnDirect: boolean): Promise<SourceTarget> {
    if (source === 'sdb') {
        return { pool: await getSdbConnection(), view: viewForSource('sdb'), label: 'sdb' };
    }
    return getKilnTarget(kilnDirect);
}

function enabledSources(requested: SortSourceId[]): SortSourceId[] {
    return requested.filter((source) => source !== 'sdb' || isSdbConfigured());
}

export async function querySortSources<T extends Record<string, unknown>>(
    sqlText: string,
    options?: {
        sources?: SortSourceId[];
        bind?: SortQueryBind;
        required?: boolean;
        category?: string;
        /** Reasons page only: query Db_Sorting directly instead of kilndb linked view. */
        kilnDirect?: boolean;
    },
): Promise<{ recordset: T[] }> {
    const requested = options?.sources?.length ? options.sources : (['kilndb', 'sdb'] as SortSourceId[]);
    const sources = enabledSources(requested);
    if (sources.length === 0) {
        throw new Error('No sorting database source is configured');
    }
    const kilnDirect = Boolean(options?.kilnDirect);

    const settled = await Promise.allSettled(
        sources.map(async (source) => {
            const run = async (direct: boolean) => {
                const target = await getTargetForSource(source, direct);
                const req = target.pool.request();
                options?.bind?.(req);
                let query = sqlText.split(SORT_VIEW_TOKEN).join(target.view);
                if (options?.category) {
                    query = injectCategorySql(query, options.category, source);
                }
                const started = Date.now();
                const result = await req.query(query);
                const ms = Date.now() - started;
                console.info(`[sort] ${target.label} ${ms}ms rows=${result.recordset.length}`);
                return (result.recordset as T[]).map((row) => ({ ...row, _source: source }));
            };

            try {
                return await run(kilnDirect && source === 'kilndb');
            } catch (err) {
                if (!kilnDirect || source !== 'kilndb') throw err;
                reasonsKilnDirectOk = false;
                const message = err instanceof Error ? err.message : String(err);
                console.warn(`[kiln] direct Db_Sorting query failed, retrying linked ${KILNDB_VIEW}: ${message}`);
                return run(false);
            }
        }),
    );

    const rows: T[] = [];
    const errors: string[] = [];
    settled.forEach((item, index) => {
        if (item.status === 'fulfilled') {
            for (const row of item.value) rows.push(row);
            return;
        }
        const source = sources[index];
        const message = item.reason instanceof Error ? item.reason.message : String(item.reason);
        console.error(`Sort source ${source} query failed:`, item.reason);
        errors.push(`${source}: ${message}`);
    });

    if (rows.length === 0 && (options?.required || sources.length === 1)) {
        throw new Error(errors[0] || 'Sorting query failed');
    }

    return { recordset: rows };
}

export function mergeSumByKeys<T extends Record<string, unknown>>(
    rows: T[],
    keyFields: (keyof T)[],
    sumFields: (keyof T)[],
): T[] {
    const map = new Map<string, T>();
    for (const row of rows) {
        const key = keyFields.map((field) => String(row[field] ?? '')).join('\0');
        const existing = map.get(key);
        if (!existing) {
            map.set(key, { ...row });
            continue;
        }
        for (const field of sumFields) {
            const current = Number(existing[field]) || 0;
            const extra = Number(row[field]) || 0;
            (existing as Record<string, unknown>)[field as string] = current + extra;
        }
    }
    return [...map.values()];
}
