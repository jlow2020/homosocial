"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { convertClip } from "@/lib/media";
import { redirect } from "next/navigation";
import { loadPlayer, isMember, type Player } from "@/lib/game/player";
import { ensureDrop } from "@/lib/game/drops";
import { demoReactToAnswer, demoReplyInThread } from "@/lib/game/seed";
import { checkPlayAnswer } from "@/lib/game/playcheck";
import { UUID } from "@/lib/admin";
import { notify, teaser } from "@/lib/notify";
import { chainEndingAt } from "@/lib/game/chain";

type Result = { ok: boolean; error?: string };
const MAX_PHOTO = 3 * 1024 * 1024;
const LIMITS = { friend: 5, date: 3, setups: 2, roses: 3 };
const EMOJI: Record<string, string> = { fire: "🔥", lol: "😂", crown: "👑", heart: "❤️" };

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
  const raw = form.get("data");
  let data: unknown = null;
  if (!pass && drop.spec) {
    try {
      data = raw ? JSON.parse(String(raw)) : null;
    } catch {
      return { ok: false, error: "That didn't come through. Try again." };
    }
    if (drop.spec.kind === "rank" && data && typeof data === "object") (data as Record<string, unknown>).me = pl.profile.id;
    let ending = false;
    if (drop.spec.kind === "chain") {
      const { count: lines } = await pl.db.from("answers").select("id", { count: "exact", head: true }).eq("drop_id", drop.id).eq("passed", false);
      ending = (lines ?? 0) >= chainEndingAt(pl.members.length);
      if (data && typeof data === "object") (data as Record<string, unknown>).ending = ending;
    }
    const problem = checkPlayAnswer(drop.spec, data, { ending });
    if (problem) return { ok: false, error: problem };
    // Blind Date and Hot Seat have their own doors.
    if (drop.spec.kind === "blinddate" || (drop.spec.kind === "hotseat" && drop.spec.seat === pl.profile.id)) return { ok: false, error: "Use the button above." };
  }
  const videoPath = String(form.get("video_path") ?? "");

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
  } else if (!body && !hasPhoto && !data && !videoPath) {
    return { ok: false, error: "Write something first." };
  }

  let photo_path: string | null = null;
  if (hasPhoto && !pass) {
    if (file.type !== "image/jpeg" || file.size > MAX_PHOTO) return { ok: false, error: "That photo didn't work. Try a different one." };
    photo_path = `answers/${pl.circle.id}/${drop.id}/${pl.profile.id}-${Date.now()}.jpg`;
    const up = await pl.db.storage.from("photos").upload(photo_path, file, { contentType: "image/jpeg" });
    if (up.error) return { ok: false, error: "Your photo didn't upload. Try again." };
  }

  let media_type: "photo" | "video" | "audio" | null = photo_path ? "photo" : null;
  if (videoPath && !pass) {
    // Uploaded straight from the phone with a ticket from answerClipTicket.
    const prefix = `answers/${pl.circle.id}/${drop.id}/${pl.profile.id}-`;
    if (!videoPath.startsWith(prefix) || videoPath.includes("..")) return { ok: false, error: "That video didn't work." };
    const { data: found } = await pl.db.storage.from("clips").list(`answers/${pl.circle.id}/${drop.id}`, { search: videoPath.slice(videoPath.lastIndexOf("/") + 1), limit: 1 });
    if (!found?.length) return { ok: false, error: "The video didn't finish uploading. Try again." };
    photo_path = videoPath;
    media_type = drop.mode === "voice" ? "audio" : "video";
  }
  const needsConvert = !!videoPath && !pass;
  const { data: saved, error } = await pl.db
    .from("answers")
    .insert({ drop_id: drop.id, user_id: pl.profile.id, body: pass ? null : body || null, photo_path, media_type, data: pass ? null : data, passed: pass, ready: !needsConvert })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.code === "23505" ? "You already answered this one." : "That didn't save. Try again." };
  if (needsConvert && saved) {
    const db = pl.db;
    after(() => convertClip(db, { table: "answers", id: saved.id, path: videoPath, kind: media_type === "audio" ? "audio" : "video" }));
  }

  if (pl.circle.is_test && !pass && saved) await demoReactToAnswer(pl.db, pl.circle.id, saved.id);
  revalidatePath("/circle", "layout");
  return { ok: true };
}

