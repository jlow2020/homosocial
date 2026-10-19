import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Drop } from "./drops";
import type { Member } from "./player";

// When a week ends its results lock: one winner, announced once, never
// changing on Thursday because three more guys ranked. Badges come out of it
// and stick to a guy across Seasons.

export type WeekResult = {
  answered: number;
  of: number;
  top?: { answer_id: string; user_id: string; reactions: number; body: string | null; photo_path: string | null; media_type: string | null };
  rank?: { category: string; winner: string; runner_up: string | null; ranked: number };
  guesser?: { user_id: string; right: number; of: number }; // Guess Who, Guess the Owner, Whose Text
  liar?: { user_id: string; fooled: number; of: number }; // Two Truths
  detective?: { user_id: string; right: number; of: number }; // Two Truths
  caption?: { answer_id: string; user_id: string; caption: string; reactions: number };
  story?: { answer_id: string; user_id: string; votes: number }; // Mad Libs
  census?: { q: string; pct: number }[];
  splits?: { a: string; b: string; left: number }[];
  chainLines?: number;
  blindDates?: number;
  fooled?: Record<string, { fooled: number; of: number }>; // per Two Truths answer
  // Rank Night: who won each title, and every guy's own title.
  reading?: { user_id: string; path: string; fires: number }; // The Chain, best reading
  superlatives?: { winners: { category: string; user_id: string; votes: number }[]; titles: Record<string, { category: string; votes: number }> };
};

export const BADGES: Record<string, { emoji: string; label: string; blurb: string }> = {
  top: { emoji: "🔥", label: "Answer of the Week", blurb: "Most reactions in the Circle that week." },
  rank: { emoji: "👑", label: "Crowned", blurb: "Ranked first by the Circle." },
  guesser: { emoji: "🕵️", label: "Best Guesser", blurb: "Called the most names right." },
  liar: { emoji: "🤥", label: "Best Liar", blurb: "Fooled the most guys in Two Truths." },
  detective: { emoji: "🔎", label: "Lie Detector", blurb: "Caught the most lies." },
  caption: { emoji: "💬", label: "Caption Champ", blurb: "Best caption, by reactions." },
  story: { emoji: "📖", label: "Best Story", blurb: "The Circle's favorite Mad Lib." },
  superlative: { emoji: "🎖️", label: "Superlative", blurb: "Voted by the Circle on Rank Night." },
  season_fire: { emoji: "🏆", label: "Most 🔥 of the Season", blurb: "More reactions than anyone across all eight weeks." },
  season_chemistry: { emoji: "💘", label: "Most Wanted", blurb: "Picked by the most guys at the Finale." },
  season_mvp: { emoji: "⭐", label: "Season MVP", blurb: "The most badges in one Season." },
};

type AnswerRow = {
  id: string;
  user_id: string;
  body: string | null;
  photo_path: string | null;
  media_type: string | null;
  data: Record<string, unknown> | null;
  passed: boolean;
  hidden: boolean;
  held: boolean;
  reactions: { user_id: string }[];
};

