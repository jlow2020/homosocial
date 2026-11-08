import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MINIS, MINI_BY_ID, MINI_WHO_MIN, type Mini } from "./minis";
import { targetHeat } from "./engine";
import { wakingHours, type Clock } from "./clock";
import { notify } from "@/lib/notify";

const HOUR = 3600 * 1000;
// Answers lock Sunday 8pm, the night before the next drop.
const LOCK_BEFORE_DROP = 11 * HOUR;

type CircleLike = { id: string; season_no: number; heat_boost?: number; tz?: string | null };

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// When this week's minis close.
export function weekEnd(clock: Extract<Clock, { phase: "season" }>): Date {
  return clock.nextDrop ? new Date(clock.nextDrop.getTime() - LOCK_BEFORE_DROP) : clock.finaleAt;
}

// Two minis, evenly spaced over what's left of his week after he plays. Late in
// the week: one, or none if there isn't time to enjoy it.
export function miniUnlocks(playedAt: Date, end: Date, tz?: string | null): Date[] {
  const left = end.getTime() - playedAt.getTime();
  const at = (f: number) => {
    const d = wakingHours(new Date(playedAt.getTime() + left * f), tz ?? undefined);
    return d < end ? d : new Date(end.getTime() - HOUR);
  };
  if (left >= 24 * HOUR) return [at(1 / 3), at(2 / 3)];
  if (left >= 8 * HOUR) return [at(1 / 2)];
  return [];
}

// This week's two minis for a Circle, picked the first time anyone needs them.
// Nothing anyone here has answered before, the heat of the week, and the two
// slots are different kinds so it doesn't feel like the same question twice.
export async function ensureMinis(db: SupabaseClient, circle: CircleLike, week: number, memberIds: string[]): Promise<Mini[]> {
  const find = () => db.from("minis").select("slot, mini_id").eq("circle_id", circle.id).eq("season_no", circle.season_no).eq("week", week).order("slot");
  const { data: have } = await find();
  if (have?.length === 2) return have.map((r) => MINI_BY_ID.get(r.mini_id as string)).filter(Boolean) as Mini[];

  const [{ data: used }, { data: answered }] = await Promise.all([
    db.from("minis").select("mini_id").eq("circle_id", circle.id),
    memberIds.length ? db.from("mini_answers").select("mini_id").in("user_id", memberIds) : Promise.resolve({ data: [] as { mini_id: string }[] }),
  ]);
  const seen = new Set([...(used ?? []), ...(answered ?? [])].map((r) => r.mini_id as string));
  const heat = targetHeat(circle, week);
  const room = memberIds.length >= MINI_WHO_MIN;
  let pool = MINIS.filter((m) => !seen.has(m.id) && (room || m.kind !== "who"));
  if (pool.length < 2) pool = MINIS.filter((m) => room || m.kind !== "who");
  const near = (list: Mini[]) => {
    const close = list.filter((m) => Math.abs(m.heat - heat) <= 1);
    return close.length ? close : list;
  };
  const seed = `${circle.id}:${circle.season_no}:${week}`;
  const first = near(pool)[hash(`${seed}:1`) % near(pool).length];
  const rest = pool.filter((m) => m.id !== first.id);
  const other = rest.filter((m) => m.kind !== first.kind);
  const second = near(other.length ? other : rest)[hash(`${seed}:2`) % near(other.length ? other : rest).length];

  await db.from("minis").upsert(
    [
      { circle_id: circle.id, season_no: circle.season_no, week, slot: 1, mini_id: first.id },
      { circle_id: circle.id, season_no: circle.season_no, week, slot: 2, mini_id: second.id },
    ],
    { onConflict: "circle_id,season_no,week,slot", ignoreDuplicates: true },
  );
  const { data: now } = await find();
  return (now ?? []).map((r) => MINI_BY_ID.get(r.mini_id as string)).filter(Boolean) as Mini[];
}

// When he played this week's main drop, if he has.
export async function playedAt(db: SupabaseClient, dropId: string, userId: string): Promise<Date | null> {
  const { data } = await db.from("answers").select("created_at").eq("drop_id", dropId).eq("user_id", userId).maybeSingle();
  return data?.created_at ? new Date(data.created_at as string) : null;
}

