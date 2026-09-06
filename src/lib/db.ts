import sql from 'mssql';

const g = globalThis as typeof globalThis & {
    _sortKilnPool?: sql.ConnectionPool;
    _sortKilnPoolPromise?: Promise<sql.ConnectionPool>;
    _sortSdbPool?: sql.ConnectionPool;
    _sortSdbPoolPromise?: Promise<sql.ConnectionPool>;
};

function makeConfig(opts: {
    user?: string;
    password?: string;
    server: string;
    database?: string;
}): sql.config {
    return {
        user: opts.user,
        password: opts.password || '',
        server: opts.server,
        database: opts.database,
        port: 1433,
        connectionTimeout: 30000,
        requestTimeout: 120000,
        options: {
            encrypt: false,
            trustServerCertificate: true,
            tdsVersion: '7_4',
            enableArithAbort: true,
            cryptoCredentialsDetails: {
                minVersion: 'TLSv1',
            },
        },
    };
}

async function connectPool(
    getPool: () => sql.ConnectionPool | undefined,
    setPool: (pool: sql.ConnectionPool | undefined) => void,
    getPromise: () => Promise<sql.ConnectionPool> | undefined,
    setPromise: (promise: Promise<sql.ConnectionPool> | undefined) => void,
    config: sql.config,
    label: string,
): Promise<sql.ConnectionPool> {
    const existing = getPool();
    if (existing?.connected) return existing;
    const inflight = getPromise();
    if (inflight) return inflight;

    const pool = new sql.ConnectionPool(config);
    pool.on('error', (err) => {
        console.error(`${label} pool error:`, err);
        if (getPool() === pool) setPool(undefined);
        setPromise(undefined);
    });

    const promise = pool
        .connect()
        .then((connected) => {
            setPool(connected);
            setPromise(undefined);
            return connected;
        })
        .catch(async (err) => {
            setPool(undefined);
            setPromise(undefined);
            await pool.close().catch(() => undefined);
            console.error(`${label} connection failed:`, err);
            throw err;
        });

    setPromise(promise);
    return promise;
}

export async function getConnection() {
    return connectPool(
        () => g._sortKilnPool,
        (pool) => {
            g._sortKilnPool = pool;
        },
        () => g._sortKilnPoolPromise,
        (promise) => {
            g._sortKilnPoolPromise = promise;
        },
        makeConfig({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            server: process.env.DB_SERVER || 'localhost',
            database: process.env.DB_NAME || process.env.DB_DATABASE,
        }),
        'kilndb',
    );
}

export function isSdbConfigured(): boolean {
    const flag = (process.env.DB_SDB_ENABLED || '').toLowerCase();
    if (flag === '0' || flag === 'false') return false;
    return true;
}

export async function getSdbConnection() {
    return connectPool(
        () => g._sortSdbPool,
        (pool) => {
            g._sortSdbPool = pool;
        },
        () => g._sortSdbPoolPromise,
        (promise) => {
            g._sortSdbPoolPromise = promise;
        },
        makeConfig({
            user: process.env.DB_SDB_USER || process.env.DB_USER || 'sa',
            password: process.env.DB_SDB_PASSWORD ?? '',
            server: process.env.DB_SDB_SERVER || '192.168.2.19',
            database: process.env.DB_SDB_NAME || 'Db_Sorting_SDB',
        }),
        'Db_Sorting_SDB',
    );
}

export { sql };
