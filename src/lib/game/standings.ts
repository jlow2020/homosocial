import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Member } from "./player";

export type Standing = { id: string; fire: number; badges: { badge: string; label: string; week: number }[]; answered: number };

// Season standings: reactions earned, badges won, drops answered. The basis for
// Season awards and the Standings on the Sunday Read.
export async function standings(db: SupabaseClient, circle: { id: string; season_no: number }, members: Member[]): Promise<Standing[]> {
  const ids = new Set(members.map((m) => m.id));
  const { data: drops } = await db.from("drops").select("id").eq("circle_id", circle.id).eq("season_no", circle.season_no);
  const dropIds = (drops ?? []).map((d) => d.id as string);
  const rows = new Map<string, Standing>(members.map((m) => [m.id, { id: m.id, fire: 0, badges: [], answered: 0 }]));
  if (dropIds.length) {
    const { data: answers } = await db.from("answers").select("user_id, passed, reactions(user_id)").in("drop_id", dropIds);
    for (const a of (answers ?? []) as { user_id: string; passed: boolean; reactions: { user_id: string }[] }[]) {
      const r = rows.get(a.user_id);
      if (!r || a.passed) continue;
      r.answered++;
      r.fire += a.reactions.length;
    }
  }
  const { data: badges } = await db.from("badges").select("user_id, badge, label, week").eq("circle_id", circle.id).eq("season_no", circle.season_no).order("week");
  for (const b of badges ?? []) {
    if (ids.has(b.user_id)) rows.get(b.user_id)!.badges.push({ badge: b.badge, label: b.label, week: b.week });
  }
  return [...rows.values()].sort((a, b) => b.badges.length - a.badges.length || b.fire - a.fire);
}

// All of a guy's badges, every Season, newest first.
export async function badgesFor(db: SupabaseClient, userId: string): Promise<{ badge: string; label: string; season_no: number; week: number }[]> {
  const { data } = await db.from("badges").select("badge, label, season_no, week").eq("user_id", userId).order("created_at", { ascending: false });
  return (data ?? []) as { badge: string; label: string; season_no: number; week: number }[];
}
