"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { loadPlayer, isMember, type Player } from "@/lib/game/player";
import { ensureDrop } from "@/lib/game/drops";
import { demoReactToAnswer, demoReplyInThread } from "@/lib/game/seed";
import { UUID } from "@/lib/admin";

type Result = { ok: boolean; error?: string };
const MAX_PHOTO = 3 * 1024 * 1024;
const LIMITS = { friend: 5, date: 3, setups: 2, roses: 3 };

async function player(): Promise<Player> {
  return loadPlayer({ needSeat: true });
}

function currentWeek(pl: Player): number | null {
  return pl.clock.phase === "season" ? pl.clock.week : null;
}

function clean(s: unknown, max: number): string {
  return String(s ?? "").replace(/\s+\n/g, "\n").trim().slice(0, max);
}

// Drops ------------------------------------------------------------------------

export async function answerDrop(form: FormData): Promise<Result> {
  const pl = await player();
  const week = Number(form.get("week"));
  const now = currentWeek(pl);
  if (!now || !Number.isInteger(week) || week < 1 || week > now) return { ok: false, error: "That drop isn't open." };
  const drop = await ensureDrop(pl.db, pl.circle, week);
  const pass = form.get("pass") === "1";
  const body = clean(form.get("body"), 1200);
  const file = form.get("photo");
  const hasPhoto = file instanceof File && file.size > 0;

  if (pass) {
    // One Pass per Season.
    const { data: drops } = await pl.db.from("drops").select("id").eq("circle_id", pl.circle.id).eq("season_no", pl.circle.season_no);
    const { count } = await pl.db
      .from("answers")
      .select("id", { count: "exact", head: true })
      .eq("user_id", pl.profile.id)
      .eq("passed", true)
      .in("drop_id", (drops ?? []).map((d) => d.id));
    if ((count ?? 0) >= 1) return { ok: false, error: "You already used your Pass this Season." };
  } else if (!body && !hasPhoto) {
    return { ok: false, error: "Write something first." };
  }

  let photo_path: string | null = null;
  if (hasPhoto && !pass) {
    if (file.type !== "image/jpeg" || file.size > MAX_PHOTO) return { ok: false, error: "That photo didn't work. Try a different one." };
    photo_path = `answers/${pl.circle.id}/${drop.id}/${pl.profile.id}-${Date.now()}.jpg`;
    const up = await pl.db.storage.from("photos").upload(photo_path, file, { contentType: "image/jpeg" });
    if (up.error) return { ok: false, error: "Your photo didn't upload. Try again." };
  }

  const { data: saved, error } = await pl.db
    .from("answers")
    .insert({ drop_id: drop.id, user_id: pl.profile.id, body: pass ? null : body || null, photo_path, passed: pass })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.code === "23505" ? "You already answered this one." : "That didn't save. Try again." };

  if (pl.circle.is_test && !pass && saved) await demoReactToAnswer(pl.db, pl.circle.id, saved.id);
  revalidatePath("/circle", "layout");
  return { ok: true };
}

async function answerInMyCircle(pl: Player, answerId: string) {
  if (!UUID.test(answerId)) return null;
  const { data } = await pl.db.from("answers").select("id, user_id, drop_id, drops(circle_id, week)").eq("id", answerId).maybeSingle();
  const d = data as unknown as { id: string; user_id: string; drops: { circle_id: string; week: number } } | null;
  if (!d || d.drops.circle_id !== pl.circle.id) return null;
  // You see answers only after you've answered that drop yourself.
  const { count } = await pl.db.from("answers").select("id", { count: "exact", head: true }).eq("drop_id", data!.drop_id).eq("user_id", pl.profile.id);
  if (!count) return null;
  return d;
}

export async function toggleReaction(answerId: string, emoji: string): Promise<Result> {
  const pl = await player();
  if (!["fire", "lol", "crown", "heart"].includes(emoji)) return { ok: false };
  const a = await answerInMyCircle(pl, answerId);
  if (!a) return { ok: false };
  const key = { answer_id: answerId, user_id: pl.profile.id, emoji };
  const { count } = await pl.db.from("reactions").select("answer_id", { count: "exact", head: true }).match(key);
  if (count) await pl.db.from("reactions").delete().match(key);
  else await pl.db.from("reactions").insert(key);
  revalidatePath("/circle", "layout");
  return { ok: true };
}

