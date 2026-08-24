import { getConnection, sql } from "@/lib/db";

export type ForecastSource = "ww" | "bw" | "dw";

export interface ShipmentForecastRow {
  order: string;
  item: string;
  desc1: string;
  desc2: string;
  customer: string;
  mdate: string;
  balGlaze: number;
  mainQty: number;
  planningYieldPct: number | null;
}

export interface ActualYieldRates {
  process: number;
  good: number;
  repair: number;
  scrap: number;
  goodRate: number;
  repairRate: number;
  scrapRate: number;
  sampleJobs: number;
}

function pairKey(job: string, part: string): string {
  return `${job.trim().toUpperCase()}|${part.trim()}`;
}

export function parseQty(raw: string | number | null | undefined): number {
  if (raw == null || raw === "") return 0;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  const num = parseFloat(String(raw).replace(/,/g, ""));
  return Number.isFinite(num) ? num : 0;
}

export function parseYieldPct(raw: string | number | null | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = parseQty(raw);
  if (!n) return null;
  if (n > 0 && n <= 1.5) return n * 100;
  return n;
}

/**
 * Actual yield (C/C1) keyed by m_job + m_part.
 */
export async function fetchActualYieldByJobPart(
  pairs: Array<{ job: string; part: string }>,
  startDate?: string,
): Promise<Map<string, ActualYieldRates>> {
  const unique = new Map<string, { job: string; part: string }>();
  for (const p of pairs) {
    const job = p.job.trim();
    const part = p.part.trim();
    if (!job || !part) continue;
    unique.set(pairKey(job, part), { job, part });
  }

  const map = new Map<string, ActualYieldRates>();
  if (unique.size === 0) return map;

  const pool = await getConnection();
  const from = startDate || `${new Date().getFullYear() - 1}-01-01`;
  const list = [...unique.values()];
  const chunkSize = 30;

  for (let i = 0; i < list.length; i += chunkSize) {
    const chunk = list.slice(i, i + chunkSize);
    const req = pool.request();
    req.input("startDate", sql.VarChar, from);

    const ors = chunk.map((p, idx) => {
      req.input(`j${idx}`, sql.NVarChar, p.job.trim().toUpperCase());
      req.input(`p${idx}`, sql.NVarChar, p.part.trim());
      return `(UPPER(RTRIM(LTRIM(m_job))) = @j${idx} AND RTRIM(LTRIM(m_part)) = @p${idx})`;
    });

    const result = await req.query(`
      SELECT
        UPPER(RTRIM(LTRIM(m_job))) AS job,
        RTRIM(LTRIM(m_part)) AS part,
        COUNT(*) AS sample_jobs,
        SUM(qtyp) AS process_qty,
        SUM(qtycomp) AS good_qty,
        SUM(qtyrjct) AS repair_qty,
        SUM(qtyscrp) AS scrap_qty
      FROM (
        SELECT
          m_job, m_part, m_doc, m_date, m_kiln,
          UPPER(RTRIM(LTRIM(m_cp))) AS cp,
          MAX(qtyp) AS qtyp,
          MAX(qtycomp) AS qtycomp,
          MAX(qtyrjct) AS qtyrjct,
          MAX(qtyscrp) AS qtyscrp
        FROM dbo.v_rpt_sort_1 WITH (NOLOCK)
        WHERE m_date >= @startDate
          AND UPPER(RTRIM(LTRIM(m_cp))) IN ('C', 'C1')
          AND (${ors.join(" OR ")})
        GROUP BY m_job, m_part, m_doc, m_date, m_kiln, UPPER(RTRIM(LTRIM(m_cp)))
      ) jobs
      GROUP BY UPPER(RTRIM(LTRIM(m_job))), RTRIM(LTRIM(m_part))
      OPTION (RECOMPILE)
    `);

    for (const row of result.recordset as Array<{
      job: string;
      part: string;
      sample_jobs: number;
      process_qty: number;
      good_qty: number;
      repair_qty: number;
      scrap_qty: number;
    }>) {
      const process = Number(row.process_qty) || 0;
      const good = Number(row.good_qty) || 0;
      const repair = Number(row.repair_qty) || 0;
      const scrap = Number(row.scrap_qty) || 0;
      map.set(pairKey(row.job, row.part), {
        process,
        good,
        repair,
        scrap,
        goodRate: process > 0 ? good / process : 0,
        repairRate: process > 0 ? repair / process : 0,
        scrapRate: process > 0 ? scrap / process : 0,
        sampleJobs: Number(row.sample_jobs) || 0,
      });
    }
  }

  return map;
}

