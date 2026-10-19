import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PROMPTS, PROMPT_BY_ID, modeOf, type Mode } from "./prompts";
import { FORMATS } from "./templates";
import { DEMO_PROMPT } from "./demo";

// The drop engine. Each layer tries to produce a drop this Circle has never
// seen, at this week's heat. If it can't, the next layer takes over, so there's
// always something fresh. In order:
//   0. Daddy's Pick: a pinned prompt for this week, every Circle gets it next.
//   1. Member-written drops, approved in Admin. Credited by name.
//   2. A follow-up on last week's most-reacted answer. New by definition.
//   3. Formats with a slot: a working joke plus a plug-in with the heat.
//   4. The house bank in code.
//   5. Re-skin: a seen confession prompt run as Guess Who.
//   6. Last resort: the house prompt this Circle saw longest ago.
// Nothing here is machine-written. Everything was typed by a person.

export type Chosen = {
  key: string; // what gets remembered, so it never repeats for these guys
  body: string;
  hint: string | null;
  mode: Mode;
  heat: number;
  source: "daddy" | "member" | "followup" | "template" | "house" | "reskin" | "repeat";
  credit: string | null;
  bankId?: string;
};

type CircleLike = { id: string; season_no: number; is_test: boolean; heat_boost?: number };

// How hot each week runs in a Circle's first Season. Climbs one notch per Season
// and one per heat vote, capped at 5.
const WEEK_HEAT: Record<number, number> = { 1: 2, 2: 3, 3: 3, 4: 4, 5: 4, 6: 3, 7: 3, 8: 3 };