async function answerInMyCircle(pl: Player, answerId: string) {
  if (!UUID.test(answerId)) return null;
  const { data } = await pl.db.from("answers").select("id, user_id, drop_id, drops(circle_id, week, mode)").eq("id", answerId).maybeSingle();
  const d = data as unknown as { id: string; user_id: string; drop_id: string; drops: { circle_id: string; week: number; mode: string } } | null;
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
  else {
    await pl.db.from("reactions").insert(key);
    if (a.user_id !== pl.profile.id) {
      const { count: total } = await pl.db.from("reactions").select("answer_id", { count: "exact", head: true }).eq("answer_id", answerId);
      if (total === 1) await notify(pl.db, [a.user_id], { title: "First reaction on your answer", body: `${pl.profile.first_name} hit ${EMOJI[emoji]}.`, url: `/circle/week/${a.drops.week}`, tag: `react:${answerId}`, email: false });
      else if (total === 5 || total === 10 || total === 20) await notify(pl.db, [a.user_id], { title: "Your answer is on fire", body: `${total} reactions and counting.`, url: `/circle/week/${a.drops.week}`, tag: `react:${answerId}`, email: false });
    }
  }
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
  if (a.user_id !== pl.profile.id) {
    const anon = ["anon", "guesswho", "twotruths"].includes(a.drops.mode);
    await notify(pl.db, [a.user_id], { title: `${pl.profile.first_name} replied to your ${anon ? "anonymous " : ""}answer`, body: teaser(text), url: `/circle/week/${a.drops.week}`, tag: `reply:${answerId}`, email: false });
  }
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
  if (!t.accepted_at && t.requested_by === pl.profile.id) {
    await notify(pl.db, [otherId], { title: `${pl.profile.first_name} wants to DM you`, body: "Say yes and you can both talk.", url: `/circle/dms/${t.id}`, tag: `dm:${t.id}` });
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
    blind_until: string | null;
    keep_a: boolean;
    keep_b: boolean;
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
  await pl.db.from("dm_messages").insert({ thread_id: t.id, user_id: pl.profile.id, body: caption || null, photo_path, media_type: "photo" });
  await pl.db.from("dm_threads").update({ last_at: new Date().toISOString() }).eq("id", t.id);
  const otherId = t.a === pl.profile.id ? t.b : t.a;
  const { data: other } = await pl.db.from("profiles").select("is_demo, email").eq("id", otherId).maybeSingle();
  if (other?.is_demo) await demoReplyInThread(pl.db, t.id, otherId, other.email as string | null);
  else await notify(pl.db, [otherId], { title: pl.profile.first_name, body: "📷 Sent you a photo", url: `/circle/dms/${t.id}`, tag: `dm:${t.id}`, email: false });
  revalidatePath(`/circle/dms/${t.id}`);
  return { ok: true };
}

export async function acceptDm(threadId: string): Promise<Result> {
  const pl = await player();
  const t = await myThread(pl, threadId);
  if (!t || t.requested_by === pl.profile.id) return { ok: false };
  await pl.db.from("dm_threads").update({ accepted_at: new Date().toISOString() }).eq("id", t.id);
  await notify(pl.db, [t.requested_by], { title: `${pl.profile.first_name} said yes`, body: "Your DM is open. Go say something.", url: `/circle/dms/${t.id}`, tag: `dm:${t.id}`, email: false });
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
  else await notify(pl.db, [otherId], { title: t.blind_until && new Date(t.blind_until) > new Date() ? "💘 Your blind date" : pl.profile.first_name, body: teaser(text, 120), url: `/circle/dms/${t.id}`, tag: `dm:${t.id}`, email: false });
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
  await notify(pl.db, [toId], { title: "🌹 Someone sent you a Rose", body: "Go read it.", url: "/circle/roses", tag: "rose" });
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

// DMs, Messenger style -------------------------------------------------------------

const DM_REACTIONS = new Set(["❤️", "😂", "🔥", "😮", "😢", "👑"]);

async function myMessage(pl: Player, messageId: string) {
  if (!UUID.test(messageId)) return null;
  const { data } = await pl.db.from("dm_messages").select("id, thread_id").eq("id", messageId).maybeSingle();
  if (!data) return null;
  const t = await myThread(pl, data.thread_id as string);
  return t?.accepted_at ? t : null;
}

// One reaction per guy per message. Same emoji again takes it off.
export async function reactDm(messageId: string, emoji: string): Promise<Result> {
  const pl = await player();
  if (!DM_REACTIONS.has(emoji)) return { ok: false };
  const t = await myMessage(pl, messageId);
  if (!t) return { ok: false };
  const key = { message_id: messageId, user_id: pl.profile.id };
  const { data: had } = await pl.db.from("dm_reactions").select("emoji").match(key).maybeSingle();
  if (had?.emoji === emoji) await pl.db.from("dm_reactions").delete().match(key);
  else await pl.db.from("dm_reactions").upsert({ ...key, emoji }, { onConflict: "message_id,user_id" });
  revalidatePath(`/circle/dms/${t.id}`);
  return { ok: true };
}

const CLIP_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);
const AUDIO_TYPES = new Set(["audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/wav"]);
const MAX_CLIP = 50 * 1024 * 1024;

// Videos go straight from the phone to storage, too big for the server's front door.
export async function clipTicket(
  threadId: string,
  contentType: string,
  size: number
): Promise<{ ok: boolean; error?: string; signedUrl?: string; path?: string; apikey?: string }> {
  const pl = await player();
  const t = await myThread(pl, threadId);
  if (!t?.accepted_at) return { ok: false, error: "That chat is gone." };
  if (!t.photos_a || !t.photos_b) return { ok: false, error: "You both have to turn photos and videos on first." };
  if (!CLIP_TYPES.has(contentType)) return { ok: false, error: "That video type won't play. Try an .mp4 or .mov." };
  if (!(size > 0 && size <= MAX_CLIP)) return { ok: false, error: "That clip is too big. Keep it under 30 seconds." };
  const ext = contentType === "video/quicktime" ? "mov" : contentType === "video/webm" ? "webm" : "mp4";
  const path = `dms/${t.id}/${pl.profile.id}-${Date.now()}.${ext}`;
  const { data, error } = await pl.db.storage.from("clips").createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: "Couldn't start the upload. Try again." };
  return { ok: true, signedUrl: data.signedUrl, path, apikey: process.env.SUPABASE_PUBLISHABLE_KEY };
}

