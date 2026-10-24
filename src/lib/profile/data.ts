import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { photoUrls } from "@/lib/game/player";
import { BADGES } from "@/lib/game/lock";
import { sameAnswer } from "@/lib/game/rematch";
import { TAG_BY_SLUG } from "./catalog";
import { downLabel } from "./downfor";
import { PROMPT_BY_ID } from "./prompts";
import type { Community } from "./suggest";

export type Basics = {
  pronouns: string | null;
  hometown: string | null;
  work: string | null;
  zodiac: string | null;
  song: string | null;
  spot: string | null;
  relationship: string | null;
  show_relationship: boolean;
};

export type Extras = {
  basics: Basics;
  photos: { id: string; path: string; url: string | null; theme: string | null; veiled: boolean; kind: "photo" | "video"; ready: boolean; held: boolean }[];
  answers: { prompt_id: string; prompt: string; body: string }[];
  interests: string[];
  down: string[];
  voiceUrl: string | null;
  voiceReady: boolean;
  pinned: string | null;
};

const ANON_MODES = new Set(["anon", "guesswho", "twotruths", "owner"]);

export async function loadExtras(db: SupabaseClient, userId: string): Promise<Extras> {
  const [{ data: p }, { data: photos }, { data: answers }, { data: tags }] = await Promise.all([
    db.from("profiles").select("pronouns, hometown, work, zodiac, song, spot, relationship, show_relationship, voice_path, voice_ready, pinned_answer_id").eq("id", userId).maybeSingle(),
    db.from("profile_photos").select("id, path, theme, veiled, position, kind, ready, held").eq("user_id", userId).order("position"),
    db.from("profile_answers").select("prompt_id, body, position").eq("user_id", userId).order("position"),
    db.from("user_tags").select("slug, kind, created_at").eq("user_id", userId).order("created_at"),
  ]);
  const urls = await photoUrls(db, (photos ?? []).filter((x) => x.kind !== "video").map((x) => x.path as string));
  const vids = (photos ?? []).filter((x) => x.kind === "video" && x.ready);
  const { data: vurls } = vids.length ? await db.storage.from("clips").createSignedUrls(vids.map((x) => x.path as string), 3600) : { data: [] };
  for (const v of vurls ?? []) if (v.path && v.signedUrl) urls.set(v.path, v.signedUrl);
  const voiceUrl = p?.voice_path && p.voice_ready ? (await db.storage.from("clips").createSignedUrl(p.voice_path as string, 3600)).data?.signedUrl ?? null : null;
  return {
    basics: {
      pronouns: p?.pronouns ?? null,
      hometown: p?.hometown ?? null,
      work: p?.work ?? null,
      zodiac: p?.zodiac ?? null,
      song: p?.song ?? null,
      spot: p?.spot ?? null,
      relationship: p?.relationship ?? null,
      show_relationship: !!p?.show_relationship,
    },
    photos: (photos ?? []).map((x) => ({
      id: x.id as string,
      path: x.path as string,
      url: urls.get(x.path as string) ?? null,
      theme: (x.theme as string) ?? null,
      veiled: !!x.veiled,
      kind: x.kind === "video" ? "video" : "photo",
      ready: x.ready !== false,
      held: !!x.held,
    })),
    answers: (answers ?? []).map((a) => ({ prompt_id: a.prompt_id as string, prompt: PROMPT_BY_ID.get(a.prompt_id as string)?.text ?? "", body: a.body as string })),
    interests: (tags ?? []).filter((t) => t.kind === "interest").map((t) => t.slug as string),
    down: (tags ?? []).filter((t) => t.kind === "down").map((t) => t.slug as string),
    voiceUrl,
    voiceReady: p?.voice_ready !== false,
    pinned: (p?.pinned_answer_id as string) ?? null,
  };
}