export async function replyToAnswer(answerId: string, body: string): Promise<Result> {
  const pl = await player();
  const text = clean(body, 500);
  if (!text) return { ok: false, error: "Say something first." };
  const a = await answerInMyCircle(pl, answerId);
  if (!a) return { ok: false, error: "You can't reply to that." };
  await pl.db.from("replies").insert({ answer_id: answerId, user_id: pl.profile.id, body: text });
  revalidatePath("/circle", "layout");
  return { ok: true };
}

// The Lounge -------------------------------------------------------------------

export async function postLounge(body: string): Promise<Result> {
  const pl = await player();
  const text = clean(body, 800);
  if (!text) return { ok: false };
  if (pl.clock.phase === "filling") return { ok: false, error: "The Lounge opens when your Circle kicks off." };
  await pl.db.from("lounge_messages").insert({ circle_id: pl.circle.id, user_id: pl.profile.id, body: text });
  revalidatePath("/circle/lounge");
  return { ok: true };
}

// Plans ------------------------------------------------------------------------

export async function postPlan(form: FormData): Promise<Result> {
  const pl = await player();
  const title = clean(form.get("title"), 80);
  const place = clean(form.get("place"), 120);
  const details = clean(form.get("details"), 600);
  const when = String(form.get("when") ?? "");
  if (!title) return { ok: false, error: "Give your plan a name." };
  let starts_at: string | null = null;
  if (when) {
    // The form sends Eastern wall time, like 2026-10-24T19:00.
    const d = new Date(`${when}:00-04:00`);
    if (Number.isNaN(d.getTime())) return { ok: false, error: "That time didn't work." };
    starts_at = d.toISOString();
  }
  const { data: made } = await pl.db
    .from("plans")
    .insert({ circle_id: pl.circle.id, user_id: pl.profile.id, title, place: place || null, details: details || null, starts_at })
    .select("id")
    .single();
  if (made) await pl.db.from("plan_rsvps").insert({ plan_id: made.id, user_id: pl.profile.id });
  revalidatePath("/circle/plans");
  return { ok: true };
}

export async function toggleRsvp(planId: string): Promise<Result> {
  const pl = await player();
  if (!UUID.test(planId)) return { ok: false };
  const { data: plan } = await pl.db.from("plans").select("circle_id").eq("id", planId).maybeSingle();
  if (!plan || plan.circle_id !== pl.circle.id) return { ok: false };
  const key = { plan_id: planId, user_id: pl.profile.id };
  const { count } = await pl.db.from("plan_rsvps").select("plan_id", { count: "exact", head: true }).match(key);
  if (count) await pl.db.from("plan_rsvps").delete().match(key);
  else await pl.db.from("plan_rsvps").insert(key);
  revalidatePath("/circle/plans");
  return { ok: true };
}

// DMs --------------------------------------------------------------------------

async function threadWith(pl: Player, otherId: string, accept: boolean) {
  const [a, b] = [pl.profile.id, otherId].sort();
  await pl.db
    .from("dm_threads")
    .upsert(
      { a, b, requested_by: pl.profile.id, accepted_at: accept ? new Date().toISOString() : null },
      { onConflict: "a,b", ignoreDuplicates: true }
    );
  const { data } = await pl.db.from("dm_threads").select("*").eq("a", a).eq("b", b).single();
  return data as { id: string; a: string; b: string; requested_by: string; accepted_at: string | null };
}

export async function startDm(otherId: string): Promise<void> {
  const pl = await player();
  if (!UUID.test(otherId) || otherId === pl.profile.id || !isMember(pl, otherId)) redirect("/circle/dms");
  const other = pl.members.find((m) => m.id === otherId)!;
  // Fake guys always say yes.
  const t = await threadWith(pl, otherId, other.is_demo);
  if (other.is_demo && !t.accepted_at) {
    await pl.db.from("dm_threads").update({ accepted_at: new Date().toISOString() }).eq("id", t.id);
  }
  redirect(`/circle/dms/${t.id}`);
}

export async function openChat(otherId: string): Promise<void> {
  // A Finale mutual opens a chat, already accepted.
  const pl = await player();
  if (!UUID.test(otherId) || otherId === pl.profile.id) redirect("/circle/dms");
  const t = await threadWith(pl, otherId, true);
  if (!t.accepted_at) await pl.db.from("dm_threads").update({ accepted_at: new Date().toISOString() }).eq("id", t.id);
  redirect(`/circle/dms/${t.id}`);
}

