"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getMe, getSupabaseAdmin } from "@/lib/supabase-server";
import { moderateImage, moderateText, enqueue } from "@/lib/moderation";
import { convertClip } from "@/lib/media";
import { TAG_BY_SLUG, slugOf } from "@/lib/profile/catalog";
import { DOWN_BY_SLUG } from "@/lib/profile/downfor";
import { PROMPT_BY_ID, PRONOUNS, ZODIAC, RELATIONSHIP } from "@/lib/profile/prompts";
import { rankPrompts, templateDrafts, aiDrafts, type Me } from "@/lib/profile/drafts";

type Result = { ok: boolean; error?: string };
const MAX_PHOTOS = 5;
const MAX_TAGS = 25;
const AUDIO_TYPES = new Set(["audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/wav"]);

async function me() {
  const m = await getMe();
  const db = getSupabaseAdmin();
  if (!m?.profile || !db) return null;
  return { id: m.userId, profile: m.profile, db };
}

function done() {
  revalidatePath("/profile/more");
  revalidatePath("/circle", "layout");
}

// Tags. Catalog slugs, plus ones he makes up himself.
export async function saveTags(kind: "interest" | "down", slugs: string[], custom: string[] = []): Promise<Result & { added?: { slug: string; label: string }[] }> {
  const m = await me();
  if (!m) return { ok: false, error: "Sign in again." };
  const allowed = kind === "down" ? new Set(DOWN_BY_SLUG.keys()) : null;
  const keep = new Set<string>();
  for (const s of slugs.slice(0, MAX_TAGS)) {
    if (typeof s !== "string") continue;
    if (kind === "down" ? allowed!.has(s) : TAG_BY_SLUG.has(s) || /^c-[a-z0-9-]{2,40}$/.test(s)) keep.add(s);
  }
  const added: { slug: string; label: string }[] = [];
  if (kind === "interest") {
    for (const raw of custom.slice(0, 5)) {
      const label = String(raw ?? "").replace(/\s+/g, " ").trim().slice(0, 32);
      if (label.length < 2) continue;
      const d = await moderateText(label, "profile");
      if (d.action === "hold") return { ok: false, error: `"${label}" can't be a tag here.` };
      const slug = `c-${slugOf(label)}`.slice(0, 42);
      if (slug.length < 4) continue;
      const { data: had } = await m.db.from("custom_tags").select("slug, label, uses, status").eq("slug", slug).maybeSingle();
      if (had?.status === "hidden") return { ok: false, error: `"${label}" can't be a tag here.` };
      if (!had) await m.db.from("custom_tags").insert({ slug, label, uses: 0, created_by: m.id });
      if (d.action === "flag") await enqueue(m.db, { user_id: m.id, circle_id: m.profile.circle_id, surface: "profile", content: `Tag: ${label}`, verdict: "flagged", category: d.category, reason: d.reason, detail: d.detail });
      keep.add(slug);
      added.push({ slug, label: had?.label ?? label });
    }
  }
  const { data: before } = await m.db.from("user_tags").select("slug").eq("user_id", m.id).eq("kind", kind);
  const prev = new Set((before ?? []).map((r) => r.slug as string));
  const gone = [...prev].filter((s) => !keep.has(s));
  const fresh = [...keep].filter((s) => !prev.has(s));
  if (gone.length) await m.db.from("user_tags").delete().eq("user_id", m.id).eq("kind", kind).in("slug", gone);
  if (fresh.length) await m.db.from("user_tags").insert(fresh.map((slug) => ({ user_id: m.id, slug, kind })));
  // Keep member-made tag counts honest.
  for (const s of [...gone, ...fresh].filter((x) => x.startsWith("c-"))) {
    const { count } = await m.db.from("user_tags").select("user_id", { count: "exact", head: true }).eq("slug", s);
    await m.db.from("custom_tags").update({ uses: count ?? 0 }).eq("slug", s);
  }
  done();
  return { ok: true, added };
}