/**
 * Fallback actual yield keyed by m_part only (historical item yield).
 */
export async function fetchActualYieldByPart(
  parts: string[],
  startDate?: string,
): Promise<Map<string, ActualYieldRates>> {
  const unique = [...new Set(parts.map((p) => p.trim()).filter(Boolean))];
  const map = new Map<string, ActualYieldRates>();
  if (unique.length === 0) return map;

  const pool = await getConnection();
  const from = startDate || `${new Date().getFullYear() - 1}-01-01`;
  const chunkSize = 40;

  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const req = pool.request();
    req.input("startDate", sql.VarChar, from);
    const inList = chunk.map((p, idx) => {
      req.input(`p${idx}`, sql.NVarChar, p);
      return `@p${idx}`;
    });

    const result = await req.query(`
      SELECT
        RTRIM(LTRIM(m_part)) AS part,
        COUNT(*) AS sample_jobs,
        SUM(qtyp) AS process_qty,
        SUM(qtycomp) AS good_qty,
        SUM(qtyrjct) AS repair_qty,
        SUM(qtyscrp) AS scrap_qty
      FROM (
        SELECT
          m_part, m_doc, m_job, m_date, m_kiln,
          UPPER(RTRIM(LTRIM(m_cp))) AS cp,
          MAX(qtyp) AS qtyp,
          MAX(qtycomp) AS qtycomp,
          MAX(qtyrjct) AS qtyrjct,
          MAX(qtyscrp) AS qtyscrp
        FROM dbo.v_rpt_sort_1 WITH (NOLOCK)
        WHERE m_date >= @startDate
          AND UPPER(RTRIM(LTRIM(m_cp))) IN ('C', 'C1')
          AND RTRIM(LTRIM(m_part)) IN (${inList.join(",")})
        GROUP BY m_part, m_doc, m_job, m_date, m_kiln, UPPER(RTRIM(LTRIM(m_cp)))
      ) jobs
      GROUP BY RTRIM(LTRIM(m_part))
      OPTION (RECOMPILE)
    `);

    for (const row of result.recordset as Array<{
      part: string;
      sample_jobs: number;
      process_qty: number;
      good_qty: number;
      repair_qty: number;
      scrap_qty: number;
    }>) {
      const process = Number(row.process_qty) || 0;
      const good = Number(row.good_qty) || 0;
      const repair = Number(row.repair_qty) || 0;
      const scrap = Number(row.scrap_qty) || 0;
      map.set(row.part.trim(), {
        process,
        good,
        repair,
        scrap,
        goodRate: process > 0 ? good / process : 0,
        repairRate: process > 0 ? repair / process : 0,
        scrapRate: process > 0 ? scrap / process : 0,
        sampleJobs: Number(row.sample_jobs) || 0,
      });
    }
  }

  return map;
}

export { pairKey as jobPartKey };

export type ForecastMatchType = "order" | "item" | "none";

export interface ForecastLineDto {
  order: string;
  item: string;
  desc1: string;
  desc2: string;
  customer: string;
  mdate: string;
  balGlaze: number;
  mainQty: number;
  planningYieldPct: number | null;
  actualGoodPct: number | null;
  actualRepairPct: number | null;
  actualScrapPct: number | null;
  yieldGapPct: number | null;
  actualSampleJobs: number;
  processQty: number;
  goodQty: number;
  matchType: ForecastMatchType;
}