async function myThread(pl: Player, threadId: string) {
  if (!UUID.test(threadId)) return null;
  const { data } = await pl.db.from("dm_threads").select("*").eq("id", threadId).maybeSingle();
  if (!data || (data.a !== pl.profile.id && data.b !== pl.profile.id)) return null;
  return data as {
    id: string;
    a: string;
    b: string;
    requested_by: string;
    accepted_at: string | null;
    photos_a: boolean;
    photos_b: boolean;
  };
}

// Each guy turns photos on for a chat. Photos unlock only when both have.
export async function setDmPhotos(threadId: string, on: boolean): Promise<Result> {
  const pl = await player();
  const t = await myThread(pl, threadId);
  if (!t) return { ok: false };
  if (!t.accepted_at) return { ok: false, error: "Accept the chat first." };
  const mine = t.a === pl.profile.id ? "photos_a" : "photos_b";
  const theirs = mine === "photos_a" ? "photos_b" : "photos_a";
  const otherId = t.a === pl.profile.id ? t.b : t.a;
  const { data: other } = await pl.db.from("profiles").select("is_demo").eq("id", otherId).maybeSingle();
  // Fake guys always say yes.
  await pl.db
    .from("dm_threads")
    .update({ [mine]: on, ...(on && other?.is_demo ? { [theirs]: true } : {}) })
    .eq("id", t.id);
  revalidatePath(`/circle/dms/${t.id}`);
  return { ok: true };
}

export async function sendDmPhoto(form: FormData): Promise<Result> {
  const pl = await player();
  const t = await myThread(pl, String(form.get("thread") ?? ""));
  if (!t?.accepted_at) return { ok: false, error: "That chat is gone." };
  if (!t.photos_a || !t.photos_b) return { ok: false, error: "You both have to turn photos on first." };
  const file = form.get("photo");
  if (!(file instanceof File) || file.type !== "image/jpeg" || file.size === 0 || file.size > MAX_PHOTO) {
    return { ok: false, error: "That photo didn't work. Try a different one." };
  }
  const photo_path = `dms/${t.id}/${pl.profile.id}-${Date.now()}.jpg`;
  const up = await pl.db.storage.from("photos").upload(photo_path, file, { contentType: "image/jpeg" });
  if (up.error) return { ok: false, error: "Your photo didn't send. Try again." };
  const caption = clean(form.get("caption"), 500);
  await pl.db.from("dm_messages").insert({ thread_id: t.id, user_id: pl.profile.id, body: caption || null, photo_path });
  await pl.db.from("dm_threads").update({ last_at: new Date().toISOString() }).eq("id", t.id);
  const otherId = t.a === pl.profile.id ? t.b : t.a;
  const { data: other } = await pl.db.from("profiles").select("is_demo, email").eq("id", otherId).maybeSingle();
  if (other?.is_demo) await demoReplyInThread(pl.db, t.id, otherId, other.email as string | null);
  revalidatePath(`/circle/dms/${t.id}`);
  return { ok: true };
}

export async function acceptDm(threadId: string): Promise<Result> {
  const pl = await player();
  const t = await myThread(pl, threadId);
  if (!t || t.requested_by === pl.profile.id) return { ok: false };
  await pl.db.from("dm_threads").update({ accepted_at: new Date().toISOString() }).eq("id", t.id);
  revalidatePath("/circle/dms", "layout");
  return { ok: true };
}

export async function declineDm(threadId: string): Promise<void> {
  const pl = await player();
  const t = await myThread(pl, threadId);
  if (t && t.requested_by !== pl.profile.id && !t.accepted_at) await pl.db.from("dm_threads").delete().eq("id", t.id);
  redirect("/circle/dms");
}