export async function saveAnswers(items: { prompt_id: string; body: string }[]): Promise<Result> {
  const m = await me();
  if (!m) return { ok: false, error: "Sign in again." };
  const clean = items
    .filter((i) => PROMPT_BY_ID.has(i.prompt_id))
    .map((i) => ({ prompt_id: i.prompt_id, body: String(i.body ?? "").replace(/\s+/g, " ").trim().slice(0, 200) }))
    .filter((i) => i.body.length > 0)
    .slice(0, 3);
  if (new Set(clean.map((c) => c.prompt_id)).size !== clean.length) return { ok: false, error: "Pick three different prompts." };
  for (const c of clean) {
    const d = await moderateText(c.body, "profile");
    if (d.action === "hold") return { ok: false, error: `Your answer to "${PROMPT_BY_ID.get(c.prompt_id)!.text}" breaks the house rules (${(d.reason ?? "").toLowerCase()}). Change it and try again.` };
    if (d.action === "flag") await enqueue(m.db, { user_id: m.id, circle_id: m.profile.circle_id, surface: "profile", content: c.body, verdict: "flagged", category: d.category, reason: d.reason, detail: d.detail });
  }
  await m.db.from("profile_answers").delete().eq("user_id", m.id);
  if (clean.length) await m.db.from("profile_answers").insert(clean.map((c, i) => ({ user_id: m.id, ...c, position: i })));
  done();
  return { ok: true };
}

export async function saveBasics(b: { pronouns?: string; hometown?: string; work?: string; zodiac?: string; song?: string; spot?: string; relationship?: string; show_relationship?: boolean }): Promise<Result> {
  const m = await me();
  if (!m) return { ok: false, error: "Sign in again." };
  const t = (v: unknown, max: number) => {
    const s = String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
    return s || null;
  };
  const row = {
    pronouns: b.pronouns && (PRONOUNS.includes(b.pronouns) || b.pronouns.length <= 20) ? t(b.pronouns, 20) : null,
    hometown: t(b.hometown, 60),
    work: t(b.work, 60),
    zodiac: b.zodiac && ZODIAC.includes(b.zodiac) ? b.zodiac : null,
    song: t(b.song, 80),
    spot: t(b.spot, 80),
    relationship: b.relationship && RELATIONSHIP.includes(b.relationship) ? b.relationship : null,
    show_relationship: !!b.show_relationship,
  };
  const words = [row.pronouns, row.hometown, row.work, row.song, row.spot].filter(Boolean).join("\n");
  if (words) {
    const d = await moderateText(words, "profile");
    if (d.action === "hold") return { ok: false, error: `Something there breaks the house rules (${(d.reason ?? "").toLowerCase()}). Change it and try again.` };
  }
  await m.db.from("profiles").update(row).eq("id", m.id);
  done();
  return { ok: true };
}

export async function addPhoto(form: FormData): Promise<Result> {
  const m = await me();
  if (!m) return { ok: false, error: "Sign in again." };
  const file = form.get("photo");
  if (!(file instanceof File) || file.type !== "image/jpeg" || file.size === 0 || file.size > 3 * 1024 * 1024) return { ok: false, error: "That photo didn't work. Try another." };
  const { count } = await m.db.from("profile_photos").select("id", { count: "exact", head: true }).eq("user_id", m.id);
  if ((count ?? 0) >= MAX_PHOTOS) return { ok: false, error: `Up to ${MAX_PHOTOS} extra photos.` };
  const buf = Buffer.from(await file.arrayBuffer());
  const check = await moderateImage(buf, "a profile photo his whole group sees");
  if (check.action === "hold") return { ok: false, error: "That one shows more than the house rules allow on a profile. Underwear's fine, nothing more." };
  const theme = String(form.get("theme") ?? "").trim().slice(0, 60) || null;
  const path = `${m.id}/extra-${randomUUID()}.jpg`;
  const up = await m.db.storage.from("photos").upload(path, buf, { contentType: "image/jpeg" });
  if (up.error) return { ok: false, error: "It didn't upload. Try again." };
  const { data: row } = await m.db.from("profile_photos").insert({ user_id: m.id, path, theme, position: count ?? 0, veiled: check.action === "veil" }).select("id").single();
  if (check.action === "veil" && row) {
    await enqueue(m.db, { user_id: m.id, circle_id: m.profile.circle_id, surface: "profile_photo", ref_table: null, ref_id: row.id, media_bucket: "photos", media_path: path, verdict: "veiled", category: "nudity", reason: check.reason ?? null, detail: { scores: check.scores, ai: check.ai } });
  }
  done();
  return { ok: true };
}

