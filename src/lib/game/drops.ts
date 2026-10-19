import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PROMPTS, PROMPT_BY_ID, type Prompt } from "./prompts";
import { DEMO_PROMPT } from "./demo";

export type Drop = { id: string; circle_id: string; season_no: number; week: number; prompt_id: string; created_at: string };

type CircleLike = { id: string; season_no: number; is_test: boolean };

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// Prompts anyone in this Circle has already seen, in any Circle, any Season.
async function seenPrompts(db: SupabaseClient, circleId: string): Promise<Set<string>> {
  const { data: members } = await db.from("profiles").select("id").eq("circle_id", circleId);
  const ids = (members ?? []).map((m) => m.id as string);
  const seen = new Set<string>();
  const { data: own } = await db.from("drops").select("prompt_id").eq("circle_id", circleId);
  for (const d of own ?? []) seen.add(d.prompt_id as string);
  if (ids.length) {
    const { data: answered } = await db.from("answers").select("drops(prompt_id)").in("user_id", ids);
    for (const a of (answered ?? []) as unknown as { drops: { prompt_id: string } | null }[]) {
      if (a.drops?.prompt_id) seen.add(a.drops.prompt_id);
    }
  }
  return seen;
}

function pickPrompt(circle: CircleLike, week: number, seen: Set<string>): Prompt {
  // Test Circles use the prompts the fake guys have answers for, in Season 1.
  if (circle.is_test && circle.season_no === 1) {
    const p = PROMPT_BY_ID.get(DEMO_PROMPT[week]);
    if (p) return p;
  }
  const pool = PROMPTS.filter((p) => p.week === week);
  const fresh = pool.filter((p) => !seen.has(p.id));
  const from = fresh.length ? fresh : pool; // The bank ran dry for this week: time to write more.
  return from[hash(`${circle.id}:${circle.season_no}:${week}`) % from.length];
}

// This week's drop for a Circle, created the first time anyone looks.
export async function ensureDrop(db: SupabaseClient, circle: CircleLike, week: number): Promise<Drop> {
  const find = () =>
    db.from("drops").select("*").eq("circle_id", circle.id).eq("season_no", circle.season_no).eq("week", week).maybeSingle();
  const { data: existing } = await find();
  if (existing) return existing as Drop;
  const prompt = pickPrompt(circle, week, await seenPrompts(db, circle.id));
  await db
    .from("drops")
    .upsert(
      { circle_id: circle.id, season_no: circle.season_no, week, prompt_id: prompt.id },
      { onConflict: "circle_id,season_no,week", ignoreDuplicates: true }
    );
  const { data } = await find();
  return data as Drop;
}

export function promptOf(drop: Drop): Prompt {
  return (
    PROMPT_BY_ID.get(drop.prompt_id) ?? { id: drop.prompt_id, week: drop.week, kind: "text", body: "This week's drop." }
  );
}
