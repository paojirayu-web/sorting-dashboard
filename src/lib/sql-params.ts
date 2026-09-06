import { sql } from '@/lib/db';

/**
 * Bind YYYY-MM-DD without an mssql type token.
 * Passing sql.Date / sql.NVarChar across two ConnectionPools can throw
 * "parameter.type.validate is not a function".
 */
export function bindIsoDate(req: sql.Request, name: string, isoDate: string): sql.Request {
    return req.input(name, isoDate);
}

/** NVARCHAR literal for interpolated SQL (escapes single quotes). */
export function sqlNString(value: string): string {
    return `N'${String(value).replace(/'/g, "''")}'`;
}

