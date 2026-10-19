import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PROMPT_BY_ID, modeOf, type Mode } from "./prompts";
import { chooseDrop } from "./engine";
import type { PlaySpec } from "./plays";

export type Drop = {
  id: string;
  circle_id: string;
  season_no: number;
  week: number;
  prompt_id: string;
  body: string | null;
  hint: string | null;
  mode: Mode;
  heat: number;
  source: string;
  credit: string | null;
  spec: PlaySpec | null;
  created_at: string;
  locked_at: string | null;
  result: Record<string, unknown> | null;
};

// What a drop asks, as the player sees it.
export type DropView = {
  id: string;
  body: string;
  hint: string | null;
  mode: Mode;
  kind: "text" | "photo";
  anon: boolean;
  heat: number;
  credit: string | null;
  spec: PlaySpec | null;
};

type CircleLike = { id: string; season_no: number; is_test: boolean; heat_boost?: number };

// This week's drop for a Circle, chosen by the engine the first time anyone looks.
export async function ensureDrop(db: SupabaseClient, circle: CircleLike, week: number): Promise<Drop> {
  const find = () =>
    db.from("drops").select("*").eq("circle_id", circle.id).eq("season_no", circle.season_no).eq("week", week).maybeSingle();
  const { data: existing } = await find();
  if (existing) return existing as Drop;
  const c = await chooseDrop(db, circle, week);
  const { data: inserted } = await db
    .from("drops")
    .upsert(
      {
        circle_id: circle.id,
        season_no: circle.season_no,
        week,
        prompt_id: c.key,
        body: c.body,
        hint: c.hint,
        mode: c.mode,
        heat: c.heat,
        source: c.source,
        credit: c.credit,
        spec: c.spec ?? null,
      },
      { onConflict: "circle_id,season_no,week", ignoreDuplicates: true }
    )
    .select("id");
  if (inserted?.length && c.bankId) {
    const { data: row } = await db.from("prompt_bank").select("times_used").eq("id", c.bankId).single();
    await db.from("prompt_bank").update({ times_used: (row?.times_used ?? 0) + 1 }).eq("id", c.bankId);
  }
  const { data } = await find();
  return data as Drop;
}

export function promptOf(drop: Drop): DropView {
  // Drops from before the engine kept no snapshot: look them up in code.
  const legacy = drop.body ? null : PROMPT_BY_ID.get(drop.prompt_id);
  const mode: Mode = drop.body ? drop.mode : legacy ? modeOf(legacy) : "text";
  return {
    id: drop.id,
    body: drop.body ?? legacy?.body ?? "This week's drop.",
    hint: drop.hint ?? legacy?.hint ?? null,
    mode,
    kind: mode === "photo" ? "photo" : "text",
    anon: mode === "anon" || mode === "guesswho" || mode === "twotruths",
    heat: drop.heat ?? legacy?.heat ?? 2,
    credit: drop.credit ?? null,
    spec: drop.spec ?? null,
  };
}
