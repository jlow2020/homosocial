import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

// Server-only client. Uses the service role key, so it must never be imported
// into a client component.
export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!client) {
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

export async function getTakenSpots(): Promise<number> {
  const db = getSupabaseAdmin();
  if (!db) return 0;
  const { count, error } = await db
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("status", "approved");
  if (error) return 0;
  return count ?? 0;
}