// What real guys pick, so suggestions get smarter as the community grows.
export async function loadCommunity(db: SupabaseClient, circleId: string | null, meId: string): Promise<Community> {
  const [{ data: all }, { data: circleMembers }, { data: custom }] = await Promise.all([
    db.from("user_tags").select("user_id, slug").eq("kind", "interest").neq("user_id", meId).limit(20000),
    circleId ? db.from("profiles").select("id").eq("circle_id", circleId).eq("status", "active") : Promise.resolve({ data: [] as { id: string }[] }),
    db.from("custom_tags").select("slug, label, uses").eq("status", "ok").gte("uses", 3).order("uses", { ascending: false }).limit(200),
  ]);
  const inCircle = new Set((circleMembers ?? []).map((m) => m.id as string));
  const byUser = new Map<string, string[]>();
  const circle: Record<string, number> = {};
  for (const r of all ?? []) {
    const u = r.user_id as string;
    if (!byUser.has(u)) byUser.set(u, []);
    byUser.get(u)!.push(r.slug as string);
    if (inCircle.has(u)) circle[r.slug as string] = (circle[r.slug as string] ?? 0) + 1;
  }
  const pairs: Record<string, Record<string, number>> = {};
  for (const tags of byUser.values()) {
    for (const a of tags) for (const b of tags) {
      if (a === b) continue;
      (pairs[a] ??= {})[b] = (pairs[a][b] ?? 0) + 1;
    }
  }
  // Keep the strongest few per tag.
  for (const k of Object.keys(pairs)) {
    pairs[k] = Object.fromEntries(Object.entries(pairs[k]).sort((x, y) => y[1] - x[1]).slice(0, 10));
  }
  return { circle, pairs, custom: (custom ?? []) as Community["custom"] };
}

type AnswerHit = { id: string; body: string; fires: number; week: number; season: number; circle: number | null; prompt: string };

// His best-received lines from the game, never anything anonymous.
export async function bestLines(db: SupabaseClient, userId: string, limit = 6): Promise<AnswerHit[]> {
  const { data } = await db
    .from("answers")
    .select("id, body, passed, held, hidden, reactions(user_id), drops(week, season_no, mode, body, spec, circles(number))")
    .eq("user_id", userId)
    .not("body", "is", null)
    .order("created_at", { ascending: false })
    .limit(200);
  type Row = { id: string; body: string; passed: boolean; held: boolean; hidden: boolean; reactions: { user_id: string }[]; drops: { week: number; season_no: number; mode: string; body: string | null; spec: { anon?: boolean } | null; circles: { number: number } | null } | null };
  return ((data ?? []) as unknown as Row[])
    .filter((a) => a.drops && !a.passed && !a.held && !a.hidden && !ANON_MODES.has(a.drops.mode) && !a.drops.spec?.anon && a.body.length <= 240)
    .map((a) => ({ id: a.id, body: a.body, fires: a.reactions.length, week: a.drops!.week, season: a.drops!.season_no, circle: a.drops!.circles?.number ?? null, prompt: a.drops!.body ?? "" }))
    .sort((x, y) => y.fires - x.fires)
    .slice(0, limit);
}

export async function greatestHit(db: SupabaseClient, userId: string, pinned: string | null): Promise<AnswerHit | null> {
  const lines = await bestLines(db, userId, 30);
  if (pinned) {
    const p = lines.find((l) => l.id === pinned);
    if (p) return p;
  }
  const top = lines[0];
  return top && top.fires >= 2 ? top : null;
}

