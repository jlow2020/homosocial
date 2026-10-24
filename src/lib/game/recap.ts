import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BADGES, type WeekResult } from "./lock";
import { chemistryFor } from "./chemistry";
import type { Member } from "./player";

// "Your Season so far": his own season, in a few big numbers.
// Only things about him, only things he'd be glad to see.

export type Moment = { week: number | null; label: string; stat: string; line: string; tone: "hot" | "gold" | "mint" };

export async function myRecap(
  db: SupabaseClient,
  circle: { id: string; season_no: number },
  meId: string,
  members: Member[],
  currentWeek: number
): Promise<Moment[]> {
  const byId = new Map(members.map((m) => [m.id, m]));
  const name = (id: string) => byId.get(id)?.first_name ?? "Someone";
  const { data: drops } = await db.from("drops").select("id, week, mode, result").eq("circle_id", circle.id).eq("season_no", circle.season_no);
  const past = (drops ?? []).filter((d) => d.week < currentWeek);
  if (!past.length) return [];
  const weekOf = new Map(past.map((d) => [d.id as string, d.week as number]));
  const moments: Moment[] = [];

  // His best-received answer.
  const { data: mine } = await db
    .from("answers")
    .select("id, drop_id, passed, held, reactions(user_id)")
    .eq("user_id", meId)
    .in("drop_id", [...weekOf.keys()]);
  const best = ((mine ?? []) as { id: string; drop_id: string; passed: boolean; held: boolean; reactions: { user_id: string }[] }[])
    .filter((a) => !a.passed && !a.held)
    .sort((a, b) => b.reactions.length - a.reactions.length)[0];
  if (best && best.reactions.length >= 2) {
    const w = weekOf.get(best.drop_id)!;
    moments.push({ week: w, label: `Week ${w}`, stat: `${best.reactions.length} 🔥`, line: "on your answer. The Circle felt that one.", tone: "hot" });
  }

  // Badges he won.
  const { data: badges } = await db.from("badges").select("badge, label, week").eq("user_id", meId).eq("circle_id", circle.id).eq("season_no", circle.season_no).order("week", { ascending: false });
  for (const b of badges ?? []) {
    if (b.badge === "top") continue; // already told as the fire count above
    const meta = BADGES[b.badge as string];
    moments.push({
      week: b.week as number,
      label: `Week ${b.week}`,
      stat: meta?.emoji ?? "🏅",
      line: b.badge === "superlative" ? `The Circle voted you ${b.label}.` : b.badge === "rank" ? `Ranked first: ${b.label}.` : `${meta?.label ?? b.label}. That was you.`,
      tone: "gold",
    });
  }

  // How many he fooled in Two Truths.
  for (const d of past.filter((x) => x.mode === "twotruths" && x.result)) {
    const r = d.result as WeekResult;
    const a = (mine ?? []).find((x) => x.drop_id === d.id);
    const f = a && r.fooled?.[a.id as string];
    if (f && f.of >= 2 && f.fooled >= 1) {
      moments.push({ week: d.week, label: `Week ${d.week}`, stat: `${f.fooled} of ${f.of}`, line: "guys fell for your lie.", tone: "hot" });
    }
  }

  // Who he clicks with.
  const chem = await chemistryFor(db, circle, meId, members);
  if (chem.agreed && chem.agreed.of >= 5) {
    moments.push({ week: null, label: "This season", stat: `${chem.agreed.n} of ${chem.agreed.of}`, line: `times ${name(chem.agreed.id)} picked the same side as you.`, tone: "mint" });
  }
  if (chem.reactedToYou) {
    moments.push({ week: null, label: "This season", stat: `${chem.reactedToYou.n}×`, line: `${name(chem.reactedToYou.id)} reacted to your answers. More than anyone.`, tone: "mint" });
  }

  // Roses.
  if (currentWeek >= 7) {
    const { count } = await db.from("roses").select("id", { count: "exact", head: true }).eq("circle_id", circle.id).eq("season_no", circle.season_no).eq("to_id", meId).eq("held", false);
    if (count) moments.push({ week: 7, label: "Week 7", stat: `${count} 🌹`, line: count === 1 ? "Someone said something kind about you." : "guys said something kind about you, out loud.", tone: "gold" });
  }

  // Newest first, four at most, one of each kind before repeats.
  const seen = new Set<string>();
  return moments
    .sort((a, b) => (b.week ?? 0) - (a.week ?? 0))
    .filter((m) => {
      const k = m.stat.replace(/\d+/g, "#") + m.tone;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 4);
}