export type MiniItem = {
  slot: number;
  mini: Mini;
  unlockAt: Date;
  open: boolean;
  mine: { choice: number | null; pick_user: string | null } | null;
  // Shown once he's answered: votes per option, or per guy for "who".
  results: { label: string; id?: string; votes: number }[] | null;
  total: number;
};

export type MiniState = { week: number; locked: boolean; endsAt: Date; items: MiniItem[] };

export async function miniState(
  db: SupabaseClient,
  circle: CircleLike,
  clock: Clock,
  dropId: string,
  me: string,
  members: { id: string; first_name: string | null }[],
  now = new Date(),
): Promise<MiniState | null> {
  if (clock.phase !== "season") return null;
  const end = weekEnd(clock);
  const played = await playedAt(db, dropId, me);
  if (!played) return { week: clock.week, locked: true, endsAt: end, items: [] };
  const unlocks = miniUnlocks(played, end, circle.tz);
  if (!unlocks.length) return { week: clock.week, locked: false, endsAt: end, items: [] };
  const minis = await ensureMinis(db, circle, clock.week, members.map((m) => m.id));
  const { data: answers } = await db
    .from("mini_answers")
    .select("slot, user_id, choice, pick_user")
    .eq("circle_id", circle.id)
    .eq("season_no", circle.season_no)
    .eq("week", clock.week);
  const name = new Map(members.map((m) => [m.id, m.first_name ?? "Someone"]));
  const items: MiniItem[] = [];
  unlocks.forEach((at, i) => {
    const slot = i + 1;
    const mini = minis[i];
    if (!mini) return;
    const rows = (answers ?? []).filter((a) => a.slot === slot);
    const mineRow = rows.find((a) => a.user_id === me);
    let results: MiniItem["results"] = null;
    if (mineRow) {
      if (mini.kind === "who") {
        const tally = new Map<string, number>();
        for (const r of rows) if (r.pick_user && name.has(r.pick_user as string)) tally.set(r.pick_user as string, (tally.get(r.pick_user as string) ?? 0) + 1);
        results = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, votes]) => ({ id, label: name.get(id)!, votes }));
      } else {
        results = (mini.options ?? []).map((label, idx) => ({ label, votes: rows.filter((r) => r.choice === idx).length }));
      }
    }
    items.push({
      slot,
      mini,
      unlockAt: at,
      open: now >= at && now < end,
      mine: mineRow ? { choice: (mineRow.choice as number | null) ?? null, pick_user: (mineRow.pick_user as string | null) ?? null } : null,
      results,
      total: rows.length,
    });
  });
  return { week: clock.week, locked: false, endsAt: end, items };
}

// Run by the clock: a push to each guy the moment one of his minis unlocks.
export async function pingMinis(
  db: SupabaseClient,
  circle: CircleLike,
  clock: Clock,
  memberIds: string[],
  now = new Date(),
): Promise<number> {
  if (clock.phase !== "season" || !memberIds.length) return 0;
  const end = weekEnd(clock);
  if (now >= end) return 0;
  const { data: drop } = await db.from("drops").select("id").eq("circle_id", circle.id).eq("season_no", circle.season_no).eq("week", clock.week).maybeSingle();
  if (!drop) return 0;
  const { data: played } = await db.from("answers").select("user_id, created_at").eq("drop_id", drop.id).in("user_id", memberIds);
  const due: { user_id: string; slot: number }[] = [];
  for (const a of played ?? []) {
    miniUnlocks(new Date(a.created_at as string), end, circle.tz).forEach((at, i) => {
      if (at <= now) due.push({ user_id: a.user_id as string, slot: i + 1 });
    });
  }
  if (!due.length) return 0;
  const minis = await ensureMinis(db, circle, clock.week, memberIds);
  const { data: claimed } = await db
    .from("mini_pings")
    .upsert(
      due.map((d) => ({ ...d, circle_id: circle.id, season_no: circle.season_no, week: clock.week })),
      { onConflict: "user_id,circle_id,season_no,week,slot", ignoreDuplicates: true },
    )
    .select("user_id, slot");
  for (const c of claimed ?? []) {
    const m = minis[(c.slot as number) - 1];
    if (!m) continue;
    await notify(db, [c.user_id as string], { title: "New mini 🔥", body: m.q.length > 90 ? m.q.slice(0, 89) + "…" : m.q, url: "/circle#mini", tag: "mini" });
  }
  return claimed?.length ?? 0;
}
