import sql from 'mssql';

const config: sql.config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_NAME,
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

let pool: sql.ConnectionPool | null = null;

export async function getConnection() {
    if (pool) {
        return pool;
    }

    try {
        pool = await sql.connect(config);
        return pool;
    } catch (err) {
        console.error('Database connection failed:', err);
        throw err;
    }
}

export { sql };
