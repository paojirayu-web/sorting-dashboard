import { NextRequest, NextResponse } from "next/server";
import { getSupabase, throwPostgrest } from "@/lib/supabase";
import { parseYieldPct } from "@/lib/forecast-yield";

export const dynamic = "force-dynamic";

type ShipmentYieldRow = {
  item?: string | null;
  desc1?: string | null;
  yield_pct?: string | number | null;
  order?: string | null;
  mdate?: string | null;
};

type ShipmentSource = "ww" | "bw" | "dw";

const TABLES: { source: ShipmentSource; table: string }[] = [
  { source: "ww", table: "shipment_ww" },
  { source: "bw", table: "shipment_bw" },
  { source: "dw", table: "shipment_dw" },
];

function preferredSources(part: string | null): ShipmentSource[] {
  if (part?.startsWith("143")) return ["dw", "ww", "bw"];
  if (part?.startsWith("142")) return ["ww", "bw", "dw"];
  return ["ww", "bw", "dw"];
}

async function fetchByItem(table: string, item: string): Promise<ShipmentYieldRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(table)
    .select("item,desc1,yield_pct,order,mdate")
    .eq("item", item)
    .not("yield_pct", "is", null)
    .limit(200);
  if (error) throwPostgrest(error);
  return (data as ShipmentYieldRow[] | null) ?? [];
}

async function fetchByDesc1(table: string, desc1: string): Promise<ShipmentYieldRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(table)
    .select("item,desc1,yield_pct,order,mdate")
    .eq("desc1", desc1)
    .not("yield_pct", "is", null)
    .limit(200);
  if (error) throwPostgrest(error);
  return (data as ShipmentYieldRow[] | null) ?? [];
}

function averageYield(rows: ShipmentYieldRow[]): number | null {
  const vals = rows
    .map((r) => parseYieldPct(r.yield_pct ?? null))
    .filter((n): n is number => n != null && Number.isFinite(n));
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/**
 * Planning yield for a product from V3 shipment tables (yield_pct).
 * Prefer match by item (m_part), then by desc1 (pt_desc1).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const desc1 = (searchParams.get("desc1") || "").trim();
    const part = (searchParams.get("part") || "").trim() || null;

    if (!desc1 && !part) {
      return NextResponse.json(
        { error: "desc1 or part is required" },
        { status: 400 },
      );
    }

    const order = preferredSources(part);
    const tables = [...TABLES].sort(
      (a, b) => order.indexOf(a.source) - order.indexOf(b.source),
    );

    // 1) exact item match
    if (part) {
      for (const { source, table } of tables) {
        const rows = await fetchByItem(table, part);
        const planningYieldPct = averageYield(rows);
        if (planningYieldPct != null) {
          return NextResponse.json({
            planningYieldPct,
            match: "item",
            source,
            sampleRows: rows.length,
            desc1: rows[0]?.desc1 ?? desc1,
            item: part,
          });
        }
      }
    }

    // 2) desc1 match
    if (desc1) {
      for (const { source, table } of tables) {
        const rows = await fetchByDesc1(table, desc1);
        const planningYieldPct = averageYield(rows);
        if (planningYieldPct != null) {
          return NextResponse.json({
            planningYieldPct,
            match: "desc1",
            source,
            sampleRows: rows.length,
            desc1,
            item: rows[0]?.item ?? part,
          });
        }
      }
    }

    return NextResponse.json({
      planningYieldPct: null,
      match: "none",
      source: null,
      sampleRows: 0,
      desc1,
      item: part,
    });
  } catch (err) {
    console.error("[product-planning-yield]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to load planning yield",
      },
      { status: 500 },
    );
  }
}
