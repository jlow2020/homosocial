import "server-only";
import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ConsentKind = "terms" | "biometric";

// A dated record of what he agreed to, which version, and from what device.
// This is what makes the Terms enforceable.
export async function recordConsent(db: SupabaseClient, userId: string, kind: ConsentKind, version: string): Promise<void> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || null;
  await db
    .from("consents")
    .upsert(
      { user_id: userId, kind, version, user_agent: h.get("user-agent")?.slice(0, 300) ?? null, ip },
      { onConflict: "user_id,kind,version", ignoreDuplicates: true }
    );
  if (kind === "terms") await db.from("logins").update({ terms_version: version, terms_at: new Date().toISOString() }).eq("user_id", userId);
}

export async function hasConsent(db: SupabaseClient, userId: string, kind: ConsentKind, version: string): Promise<boolean> {
  const { count } = await db.from("consents").select("id", { count: "exact", head: true }).match({ user_id: userId, kind, version });
  return (count ?? 0) > 0;
}
