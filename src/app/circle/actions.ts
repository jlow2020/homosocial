"use server";

import { revalidatePath } from "next/cache";
import { getMe, getSupabaseAdmin } from "@/lib/supabase-server";

const REASONS = ["fake", "harassment", "underage", "scam", "other"] as const;

async function guard(targetId: string) {
  const me = await getMe();
  const db = getSupabaseAdmin();
  if (!me?.profile?.verified_at || !db) return null;
  if (!/^[0-9a-f-]{36}$/i.test(targetId) || targetId === me.userId) return null;
  return { me, db };
}

export async function blockMember(targetId: string): Promise<{ ok: boolean }> {
  const g = await guard(targetId);
  if (!g) return { ok: false };
  await g.db.from("blocks").upsert(
    { blocker: g.me.userId, blocked: targetId },
    { onConflict: "blocker,blocked", ignoreDuplicates: true }
  );
  revalidatePath("/circle");
  return { ok: true };
}

export async function reportMember(
  targetId: string,
  reason: string,
  details: string
): Promise<{ ok: boolean; error?: string }> {
  const g = await guard(targetId);
  if (!g) return { ok: false, error: "That didn't work. Refresh and try again." };
  if (!REASONS.includes(reason as (typeof REASONS)[number])) {
    return { ok: false, error: "Pick a reason." };
  }
  const { error } = await g.db
    .from("reports")
    .insert({ reporter: g.me.userId, reported: targetId, reason, details: details.trim().slice(0, 1000) || null });
  // 23505: he already reported this guy. That's fine.
  if (error && error.code !== "23505") return { ok: false, error: "Your report didn't send. Try again." };
  // Reporting someone also blocks him.
  await g.db.from("blocks").upsert(
    { blocker: g.me.userId, blocked: targetId },
    { onConflict: "blocker,blocked", ignoreDuplicates: true }
  );
  revalidatePath("/circle");
  return { ok: true };
}
