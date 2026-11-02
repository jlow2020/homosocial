"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getMe, getSupabaseAdmin } from "@/lib/supabase-server";
import { loadPlayer, PAST_COOKIE } from "@/lib/game/player";
import { placeMember } from "@/lib/game/place";

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

// The Season's over: he leaves his finished Circle (it stays readable) and gets
// a fresh one near him, new faces first.
export async function joinNextSeason(): Promise<void> {
  const jar = await cookies();
  jar.delete(PAST_COOKIE);
  const pl = await loadPlayer({ needSeat: true });
  // Looking back at an old Circle means he's already moved on.
  if (pl.past || pl.clock.phase !== "revealed") redirect("/circle");
  const old = pl.circle.id;
  await pl.db.from("profiles").update({ circle_id: null, home_circle_id: null, moved_from: null }).eq("id", pl.profile.id).eq("circle_id", old);
  const next = await placeMember(pl.db, pl.profile.id);
  if (!next) {
    // Couldn't place him: put him back rather than leave him nowhere.
    await pl.db.from("profiles").update({ circle_id: old }).eq("id", pl.profile.id).is("circle_id", null);
  } else {
    jar.set("hs_flash", encodeURIComponent(`Welcome to Season ${pl.seasonNo + 1}. Your old Circle is under Past Seasons whenever you want it.`), { path: "/", maxAge: 120, sameSite: "lax" });
  }
  redirect("/circle");
}