export async function sendDmClip(threadId: string, path: string): Promise<Result> {
  const pl = await player();
  const t = await myThread(pl, threadId);
  if (!t?.accepted_at || !t.photos_a || !t.photos_b) return { ok: false, error: "That chat is gone." };
  const prefix = `dms/${t.id}/${pl.profile.id}-`;
  if (!path.startsWith(prefix) || path.includes("..")) return { ok: false, error: "That didn't work." };
  const name = path.slice(`dms/${t.id}/`.length);
  const { data: found } = await pl.db.storage.from("clips").list(`dms/${t.id}`, { search: name, limit: 1 });
  if (!found?.length) return { ok: false, error: "The upload didn't finish. Try again." };
  const { data: msg } = await pl.db.from("dm_messages").insert({ thread_id: t.id, user_id: pl.profile.id, photo_path: path, media_type: "video", ready: false }).select("id").single();
  await pl.db.from("dm_threads").update({ last_at: new Date().toISOString() }).eq("id", t.id);
  if (msg) {
    const db = pl.db;
    after(() => convertClip(db, { table: "dm_messages", id: msg.id, path, kind: "video" }));
  }
  const otherId = t.a === pl.profile.id ? t.b : t.a;
  const { data: other } = await pl.db.from("profiles").select("is_demo, email").eq("id", otherId).maybeSingle();
  if (other?.is_demo) await demoReplyInThread(pl.db, t.id, otherId, other.email as string | null);
  else await notify(pl.db, [otherId], { title: pl.profile.first_name, body: "🎥 Sent you a clip", url: `/circle/dms/${t.id}`, tag: `dm:${t.id}`, email: false });
  revalidatePath(`/circle/dms/${t.id}`);
  return { ok: true };
}