// Compute the week's results. Pure read, so the Sunday Read can preview it live.
export async function computeWeek(db: SupabaseClient, drop: Drop, members: Member[]): Promise<WeekResult> {
  const memberIds = new Set(members.map((m) => m.id));
  const { data } = await db
    .from("answers")
    .select("id, user_id, body, photo_path, media_type, data, passed, hidden, held, reactions(user_id)")
    .eq("drop_id", drop.id);
  const rows = ((data ?? []) as AnswerRow[]).filter((a) => memberIds.has(a.user_id) && !a.passed && !a.hidden && !a.held);
  const r: WeekResult = { answered: rows.length, of: members.length };
  const spec = drop.spec;
  const played = rows.filter((a) => a.data);

  // Answer of the week: most reactions. Chats, pairings and rankings don't count.
  const scoreable = rows.filter((a) => !spec || !["rank", "blinddate", "hotseat", "ranknight"].includes(spec.kind) || (spec.kind === "hotseat" && a.user_id !== spec.seat));
  const top = [...scoreable].sort((x, y) => y.reactions.length - x.reactions.length)[0];
  if (top && top.reactions.length >= 1) {
    r.top = { answer_id: top.id, user_id: top.user_id, reactions: top.reactions.length, body: top.body ?? (top.data?.caption as string) ?? (top.data?.line as string) ?? null, photo_path: top.photo_path, media_type: top.media_type };
  }

  if (spec?.kind === "rank" && played.length >= 3) {
    const pts = new Map<string, number>();
    for (const a of played) ((a.data!.order as string[]) ?? []).forEach((id, i) => pts.set(id, (pts.get(id) ?? 0) + (5 - i)));
    const order = [...pts.entries()].sort((x, y) => y[1] - x[1]);
    if (order[0]) r.rank = { category: spec.category, winner: order[0][0], runner_up: order[1]?.[0] ?? null, ranked: played.length };
  }

  if (drop.mode === "guesswho" || drop.mode === "owner") {
    const { data: g } = await db.from("guesses").select("guesser, answer_id, guessed").eq("drop_id", drop.id);
    const owner = new Map(rows.map((a) => [a.id, a.user_id]));
    const right = new Map<string, number>();
    const tried = new Map<string, number>();
    for (const x of g ?? []) {
      if (!memberIds.has(x.guesser)) continue;
      tried.set(x.guesser, (tried.get(x.guesser) ?? 0) + 1);
      if (owner.get(x.answer_id) === x.guessed) right.set(x.guesser, (right.get(x.guesser) ?? 0) + 1);
    }
    const best = [...right.entries()].sort((a, b) => b[1] - a[1])[0];
    if (best && best[1] >= 2) r.guesser = { user_id: best[0], right: best[1], of: tried.get(best[0]) ?? best[1] };
  }

  if (drop.mode === "twotruths") {
    const { data: v } = await db.from("votes").select("voter, answer_id, choice").eq("drop_id", drop.id);
    const lie = new Map(played.map((a) => [a.id, a.data!.lie as number]));
    const fooled: Record<string, { fooled: number; of: number }> = {};
    const caught = new Map<string, number>();
    const voted = new Map<string, number>();
    for (const x of v ?? []) {
      if (!memberIds.has(x.voter) || !lie.has(x.answer_id)) continue;
      const f = (fooled[x.answer_id] ??= { fooled: 0, of: 0 });
      f.of++;
      voted.set(x.voter, (voted.get(x.voter) ?? 0) + 1);
      if (x.choice === lie.get(x.answer_id)) caught.set(x.voter, (caught.get(x.voter) ?? 0) + 1);
      else f.fooled++;
    }
    r.fooled = fooled;
    const bestLiar = Object.entries(fooled).filter(([, f]) => f.of >= 3).sort((a, b) => b[1].fooled / b[1].of - a[1].fooled / a[1].of || b[1].fooled - a[1].fooled)[0];
    if (bestLiar) r.liar = { user_id: played.find((a) => a.id === bestLiar[0])!.user_id, ...bestLiar[1] };
    const det = [...caught.entries()].sort((a, b) => b[1] - a[1])[0];
    if (det && det[1] >= 2) r.detective = { user_id: det[0], right: det[1], of: voted.get(det[0]) ?? det[1] };
  }

  if (spec?.kind === "caption") {
    const best = [...played].sort((x, y) => y.reactions.length - x.reactions.length)[0];
    if (best && best.reactions.length >= 1) r.caption = { answer_id: best.id, user_id: best.user_id, caption: best.data!.caption as string, reactions: best.reactions.length };
  }

  if (spec?.kind === "madlibs") {
    const { data: sv } = await db.from("story_votes").select("voter, answer_id").eq("drop_id", drop.id);
    const tally = new Map<string, number>();
    for (const x of sv ?? []) if (memberIds.has(x.voter)) tally.set(x.answer_id, (tally.get(x.answer_id) ?? 0) + 1);
    const best = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
    const row = best && played.find((a) => a.id === best[0]);
    if (row && best[1] >= 2) r.story = { answer_id: row.id, user_id: row.user_id, votes: best[1] };
  }

  if (spec?.kind === "ranknight") r.superlatives = superlatives(spec.categories, played.map((a) => (a.data?.picks ?? {}) as Record<string, string>), members.map((m) => m.id));

  if (spec?.kind === "survey" && spec.census && played.length >= 3) {
    r.census = spec.questions.map((q, i) => ({ q, pct: Math.round((100 * played.filter((a) => (a.data!.answers as boolean[])[i]).length) / played.length) }));
  }
  if (spec?.kind === "thisorthat" && played.length >= 3) {
    r.splits = spec.pairs.map(([a, b], i) => ({ a, b, left: Math.round((100 * played.filter((x) => (x.data!.picks as number[])[i] === 0).length) / played.length) }));
  }
  if (spec?.kind === "chain") {
    r.chainLines = rows.length;
    const { data: readings } = await db.from("chain_readings").select("id, user_id, path, ready, reading_fires(user_id)").eq("drop_id", drop.id);
    const best = ((readings ?? []) as { id: string; user_id: string; path: string; ready: boolean; reading_fires: { user_id: string }[] }[])
      .filter((x) => x.ready && memberIds.has(x.user_id))
      .sort((a, b) => b.reading_fires.length - a.reading_fires.length)[0];
    if (best && best.reading_fires.length >= 1) r.reading = { user_id: best.user_id, path: best.path, fires: best.reading_fires.length };
  }
  if (spec?.kind === "blinddate") r.blindDates = Math.floor(rows.filter((a) => a.data?.status === "paired").length / 2);
  return r;
}