// "In his own words": the sides he picked and his fastest answers.
export async function ownWords(db: SupabaseClient, userId: string): Promise<{ picks: string[]; speed: { q: string; a: string }[] }> {
  const { data } = await db
    .from("answers")
    .select("data, passed, created_at, drops(spec)")
    .eq("user_id", userId)
    .not("data", "is", null)
    .order("created_at", { ascending: false })
    .limit(60);
  const picks: string[] = [];
  const speed: { q: string; a: string }[] = [];
  for (const a of (data ?? []) as unknown as { data: Record<string, unknown>; passed: boolean; drops: { spec: { kind: string; pairs?: [string, string][]; questions?: string[] } | null } | null }[]) {
    const spec = a.drops?.spec;
    if (!spec || a.passed) continue;
    if (spec.kind === "thisorthat" && spec.pairs && picks.length < 8) {
      (a.data.picks as number[]).forEach((p, i) => {
        if (picks.length < 8 && spec.pairs![i]) picks.push(`${spec.pairs![i][p]} over ${spec.pairs![i][1 - p]}`);
      });
    }
    if (spec.kind === "speed" && spec.questions && speed.length < 4) {
      (a.data.answers as string[]).forEach((ans, i) => {
        if (speed.length < 4 && ans?.trim()) speed.push({ q: spec.questions![i], a: ans.trim() });
      });
    }
  }
  return { picks, speed };
}

export type YearbookPage = { season: number; circle: number; region: string; answered: number; best: { body: string; fires: number } | null; badges: { emoji: string; label: string }[] };

// One page per Season he's played.
export async function yearbook(db: SupabaseClient, userId: string): Promise<YearbookPage[]> {
  const [{ data: answers }, { data: badges }] = await Promise.all([
    db.from("answers").select("body, passed, held, reactions(user_id), drops(season_no, mode, spec, circle_id, circles(number, label))").eq("user_id", userId).limit(1000),
    db.from("badges").select("badge, label, season_no, circle_id, circles(number, label)").eq("user_id", userId),
  ]);
  const pages = new Map<string, YearbookPage>();
  type A = { body: string | null; passed: boolean; held: boolean; reactions: { user_id: string }[]; drops: { season_no: number; mode: string; spec: { anon?: boolean } | null; circle_id: string; circles: { number: number; label: string | null } | null } | null };
  for (const a of (answers ?? []) as unknown as A[]) {
    if (!a.drops || a.passed) continue;
    const key = `${a.drops.circle_id}:${a.drops.season_no}`;
    const page = pages.get(key) ?? { season: a.drops.season_no, circle: a.drops.circles?.number ?? 0, region: a.drops.circles?.label ?? "", answered: 0, best: null, badges: [] };
    page.answered++;
    const anon = ANON_MODES.has(a.drops.mode) || !!a.drops.spec?.anon;
    if (!anon && !a.held && a.body && a.body.length <= 200 && (!page.best || a.reactions.length > page.best.fires)) page.best = { body: a.body, fires: a.reactions.length };
    pages.set(key, page);
  }
  for (const b of (badges ?? []) as unknown as { badge: string; label: string; season_no: number; circle_id: string; circles: { number: number; label: string | null } | null }[]) {
    const key = `${b.circle_id}:${b.season_no}`;
    const page = pages.get(key) ?? { season: b.season_no, circle: b.circles?.number ?? 0, region: b.circles?.label ?? "", answered: 0, best: null, badges: [] };
    page.badges.push({ emoji: BADGES[b.badge]?.emoji ?? "🏅", label: b.label });
    pages.set(key, page);
  }
  return [...pages.values()].filter((p) => p.answered > 0).sort((a, b) => b.season - a.season || b.circle - a.circle);
}