// The drop engine: Write the Drop, heat votes, Guess Who -------------------------

export async function submitDrop(form: FormData): Promise<Result> {
  const pl = await player();
  const body = clean(form.get("body"), 300);
  const week = Number(form.get("week"));
  const heat = Number(form.get("heat"));
  const mode = String(form.get("mode") ?? "text");
  if (body.length < 15) return { ok: false, error: "Give it a little more than that." };
  if (!Number.isInteger(week) || week < 1 || week > 8) return { ok: false, error: "Pick a week." };
  if (!Number.isInteger(heat) || heat < 1 || heat > 5) return { ok: false, error: "Pick a heat." };
  if (!["text", "anon", "guesswho", "photo", "dare"].includes(mode)) return { ok: false, error: "Pick how answers work." };
  const { count } = await pl.db
    .from("prompt_bank")
    .select("id", { count: "exact", head: true })
    .eq("author_id", pl.profile.id)
    .gte("created_at", new Date(Date.now() - 60 * 864e5).toISOString());
  if ((count ?? 0) >= 3) return { ok: false, error: "Three per Season. You've sent yours, thank you." };
  const town = pl.circle.is_test ? "Sarasota" : pl.circle.region;
  const { error } = await pl.db.from("prompt_bank").insert({
    body,
    week,
    heat,
    mode,
    author_id: pl.profile.id,
    credit: `${pl.profile.first_name}, ${town === "test" ? "Sarasota" : regionName(town)}`,
    source: "member",
    status: "queued",
  });
  if (error) return { ok: false, error: "That didn't send. Try again." };
  return { ok: true };
}

function regionName(region: string | null): string {
  // Three-digit zip prefixes, roughly one metro each. Good enough for a credit line.
  const names: Record<string, string> = {
    "320": "Jacksonville", "321": "Daytona", "322": "Jacksonville", "323": "Tallahassee", "324": "Panama City", "325": "Pensacola",
    "326": "Gainesville", "327": "Orlando", "328": "Orlando", "329": "Melbourne", "330": "Miami", "331": "Miami", "332": "Miami",
    "333": "Fort Lauderdale", "334": "West Palm Beach", "335": "Tampa", "336": "Tampa", "337": "St. Pete", "338": "Lakeland",
    "339": "Fort Myers", "341": "Naples", "342": "Sarasota", "344": "Ocala", "346": "Tampa", "347": "Orlando", "349": "West Palm Beach",
  };
  return (region && names[region]) || "Florida";
}

export async function voteHeat(): Promise<Result> {
  const pl = await player();
  if (pl.clock.phase !== "season") return { ok: false };
  const key = { circle_id: pl.circle.id, season_no: pl.circle.season_no, user_id: pl.profile.id };
  const { count: had } = await pl.db.from("heat_votes").select("user_id", { count: "exact", head: true }).match(key);
  if (had) await pl.db.from("heat_votes").delete().match(key);
  else await pl.db.from("heat_votes").insert(key);
  // Enough votes: the Circle runs one notch hotter from the next drop on.
  const { count: votes } = await pl.db
    .from("heat_votes")
    .select("user_id", { count: "exact", head: true })
    .eq("circle_id", pl.circle.id)
    .eq("season_no", pl.circle.season_no);
  const needed = pl.circle.is_test ? 1 : Math.max(5, Math.ceil(pl.members.length * 0.6));
  if ((votes ?? 0) >= needed) {
    await pl.db.from("circles").update({ heat_boost: (pl.circle.heat_boost ?? 0) + 1 }).eq("id", pl.circle.id);
    await pl.db.from("heat_votes").delete().eq("circle_id", pl.circle.id).eq("season_no", pl.circle.season_no);
  }
  revalidatePath("/circle");
  return { ok: true };
}