// Lock the week. Safe to call again: a locked week stays as it was.
export async function lockWeek(db: SupabaseClient, circle: { id: string; season_no: number }, drop: Drop, members: Member[]): Promise<WeekResult> {
  if (drop.locked_at && drop.result) return drop.result as WeekResult;
  const result = await computeWeek(db, drop, members);
  const { data: locked } = await db
    .from("drops")
    .update({ locked_at: new Date().toISOString(), result })
    .eq("id", drop.id)
    .is("locked_at", null)
    .select("id");
  if (!locked?.length) {
    const { data: again } = await db.from("drops").select("result").eq("id", drop.id).single();
    return (again?.result as WeekResult) ?? result;
  }
  const base = { circle_id: circle.id, season_no: circle.season_no, week: drop.week };
  const rows: { user_id: string; badge: string; label: string }[] = [];
  const award = (badge: string, user_id?: string, label?: string) => {
    if (user_id) rows.push({ user_id, badge, label: label ?? BADGES[badge].label });
  };
  award("top", result.top?.user_id);
  award("rank", result.rank?.winner, result.rank?.category);
  award("guesser", result.guesser?.user_id);
  award("liar", result.liar?.user_id);
  award("detective", result.detective?.user_id);
  award("caption", result.caption?.user_id);
  award("story", result.story?.user_id);
  for (const [uid, t] of Object.entries(result.superlatives?.titles ?? {})) award("superlative", uid, t.category);
  if (rows.length) await db.from("badges").upsert(rows.map((x) => ({ ...base, ...x })), { onConflict: "user_id,circle_id,season_no,week,badge", ignoreDuplicates: true });
  return result;
}