export async function sendDm(threadId: string, body: string): Promise<Result> {
  const pl = await player();
  const text = clean(body, 2000);
  if (!text) return { ok: false };
  const t = await myThread(pl, threadId);
  if (!t) return { ok: false, error: "That chat is gone." };
  if (!t.accepted_at && t.requested_by !== pl.profile.id) return { ok: false, error: "Accept his message first." };
  if (!t.accepted_at) {
    const { count } = await pl.db.from("dm_messages").select("id", { count: "exact", head: true }).eq("thread_id", t.id);
    if ((count ?? 0) >= 1) return { ok: false, error: "Wait for him to say yes before sending more." };
  }
  await pl.db.from("dm_messages").insert({ thread_id: t.id, user_id: pl.profile.id, body: text });
  await pl.db.from("dm_threads").update({ last_at: new Date().toISOString() }).eq("id", t.id);

  const otherId = t.a === pl.profile.id ? t.b : t.a;
  const { data: other } = await pl.db.from("profiles").select("is_demo, email").eq("id", otherId).maybeSingle();
  if (other?.is_demo) await demoReplyInThread(pl.db, t.id, otherId, other.email as string | null);
  revalidatePath(`/circle/dms/${t.id}`);
  return { ok: true };
}

// Week 7: Roses ------------------------------------------------------------------

export async function giveRose(toId: string, body: string): Promise<Result> {
  const pl = await player();
  if (currentWeek(pl) !== 7 && currentWeek(pl) !== 8) return { ok: false, error: "Roses open in Week 7." };
  const text = clean(body, 280);
  if (!text) return { ok: false, error: "Say something kind first." };
  if (!UUID.test(toId) || toId === pl.profile.id || !isMember(pl, toId)) return { ok: false, error: "Pick someone in your Circle." };
  const { count } = await pl.db
    .from("roses")
    .select("id", { count: "exact", head: true })
    .eq("circle_id", pl.circle.id)
    .eq("season_no", pl.circle.season_no)
    .eq("from_id", pl.profile.id);
  if ((count ?? 0) >= LIMITS.roses) return { ok: false, error: `You've given all ${LIMITS.roses} of your Roses.` };
  const { error } = await pl.db
    .from("roses")
    .insert({ circle_id: pl.circle.id, season_no: pl.circle.season_no, from_id: pl.profile.id, to_id: toId, body: text });
  if (error) return { ok: false, error: "You already gave him a Rose." };
  revalidatePath("/circle/roses");
  return { ok: true };
}

// Week 8: picks ------------------------------------------------------------------

export async function savePicks(form: FormData): Promise<Result> {
  const pl = await player();
  if (currentWeek(pl) !== 8) return { ok: false, error: "Picks are open in Week 8 only." };
  const valid = (id: unknown) => typeof id === "string" && UUID.test(id) && id !== pl.profile.id && isMember(pl, id);
  const friends = [...new Set(form.getAll("friend"))].filter(valid) as string[];
  const dating = pl.profile.looking_for === "friends_dating";
  const dates = dating ? ([...new Set(form.getAll("date"))].filter(valid) as string[]) : [];
  if (friends.length > LIMITS.friend) return { ok: false, error: `Up to ${LIMITS.friend} friend picks.` };
  if (dates.length > LIMITS.date) return { ok: false, error: `Up to ${LIMITS.date} date picks.` };

  const setups: { a: string; b: string }[] = [];
  for (let i = 0; i < LIMITS.setups; i++) {
    const x = form.get(`setup${i}a`);
    const y = form.get(`setup${i}b`);
    if (!x && !y) continue;
    if (!valid(x) || !valid(y) || x === y) return { ok: false, error: "Each setup needs two different guys, and not you." };
    const [a, b] = [x as string, y as string].sort();
    if (!setups.some((s) => s.a === a && s.b === b)) setups.push({ a, b });
  }
  const stay = form.get("stay");
  if (stay !== "stay" && stay !== "mix") return { ok: false, error: "Pick Stay or Mix me in." };

  const base = { circle_id: pl.circle.id, season_no: pl.circle.season_no };
  await pl.db.from("picks").delete().match({ ...base, from_id: pl.profile.id });
  await pl.db.from("setups").delete().match({ ...base, from_id: pl.profile.id });
  const rows = [
    ...friends.map((to_id) => ({ ...base, from_id: pl.profile.id, to_id, kind: "friend" })),
    ...dates.map((to_id) => ({ ...base, from_id: pl.profile.id, to_id, kind: "date" })),
  ];
  if (rows.length) await pl.db.from("picks").insert(rows);
  if (setups.length) await pl.db.from("setups").insert(setups.map((s) => ({ ...base, from_id: pl.profile.id, ...s })));
  await pl.db.from("stay_choices").upsert({ ...base, user_id: pl.profile.id, choice: stay }, { onConflict: "circle_id,season_no,user_id" });
  revalidatePath("/circle/finale");
  return { ok: true };
}