export async function guessWho(dropId: string, answerId: string, guessed: string): Promise<Result> {
  const pl = await player();
  if (!UUID.test(dropId) || !UUID.test(answerId)) return { ok: false };
  const { data: drop } = await pl.db.from("drops").select("circle_id, mode, week").eq("id", dropId).maybeSingle();
  if (!drop || drop.circle_id !== pl.circle.id || (drop.mode !== "guesswho" && drop.mode !== "owner")) return { ok: false };
  if (pl.clock.phase !== "season" || pl.clock.week !== drop.week) return { ok: false, error: "Guessing is closed." };
  const a = await answerInMyCircle(pl, answerId);
  if (!a || a.user_id === pl.profile.id) return { ok: false };
  const key = { drop_id: dropId, guesser: pl.profile.id, answer_id: answerId };
  if (!guessed) {
    await pl.db.from("guesses").delete().match(key);
  } else {
    if (!UUID.test(guessed) || !isMember(pl, guessed)) return { ok: false };
    await pl.db.from("guesses").upsert({ ...key, guessed }, { onConflict: "drop_id,guesser,answer_id" });
  }
  return { ok: true };
}

// Video answers go straight from the phone to storage.
export async function answerClipTicket(
  week: number,
  contentType: string,
  size: number
): Promise<{ ok: boolean; error?: string; signedUrl?: string; path?: string; apikey?: string }> {
  const pl = await player();
  const now = currentWeek(pl);
  if (!now || !Number.isInteger(week) || week < 1 || week > now) return { ok: false, error: "That drop isn't open." };
  const drop = await ensureDrop(pl.db, pl.circle, week);
  const audio = drop.mode === "voice";
  if (drop.mode !== "video" && !audio) return { ok: false, error: "This drop doesn't take a recording." };
  if (audio ? !AUDIO_TYPES.has(contentType) : !CLIP_TYPES.has(contentType)) return { ok: false, error: "That file type won't play." };
  if (!(size > 0 && size <= (audio ? 10 * 1024 * 1024 : MAX_CLIP))) return { ok: false, error: "That clip is too big." };
  const ext = audio
    ? contentType === "audio/mp4" ? "m4a" : contentType === "audio/mpeg" ? "mp3" : contentType === "audio/wav" ? "wav" : contentType === "audio/ogg" ? "ogg" : "weba"
    : contentType === "video/quicktime" ? "mov" : contentType === "video/webm" ? "webm" : "mp4";
  const path = `answers/${pl.circle.id}/${drop.id}/${pl.profile.id}-${Date.now()}.${ext}`;
  const { data, error } = await pl.db.storage.from("clips").createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: "Couldn't start the upload. Try again." };
  return { ok: true, signedUrl: data.signedUrl, path, apikey: process.env.SUPABASE_PUBLISHABLE_KEY };
}

// Two Truths and a Lie: vote on which one's the lie.
export async function voteLie(dropId: string, answerId: string, choice: number): Promise<Result> {
  const pl = await player();
  if (!UUID.test(dropId) || !UUID.test(answerId) || ![0, 1, 2].includes(choice)) return { ok: false };
  const { data: drop } = await pl.db.from("drops").select("circle_id, mode, week").eq("id", dropId).maybeSingle();
  if (!drop || drop.circle_id !== pl.circle.id || drop.mode !== "twotruths") return { ok: false };
  if (pl.clock.phase !== "season" || pl.clock.week !== drop.week) return { ok: false, error: "Voting is closed." };
  const a = await answerInMyCircle(pl, answerId);
  if (!a || a.user_id === pl.profile.id) return { ok: false };
  await pl.db.from("votes").upsert({ drop_id: dropId, voter: pl.profile.id, answer_id: answerId, choice }, { onConflict: "drop_id,voter,answer_id" });
  return { ok: true };
}