export async function removePhoto(id: string): Promise<Result> {
  const m = await me();
  if (!m) return { ok: false };
  const { data } = await m.db.from("profile_photos").select("path, kind").eq("id", id).eq("user_id", m.id).maybeSingle();
  if (!data) return { ok: false };
  await m.db.from("profile_photos").delete().eq("id", id);
  await m.db.storage.from(data.kind === "video" ? "clips" : "photos").remove([data.path as string]);
  done();
  return { ok: true };
}

export async function setPhotoTheme(id: string, theme: string): Promise<Result> {
  const m = await me();
  if (!m) return { ok: false };
  const t = theme.trim().slice(0, 60) || null;
  if (t) {
    const d = await moderateText(t, "profile");
    if (d.action === "hold") return { ok: false, error: "That caption can't go on a profile." };
  }
  await m.db.from("profile_photos").update({ theme: t }).eq("id", id).eq("user_id", m.id);
  done();
  return { ok: true };
}

export async function voiceTicket(contentType: string, size: number): Promise<{ ok: boolean; error?: string; signedUrl?: string; path?: string; apikey?: string }> {
  const m = await me();
  if (!m) return { ok: false, error: "Sign in again." };
  if (!AUDIO_TYPES.has(contentType)) return { ok: false, error: "That file type won't play." };
  if (!(size > 0 && size <= 4 * 1024 * 1024)) return { ok: false, error: "Keep it to 15 seconds." };
  const ext = contentType === "audio/mp4" ? "m4a" : contentType === "audio/mpeg" ? "mp3" : contentType === "audio/wav" ? "wav" : contentType === "audio/ogg" ? "ogg" : "weba";
  const path = `hello/${m.id}-${Date.now()}.${ext}`;
  const { data, error } = await m.db.storage.from("clips").createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: "Couldn't start the upload." };
  return { ok: true, signedUrl: data.signedUrl, path, apikey: process.env.SUPABASE_PUBLISHABLE_KEY };
}

export async function saveVoice(path: string): Promise<Result> {
  const m = await me();
  if (!m) return { ok: false, error: "Sign in again." };
  if (!path.startsWith(`hello/${m.id}-`) || path.includes("..")) return { ok: false, error: "That didn't work." };
  const { data: found } = await m.db.storage.from("clips").list("hello", { search: path.slice(6), limit: 1 });
  if (!found?.length) return { ok: false, error: "The recording didn't finish uploading." };
  const { data: old } = await m.db.from("profiles").select("voice_path").eq("id", m.id).single();
  await m.db.from("profiles").update({ voice_path: path, voice_ready: false }).eq("id", m.id);
  if (old?.voice_path) await m.db.storage.from("clips").remove([old.voice_path as string]);
  const db = m.db;
  after(() => convertClip(db, { table: "profiles", id: m.id, path, kind: "audio" }));
  done();
  return { ok: true };
}

export async function removeVoice(): Promise<Result> {
  const m = await me();
  if (!m) return { ok: false };
  const { data: old } = await m.db.from("profiles").select("voice_path").eq("id", m.id).single();
  await m.db.from("profiles").update({ voice_path: null, voice_ready: true }).eq("id", m.id);
  if (old?.voice_path) await m.db.storage.from("clips").remove([old.voice_path as string]);
  done();
  return { ok: true };
}

export async function pinAnswer(answerId: string | null): Promise<Result> {
  const m = await me();
  if (!m) return { ok: false };
  if (answerId) {
    const { data } = await m.db.from("answers").select("user_id").eq("id", answerId).maybeSingle();
    if (data?.user_id !== m.id) return { ok: false };
  }
  await m.db.from("profiles").update({ pinned_answer_id: answerId }).eq("id", m.id);
  done();
  return { ok: true };
}