// What two guys have in common. Every line is something true and nice.
export async function youTwo(db: SupabaseClient, me: string, him: string, mine: Extras, his: Extras, hisName: string): Promise<string[]> {
  const lines: string[] = [];
  const shared = his.interests.filter((t) => mine.interests.includes(t));
  if (shared.length) {
    const labels = shared.slice(0, 3).map((s) => TAG_BY_SLUG.get(s)?.label ?? s.replace(/^c-/, "").replace(/-/g, " "));
    lines.push(`You're both into ${labels.join(", ").replace(/, ([^,]*)$/, " and $1")}${shared.length > 3 ? `, plus ${shared.length - 3} more` : ""}.`);
  }
  const sharedDown = his.down.filter((t) => mine.down.includes(t));
  if (sharedDown.length) lines.push(`You're both down for ${sharedDown.slice(0, 2).map((s) => downLabel(s).toLowerCase()).join(" and ")}. That's a plan.`);
  const samePrompt = his.answers.find((a) => mine.answers.some((m) => m.prompt_id === a.prompt_id));
  if (samePrompt) lines.push(`You both answered "${samePrompt.prompt.replace(/…$/, "")}". Compare notes.`);
  if (his.basics.zodiac && mine.basics.zodiac && his.basics.zodiac === mine.basics.zodiac) lines.push(`Two ${his.basics.zodiac}s. Good luck.`);
  if (his.basics.hometown && mine.basics.hometown && his.basics.hometown.toLowerCase() === mine.basics.hometown.toLowerCase()) lines.push(`Both from ${his.basics.hometown}.`);

  // This or That: every drop you both played.
  const { data: rows } = await db.from("answers").select("drop_id, user_id, data, drops(spec)").in("user_id", [me, him]).not("data", "is", null).limit(400);
  type R = { drop_id: string; user_id: string; data: Record<string, unknown>; drops: { spec: { kind: string } | null } | null };
  const byDrop = new Map<string, R[]>();
  for (const r of (rows ?? []) as unknown as R[]) {
    if (!byDrop.has(r.drop_id)) byDrop.set(r.drop_id, []);
    byDrop.get(r.drop_id)!.push(r);
  }
  let same = 0;
  let of = 0;
  let speedSame = 0;
  for (const pair of byDrop.values()) {
    if (pair.length !== 2) continue;
    const kind = pair[0].drops?.spec?.kind;
    if (kind === "thisorthat") {
      const a = pair[0].data.picks as number[];
      const b = pair[1].data.picks as number[];
      a.forEach((v, i) => {
        of++;
        if (b[i] === v) same++;
      });
    }
    if (kind === "speed") {
      const a = pair[0].data.answers as string[];
      const b = pair[1].data.answers as string[];
      a.forEach((v, i) => {
        if (sameAnswer(v ?? "", b[i] ?? "")) speedSame++;
      });
    }
  }
  if (of >= 5) lines.push(same / of >= 0.6 ? `You picked the same side ${same} of ${of} times.` : `You picked opposite sides ${of - same} of ${of} times. Opposites, apparently.`);
  if (speedSame) lines.push(`Same answer in a Speed Round ${speedSame === 1 ? "once" : `${speedSame} times`}. Spooky.`);

  // Reactions, each way.
  const { data: theirs } = await db.from("answers").select("id, user_id, reactions(user_id)").in("user_id", [me, him]).limit(400);
  let heToMe = 0;
  let meToHim = 0;
  for (const a of (theirs ?? []) as { id: string; user_id: string; reactions: { user_id: string }[] }[]) {
    if (a.user_id === me) heToMe += a.reactions.filter((r) => r.user_id === him).length;
    else meToHim += a.reactions.filter((r) => r.user_id === me).length;
  }
  if (heToMe >= 2) lines.push(`${hisName} has reacted to your answers ${heToMe} times.`);
  if (meToHim >= 2 && heToMe < 2) lines.push(`You've reacted to his ${meToHim} times. He might've noticed.`);
  return lines.slice(0, 5);
}

export function completeness(x: Extras, mainPhoto: boolean): { pct: number; next: string | null } {
  const steps: [boolean, string][] = [
    [mainPhoto, "Add a face photo"],
    [x.interests.length >= 5, "Pick at least five things you're into"],
    [x.answers.length >= 3, "Answer three prompts"],
    [x.photos.length >= 2, "Add a couple more photos"],
    [!!x.voiceUrl || !x.voiceReady, "Record a 15-second hello"],
    [x.down.length >= 3, "Say what you're down for"],
    [[x.basics.pronouns, x.basics.hometown, x.basics.work, x.basics.song, x.basics.spot, x.basics.zodiac].filter(Boolean).length >= 3, "Fill in a few basics"],
  ];
  const done = steps.filter(([ok]) => ok).length;
  return { pct: Math.round((100 * done) / steps.length), next: steps.find(([ok]) => !ok)?.[1] ?? null };
}