export function targetHeat(circle: CircleLike, week: number): number {
  return Math.min(5, WEEK_HEAT[week] + (circle.season_no - 1) + (circle.heat_boost ?? 0));
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// Deterministic per Circle and week, so two page loads agree.
function pickFrom<T>(list: T[], seed: string): T {
  return list[hash(seed) % list.length];
}

function onHeat<T extends { heat: number }>(list: T[], target: number): T[] {
  // Exactly the target first, then one notch either way, then anything.
  const exact = list.filter((x) => x.heat === target);
  if (exact.length) return exact;
  const near = list.filter((x) => Math.abs(x.heat - target) === 1);
  return near.length ? near : list;
}

// Everything anyone in this Circle has already seen, in any Circle, any Season,
// plus the keys of this Circle's own drops (so a half-finished week counts).
async function seenKeys(db: SupabaseClient, circleId: string): Promise<{ seen: Set<string>; last: string | null }> {
  const { data: members } = await db.from("profiles").select("id").eq("circle_id", circleId);
  const ids = (members ?? []).map((m) => m.id as string);
  const seen = new Set<string>();
  const { data: own } = await db.from("drops").select("prompt_id, week, season_no").eq("circle_id", circleId).order("season_no").order("week");
  for (const d of own ?? []) seen.add(d.prompt_id as string);
  const last = own?.length ? (own[own.length - 1].prompt_id as string) : null;
  if (ids.length) {
    const { data: answered } = await db.from("answers").select("drops(prompt_id)").in("user_id", ids);
    for (const a of (answered ?? []) as unknown as { drops: { prompt_id: string } | null }[]) {
      if (a.drops?.prompt_id) seen.add(a.drops.prompt_id);
    }
  }
  return { seen, last };
}

// Layer 0 and 1: the bank in the database.
async function fromBank(db: SupabaseClient, circle: CircleLike, week: number, heat: number, seen: Set<string>): Promise<Chosen | null> {
  const { data } = await db
    .from("prompt_bank")
    .select("id, body, hint, heat, mode, credit, source, pinned, times_used")
    .eq("status", "approved")
    .eq("week", week);
  const rows = (data ?? []).filter((r) => !seen.has(`bank:${r.id}`));
  if (!rows.length) return null;
  const pinned = rows.filter((r) => r.pinned);
  const pool = pinned.length ? pinned : onHeat(rows.filter((r) => r.source === "member"), heat);
  if (!pool.length) return null;
  // Least used first, so every member's drop gets its turn.
  const least = Math.min(...pool.map((r) => r.times_used as number));
  const r = pickFrom(pool.filter((x) => x.times_used === least), `${circle.id}:${circle.season_no}:${week}:bank`);
  return {
    key: `bank:${r.id}`,
    body: r.body,
    hint: r.hint,
    mode: r.mode as Mode,
    heat: r.heat,
    source: r.pinned ? "daddy" : "member",
    credit: r.credit,
    bankId: r.id,
  };
}

// Layer 2: last week's top answer becomes this week's question.
const FOLLOWUPS: ((name: string, quote: string) => { body: string; mode: Mode; heat: number })[] = [
  (n, q) => ({ body: `${n} said: "${q}" Everyone else: top that.`, mode: "text", heat: 3 }),
  (n, q) => ({ body: `Last week ${n} wrote "${q}" and the Circle lost it. Follow-up question for ${n}, and anyone else brave enough: what happened next?`, mode: "text", heat: 4 }),
  (n, q) => ({ body: `"${q}" (${n}, last week). Agree or disagree, and show your work.`, mode: "text", heat: 3 }),
  (n, q) => ({ body: `${n}'s answer last week was "${q}" Tell us the version of that story you'd never put your name on.`, mode: "anon", heat: 4 }),
];

async function fromFollowup(db: SupabaseClient, circle: CircleLike, week: number, heat: number, seen: Set<string>): Promise<Chosen | null> {
  if (week < 3 || week === 7 || week === 8) return null;
  const { data: prev } = await db
    .from("drops")
    .select("id, mode")
    .eq("circle_id", circle.id)
    .eq("season_no", circle.season_no)
    .eq("week", week - 1)
    .maybeSingle();
  if (!prev || prev.mode === "anon" || prev.mode === "guesswho" || prev.mode === "photo") return null;
  const { data: answers } = await db
    .from("answers")
    .select("id, body, user_id, passed, reactions(user_id), profiles!answers_user_id_fkey(first_name, is_demo)")
    .eq("drop_id", prev.id);
  type Row = { id: string; body: string | null; passed: boolean; reactions: unknown[]; profiles: { first_name: string } | null };
  const ranked = ((answers ?? []) as unknown as Row[])
    .filter((a) => !a.passed && a.body && a.body.length >= 20 && a.body.length <= 160 && a.profiles)
    .sort((a, b) => b.reactions.length - a.reactions.length);
  const top = ranked[0];
  if (!top || top.reactions.length < 3 || seen.has(`fu:${top.id}`)) return null;
  const quote = top.body!.trim().replace(/\s+/g, " ");
  const pool = onHeat(
    FOLLOWUPS.map((f, i) => ({ i, ...f(top.profiles!.first_name, quote) })),
    heat
  );
  const f = pickFrom(pool, `${circle.id}:${circle.season_no}:${week}:fu`);
  return { key: `fu:${top.id}`, body: f.body, hint: null, mode: f.mode, heat: f.heat, source: "followup", credit: null };
}

// Layer 3: formats with a slot.
function fromTemplate(circle: CircleLike, week: number, heat: number, seen: Set<string>, last: string | null): Chosen | null {
  const lastFormat = last?.startsWith("tpl:") ? last.split(":")[1] : null;
  const combos: { key: string; fmt: (typeof FORMATS)[number]; plug: (typeof FORMATS)[number]["plugs"][number]; heat: number }[] = [];
  for (const fmt of FORMATS) {
    if (!fmt.weeks.includes(week) || fmt.id === lastFormat) continue;
    for (const plug of fmt.plugs) {
      const key = `tpl:${fmt.id}:${plug.id}`;
      // A plug that also exists as a confession is the same question: treat as seen.
      if (seen.has(key) || seen.has(`tpl:confess:${plug.id}`) || seen.has(`tpl:guesswho:${plug.id}`)) continue;
      combos.push({ key, fmt, plug, heat: Math.max(fmt.heat, plug.heat) });
    }
  }
  if (!combos.length) return null;
  const c = pickFrom(onHeat(combos, heat), `${circle.id}:${circle.season_no}:${week}:tpl`);
  return { key: c.key, body: c.fmt.render(c.plug.text), hint: c.fmt.hint ?? null, mode: c.fmt.mode, heat: c.heat, source: "template", credit: null };
}

// Layer 4: the house bank.
function fromHouse(circle: CircleLike, week: number, heat: number, seen: Set<string>): Chosen | null {
  const pool = PROMPTS.filter((p) => p.week === week && !seen.has(p.id)).map((p) => ({ ...p, heat: p.heat ?? 2 }));
  if (!pool.length) return null;
  const p = pickFrom(onHeat(pool, heat), `${circle.id}:${circle.season_no}:${week}:house`);
  return { key: p.id, body: p.body, hint: p.hint ?? null, mode: modeOf(p), heat: p.heat, source: "house", credit: null };
}

// Layer 5: a confession they've answered before, now as Guess Who.
function fromReskin(circle: CircleLike, week: number, seen: Set<string>): Chosen | null {
  if (week < 3) return null;
  const pool = PROMPTS.filter((p) => p.anon && seen.has(p.id) && !seen.has(`mode:guesswho:${p.id}`));
  if (!pool.length) return null;
  const p = pickFrom(pool, `${circle.id}:${circle.season_no}:${week}:reskin`);
  return {
    key: `mode:guesswho:${p.id}`,
    body: `Guess Who edition: ${p.body}`,
    hint: "You've answered this before. This time the Circle guesses who wrote what.",
    mode: "guesswho",
    heat: p.heat ?? 4,
    source: "reskin",
    credit: null,
  };
}

// Layer 6: never leave a Circle without a drop.
function fromRepeat(circle: CircleLike, week: number): Chosen {
  const pool = PROMPTS.filter((p) => p.week === week);
  const p = pickFrom(pool, `${circle.id}:${circle.season_no}:${week}:repeat`);
  return { key: `rep:${circle.season_no}:${p.id}`, body: p.body, hint: p.hint ?? null, mode: modeOf(p), heat: p.heat ?? 2, source: "repeat", credit: null };
}

export async function chooseDrop(db: SupabaseClient, circle: CircleLike, week: number): Promise<Chosen> {
  // Test Circles in their first Season use the prompts the fake guys have lines for.
  if (circle.is_test && circle.season_no === 1) {
    const p = PROMPT_BY_ID.get(DEMO_PROMPT[week]);
    if (p) return { key: p.id, body: p.body, hint: p.hint ?? null, mode: modeOf(p), heat: p.heat ?? 3, source: "house", credit: null };
  }
  const heat = targetHeat(circle, week);
  const { seen, last } = await seenKeys(db, circle.id);
  return (
    (await fromBank(db, circle, week, heat, seen)) ??
    (await fromFollowup(db, circle, week, heat, seen)) ??
    fromTemplate(circle, week, heat, seen, last) ??
    fromHouse(circle, week, heat, seen) ??
    fromReskin(circle, week, seen) ??
    fromRepeat(circle, week)
  );
}