// Hot Seat: first to tap takes it.
export async function takeHotSeat(week: number): Promise<Result> {
  const pl = await player();
  if (currentWeek(pl) !== week) return { ok: false, error: "That drop isn't open." };
  const drop = await ensureDrop(pl.db, pl.circle, week);
  if (drop.spec?.kind !== "hotseat") return { ok: false };
  if (drop.spec.seat) return { ok: false, error: `${drop.spec.seatName} beat you to it.` };
  const { data: claimed } = await pl.db
    .from("drops")
    .update({ spec: { ...drop.spec, seat: pl.profile.id, seatName: pl.profile.first_name } })
    .eq("id", drop.id)
    .filter("spec->>seat", "is", null)
    .select("id");
  if (!claimed?.length) return { ok: false, error: "Someone just took it." };
  await pl.db.from("answers").upsert(
    { drop_id: drop.id, user_id: pl.profile.id, body: "I'm in the hot seat. Ask me anything. I'll answer in the replies.", data: { question: "(in the seat)" } },
    { onConflict: "drop_id,user_id", ignoreDuplicates: true }
  );
  revalidatePath("/circle", "layout");
  return { ok: true };
}

// Blind Date: tap in, get paired with the next guy who taps in.
export async function blindDateIn(week: number): Promise<Result> {
  const pl = await player();
  if (currentWeek(pl) !== week || pl.clock.phase !== "season") return { ok: false, error: "That drop isn't open." };
  const drop = await ensureDrop(pl.db, pl.circle, week);
  if (drop.spec?.kind !== "blinddate") return { ok: false };
  const { data: mine } = await pl.db.from("answers").select("id, data").eq("drop_id", drop.id).eq("user_id", pl.profile.id).maybeSingle();
  if (mine) return { ok: true };
  // Somebody waiting? Pair up.
  const { data: waiting } = await pl.db
    .from("answers")
    .select("id, user_id")
    .eq("drop_id", drop.id)
    .filter("data->>status", "eq", "waiting")
    .neq("user_id", pl.profile.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  const until = (pl.clock.nextDrop ?? pl.clock.finaleAt).toISOString();
  if (waiting && isMember(pl, waiting.user_id)) {
    const [a, b] = [pl.profile.id, waiting.user_id as string].sort();
    await pl.db.from("dm_threads").upsert({ a, b, requested_by: pl.profile.id, accepted_at: new Date().toISOString(), blind_until: until, blind_drop: drop.id }, { onConflict: "a,b" });
    const { data: t } = await pl.db.from("dm_threads").select("id").eq("a", a).eq("b", b).single();
    await pl.db.from("answers").update({ data: { status: "paired", thread: t!.id } }).eq("id", waiting.id);
    await pl.db.from("answers").insert({ drop_id: drop.id, user_id: pl.profile.id, body: "Paired.", data: { status: "paired", thread: t!.id } });
    await notify(pl.db, [waiting.user_id as string], { title: "💘 You've got a blind date", body: "He's in your DMs. No names, no faces, until the reveal.", url: `/circle/dms/${t!.id}`, tag: `dm:${t!.id}` });
    // Fake guys open with a line.
    const { data: other } = await pl.db.from("profiles").select("is_demo, email").eq("id", waiting.user_id).maybeSingle();
    if (other?.is_demo) await demoReplyInThread(pl.db, t!.id, waiting.user_id as string, other.email as string | null);
  } else {
    await pl.db.from("answers").insert({ drop_id: drop.id, user_id: pl.profile.id, body: "Waiting for a date.", data: { status: "waiting" } });
    if (pl.circle.is_test) {
      // In a test Circle a fake guy taps in right behind him.
      const demo = pl.members.find((m) => m.is_demo);
      if (demo) {
        const [a, b] = [pl.profile.id, demo.id].sort();
        await pl.db.from("dm_threads").upsert({ a, b, requested_by: demo.id, accepted_at: new Date().toISOString(), blind_until: until, blind_drop: drop.id }, { onConflict: "a,b" });
        const { data: t } = await pl.db.from("dm_threads").select("id").eq("a", a).eq("b", b).single();
        await pl.db.from("answers").update({ data: { status: "paired", thread: t!.id }, body: "Paired." }).eq("drop_id", drop.id).eq("user_id", pl.profile.id);
        await pl.db.from("answers").upsert({ drop_id: drop.id, user_id: demo.id, body: "Paired.", data: { status: "paired", thread: t!.id } }, { onConflict: "drop_id,user_id", ignoreDuplicates: true });
        await demoReplyInThread(pl.db, t!.id, demo.id, demo.email);
      }
    }
  }
  revalidatePath("/circle", "layout");
  return { ok: true };
}


// Mad Libs: one vote for the best story.
export async function voteStory(dropId: string, answerId: string): Promise<Result> {
  const pl = await player();
  if (!UUID.test(dropId) || !UUID.test(answerId)) return { ok: false };
  const { data: drop } = await pl.db.from("drops").select("circle_id, week, locked_at").eq("id", dropId).maybeSingle();
  if (!drop || drop.circle_id !== pl.circle.id || drop.locked_at) return { ok: false, error: "Voting is closed." };
  const a = await answerInMyCircle(pl, answerId);
  if (!a || a.user_id === pl.profile.id) return { ok: false, error: "Not your own." };
  await pl.db.from("story_votes").upsert({ drop_id: dropId, voter: pl.profile.id, answer_id: answerId }, { onConflict: "drop_id,voter" });
  revalidatePath("/circle", "layout");
  return { ok: true };
}

// Report an answer (a photo, a clip, a line). Two reports pull it until a mod looks.
const ANSWER_REASONS = new Set(["explicit", "harassment", "underage", "fake", "other"]);
export async function reportAnswer(answerId: string, reason: string, details: string): Promise<Result> {
  const pl = await player();
  if (!ANSWER_REASONS.has(reason)) return { ok: false, error: "Pick a reason." };
  if (!UUID.test(answerId)) return { ok: false };
  const { data: a } = await pl.db.from("answers").select("id, user_id, drops(circle_id)").eq("id", answerId).maybeSingle();
  const row = a as unknown as { id: string; user_id: string; drops: { circle_id: string } } | null;
  if (!row || row.drops.circle_id !== pl.circle.id || row.user_id === pl.profile.id) return { ok: false };
  const dbReason = reason === "explicit" ? "other" : reason;
  const { error } = await pl.db
    .from("reports")
    .insert({ reporter: pl.profile.id, reported: row.user_id, answer_id: answerId, reason: dbReason, details: ((reason === "explicit" ? "Explicit in a public space. " : "") + clean(details, 500)).trim() || null });
  if (error && error.code !== "23505") return { ok: false, error: "That didn't send. Try again." };
  const { count } = await pl.db.from("reports").select("id", { count: "exact", head: true }).eq("answer_id", answerId);
  if ((count ?? 0) >= 2) await pl.db.from("answers").update({ hidden: true }).eq("id", answerId);
  revalidatePath("/circle", "layout");
  return { ok: true };
}

// Blind Date, after the reveal: both have to say Keep talking.
export async function blindKeep(threadId: string, keep: boolean): Promise<Result> {
  const pl = await player();
  const t = await myThread(pl, threadId);
  if (!t || !t.blind_until) return { ok: false };
  if (new Date(t.blind_until) > new Date()) return { ok: false, error: "Not until the reveal." };
  if (!keep) {
    await pl.db.from("dm_threads").delete().eq("id", t.id);
    revalidatePath("/circle/dms", "layout");
    return { ok: true };
  }
  const mine = t.a === pl.profile.id ? "keep_a" : "keep_b";
  const theirs = mine === "keep_a" ? "keep_b" : "keep_a";
  const otherId = t.a === pl.profile.id ? t.b : t.a;
  const { data: other } = await pl.db.from("profiles").select("is_demo").eq("id", otherId).maybeSingle();
  await pl.db.from("dm_threads").update({ [mine]: true, ...(other?.is_demo ? { [theirs]: true } : {}) }).eq("id", t.id);
  if (!other?.is_demo && !t[theirs]) {
    await notify(pl.db, [otherId], { title: `${pl.profile.first_name} wants to keep talking`, body: "Your blind date said yes. Your move.", url: `/circle/dms/${t.id}`, tag: `dm:${t.id}` });
  }
  revalidatePath(`/circle/dms/${t.id}`);
  return { ok: true };
}
