import { createClient, type PostgrestError } from "@supabase/supabase-js";

function getSupabaseConfig() {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local (same as plankiln / glaze-kiln-ops).",
    );
  }

  return { supabaseUrl, supabaseKey };
}

let client: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (!client) {
    const { supabaseUrl, supabaseKey } = getSupabaseConfig();
    client = createClient(supabaseUrl, supabaseKey);
  }
  return client;
}

export function throwPostgrest(error: PostgrestError): never {
  const parts = [error.message, error.details, error.hint].filter(
    (x): x is string => typeof x === "string" && x.trim().length > 0,
  );
  const body = parts.join(" — ") || "Database request failed";
  throw new Error(error.code ? `${body} (${error.code})` : body);
}