// Prompts that fit him, each with answers drafted from what he's told us.
async function aboutMe(m: NonNullable<Awaited<ReturnType<typeof me>>>): Promise<Me> {
  const { data: tags } = await m.db.from("user_tags").select("slug, kind").eq("user_id", m.id);
  const p = m.profile as { first_name: string; interests: string | null; hot_take: string | null; work?: string | null };
  return {
    first: p.first_name,
    tags: (tags ?? []).filter((t) => t.kind === "interest").map((t) => t.slug as string),
    down: (tags ?? []).filter((t) => t.kind === "down").map((t) => t.slug as string),
    interests: p.interests ?? "",
    hotTake: p.hot_take ?? "",
    work: p.work ?? null,
  };
}

async function draftsFor(ids: string[], who: Me): Promise<Record<string, string[]>> {
  const ai = await aiDrafts(ids, who);
  const out: Record<string, string[]> = {};
  for (const id of ids) {
    const mine = templateDrafts(id, who);
    // His hot take is already his words, so it leads when it fits.
    const lead = (id === "die-on" || id === "unpopular") && who.hotTake ? [mine[0]] : [];
    out[id] = [...new Set([...lead, ...(ai?.[id] ?? []), ...mine])].slice(0, 4);
  }
  return out;
}

export async function promptPack(keep: string[]): Promise<{ ranked: string[]; drafts: Record<string, string[]> }> {
  const m = await me();
  if (!m) return { ranked: [], drafts: {} };
  const who = await aboutMe(m);
  const ranked = rankPrompts(who, m.id);
  const first = [...keep.filter((k) => PROMPT_BY_ID.has(k)), ...ranked.filter((r) => !keep.includes(r))].slice(0, 3);
  return { ranked, drafts: await draftsFor(first, who) };
}

export async function promptDrafts(id: string): Promise<string[]> {
  const m = await me();
  if (!m || !PROMPT_BY_ID.has(id)) return [];
  return (await draftsFor([id], await aboutMe(m)))[id] ?? [];
}

// Short videos next to the photos: up to 30 seconds, uploaded straight to storage,
// then converted and checked frame by frame like video answers.
const VIDEO_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);
const MAX_VIDEO = 50 * 1024 * 1024;

export async function videoTicket(contentType: string, size: number): Promise<{ ok: boolean; error?: string; signedUrl?: string; path?: string; apikey?: string }> {
  const m = await me();
  if (!m) return { ok: false, error: "Sign in again." };
  if (!VIDEO_TYPES.has(contentType)) return { ok: false, error: "That video type won't play. Try an .mp4 or .mov." };
  if (!(size > 0 && size <= MAX_VIDEO)) return { ok: false, error: "That video is too big. Keep it under 30 seconds." };
  const { count } = await m.db.from("profile_photos").select("id", { count: "exact", head: true }).eq("user_id", m.id);
  if ((count ?? 0) >= MAX_PHOTOS) return { ok: false, error: `Up to ${MAX_PHOTOS} extra photos and videos.` };
  const ext = contentType === "video/quicktime" ? "mov" : contentType === "video/webm" ? "webm" : "mp4";
  const path = `profile/${m.id}-${Date.now()}.${ext}`;
  const { data, error } = await m.db.storage.from("clips").createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: "Couldn't start the upload. Try again." };
  return { ok: true, signedUrl: data.signedUrl, path, apikey: process.env.SUPABASE_PUBLISHABLE_KEY };
}

export async function addVideo(path: string, theme: string): Promise<Result> {
  const m = await me();
  if (!m) return { ok: false, error: "Sign in again." };
  if (typeof path !== "string" || !path.startsWith(`profile/${m.id}-`) || path.includes("..")) return { ok: false, error: "That didn't upload." };
  const { count } = await m.db.from("profile_photos").select("id", { count: "exact", head: true }).eq("user_id", m.id);
  if ((count ?? 0) >= MAX_PHOTOS) return { ok: false, error: `Up to ${MAX_PHOTOS} extra photos and videos.` };
  const { data: row } = await m.db
    .from("profile_photos")
    .insert({ user_id: m.id, path, kind: "video", ready: false, theme: String(theme ?? "").trim().slice(0, 60) || null, position: count ?? 0 })
    .select("id")
    .single();
  if (!row) return { ok: false, error: "That didn't save. Try again." };
  const db = m.db;
  after(() => convertClip(db, { table: "profile_photos", id: row.id as string, path, kind: "video" }));
  done();
  return { ok: true };
}