// Season awards at the Finale.
export async function awardSeason(db: SupabaseClient, circle: { id: string; season_no: number }, members: Member[]): Promise<void> {
  const memberIds = new Set(members.map((m) => m.id));
  const { data: drops } = await db.from("drops").select("id").eq("circle_id", circle.id).eq("season_no", circle.season_no);
  const dropIds = (drops ?? []).map((d) => d.id as string);
  if (!dropIds.length) return;
  const { data: answers } = await db.from("answers").select("user_id, reactions(user_id)").in("drop_id", dropIds);
  const fire = new Map<string, number>();
  for (const a of (answers ?? []) as { user_id: string; reactions: { user_id: string }[] }[]) {
    if (memberIds.has(a.user_id)) fire.set(a.user_id, (fire.get(a.user_id) ?? 0) + a.reactions.length);
  }
  const { data: picks } = await db.from("picks").select("to_id").eq("circle_id", circle.id).eq("season_no", circle.season_no);
  const wanted = new Map<string, number>();
  for (const p of picks ?? []) wanted.set(p.to_id, (wanted.get(p.to_id) ?? 0) + 1);
  const { data: badges } = await db.from("badges").select("user_id").eq("circle_id", circle.id).eq("season_no", circle.season_no);
  const count = new Map<string, number>();
  for (const b of badges ?? []) count.set(b.user_id, (count.get(b.user_id) ?? 0) + 1);

  const first = (m: Map<string, number>, min: number) => {
    const e = [...m.entries()].sort((a, b) => b[1] - a[1])[0];
    return e && e[1] >= min ? e[0] : undefined;
  };
  const rows: { user_id: string; badge: string; label: string }[] = [];
  const f = first(fire, 3);
  if (f) rows.push({ user_id: f, badge: "season_fire", label: BADGES.season_fire.label });
  const w = first(wanted, 2);
  if (w) rows.push({ user_id: w, badge: "season_chemistry", label: BADGES.season_chemistry.label });
  const mvp = first(count, 2);
  if (mvp) rows.push({ user_id: mvp, badge: "season_mvp", label: BADGES.season_mvp.label });
  if (rows.length) {
    const base = { circle_id: circle.id, season_no: circle.season_no, week: 9 };
    await db.from("badges").upsert(rows.map((x) => ({ ...base, ...x })), { onConflict: "user_id,circle_id,season_no,week,badge", ignoreDuplicates: true });
  }
}

// Every guy gets a title. Each category's winner is the guy with the most
// votes, but a guy can only win one title: if he tops two, he takes the one
// he leads by more and the other goes to the runner-up. Guys with no title
// after that get the category they got the most votes in. Anyone left with
// no votes at all is "Most mysterious", which is kinder than it sounds.
export function superlatives(categories: string[], ballots: Record<string, string>[], members: string[]) {
  const votes = categories.map(() => new Map<string, number>());
  for (const b of ballots) for (const [k, v] of Object.entries(b)) {
    const i = Number(k);
    if (votes[i] && members.includes(v)) votes[i].set(v, (votes[i].get(v) ?? 0) + 1);
  }
  const titled = new Map<string, { category: string; votes: number }>();
  const winners: { category: string; user_id: string; votes: number }[] = [];
  // Hand out the strongest leads first.
  const order = categories
    .map((c, i) => ({ c, i, top: Math.max(0, ...votes[i].values()) }))
    .sort((a, b) => b.top - a.top);
  for (const { c, i } of order) {
    const ranked = [...votes[i].entries()].sort((a, b) => b[1] - a[1]);
    const pick = ranked.find(([uid]) => !titled.has(uid));
    if (pick && pick[1] > 0) {
      titled.set(pick[0], { category: c, votes: pick[1] });
      winners.push({ category: c, user_id: pick[0], votes: pick[1] });
    }
  }
  for (const uid of members) {
    if (titled.has(uid)) continue;
    let best: { category: string; votes: number } | null = null;
    categories.forEach((c, i) => {
      const n = votes[i].get(uid) ?? 0;
      if (n > 0 && (!best || n > best.votes)) best = { category: c, votes: n };
    });
    titled.set(uid, best ?? { category: "Most mysterious", votes: 0 });
  }
  winners.sort((a, b) => categories.indexOf(a.category) - categories.indexOf(b.category));
  return { winners, titles: Object.fromEntries(titled) };
}
