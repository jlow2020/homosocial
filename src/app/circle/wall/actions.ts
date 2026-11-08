"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { cookies } from "next/headers";
import { loadPlayer, type Player } from "@/lib/game/player";
import { UUID } from "@/lib/admin";
import { notify } from "@/lib/notify";
import { convertClip } from "@/lib/media";
import { moderateText, moderateImage, enqueue, queueFor, HELD_NOTICE, CARE_NOTICE, type Decision } from "@/lib/moderation";

// The Circle Wall: posts, comments, likes. Only guys in the Circle see any of it.
// Words, photos and videos all go through the same filters as the rest of the game.

type Result = { ok: boolean; error?: string; notice?: string };

const MAX_PHOTO = 3 * 1024 * 1024;
const MAX_CLIP = 50 * 1024 * 1024;
const CLIP_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);
const READ_ONLY: Result = { ok: false, error: "This Circle's Season is over, so it's read-only now." };

async function player(): Promise<Player> {
  return loadPlayer({ needSeat: true });
}

function clean(s: unknown, max: number): string {
  return String(s ?? "").replace(/\s+\n/g, "\n").trim().slice(0, max);
}

async function noticeFor(d: Decision | null, held: boolean): Promise<string | undefined> {
  const text = held ? HELD_NOTICE : d?.care ? CARE_NOTICE : undefined;
  if (text) (await cookies()).set("hs_flash", encodeURIComponent(text), { path: "/", maxAge: 120, sameSite: "lax" });
  return text;
}

function canPost(pl: Player): Result | null {
  if (pl.closed) return READ_ONLY;
  if (pl.waiting || pl.clock.phase === "filling") return { ok: false, error: "The Wall opens when your Circle starts." };
  return null;
}

async function postInMyCircle(pl: Player, postId: string) {
  if (!UUID.test(postId)) return null;
  const { data } = await pl.db.from("wall_posts").select("id, user_id, circle_id").eq("id", postId).maybeSingle();
  return data && data.circle_id === pl.circle.id ? data : null;
}

// Videos go straight from the phone to storage with a one-time ticket.
export async function wallClipTicket(contentType: string, size: number): Promise<{ ok: boolean; error?: string; signedUrl?: string; path?: string; apikey?: string }> {
  const pl = await player();
  const no = canPost(pl);
  if (no) return { ok: false, error: no.error };
  if (!CLIP_TYPES.has(contentType)) return { ok: false, error: "That video type won't play. Try an .mp4 or .mov." };
  if (!(size > 0 && size <= MAX_CLIP)) return { ok: false, error: "That clip is too big. Keep it under 30 seconds." };
  const ext = contentType === "video/quicktime" ? "mov" : contentType === "video/webm" ? "webm" : "mp4";
  const path = `wall/${pl.circle.id}/${pl.profile.id}-${Date.now()}.${ext}`;
  const { data, error } = await pl.db.storage.from("clips").createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: "Couldn't start the upload. Try again." };
  return { ok: true, signedUrl: data.signedUrl, path, apikey: process.env.SUPABASE_PUBLISHABLE_KEY };
}

// Words plus an optional photo (sent with the form) or video (already uploaded).
async function readMedia(pl: Player, form: FormData) {
  const file = form.get("photo");
  const videoPath = String(form.get("video_path") ?? "");
  if (file instanceof File && file.size > 0) {
    if (file.type !== "image/jpeg" || file.size > MAX_PHOTO) return { error: "That photo didn't work. Try a different one." };
    const buf = Buffer.from(await file.arrayBuffer());
    const img = await moderateImage(buf, "a post his whole group sees");
    const path = `wall/${pl.circle.id}/${pl.profile.id}-${Date.now()}.jpg`;
    const up = await pl.db.storage.from("photos").upload(path, buf, { contentType: "image/jpeg" });
    if (up.error) return { error: "Your photo didn't upload. Try again." };
    return { kind: "photo" as const, path, img };
  }
  if (videoPath) {
    const prefix = `wall/${pl.circle.id}/${pl.profile.id}-`;
    if (!videoPath.startsWith(prefix) || videoPath.includes("..")) return { error: "That video didn't work." };
    const { data: found } = await pl.db.storage.from("clips").list(`wall/${pl.circle.id}`, { search: videoPath.slice(videoPath.lastIndexOf("/") + 1), limit: 1 });
    if (!found?.length) return { error: "The video didn't finish uploading. Try again." };
    return { kind: "video" as const, path: videoPath, img: null };
  }
  return { kind: null, path: null, img: null };
}

export async function createPost(form: FormData): Promise<Result> {
  const pl = await player();
  const no = canPost(pl);
  if (no) return no;
  const body = clean(form.get("body"), 2000);
  const media = await readMedia(pl, form);
  if ("error" in media) return { ok: false, error: media.error };
  if (!body && !media.path) return { ok: false, error: "Write something or add a photo or video." };

  const said = body ? await moderateText(body, "public") : null;
  const held = said?.action === "hold" || media.img?.action === "hold";
  const veiled = media.img?.action === "veil";
  const isVideo = media.kind === "video";
  const { data: post, error } = await pl.db
    .from("wall_posts")
    .insert({ circle_id: pl.circle.id, user_id: pl.profile.id, body: body || null, photo_path: media.path, media_type: media.kind, ready: !isVideo, held, veiled })
    .select("id")
    .single();
  if (error || !post) return { ok: false, error: "That didn't post. Try again." };

  if (isVideo) {
    const db = pl.db;
    after(() => convertClip(db, { table: "wall_posts", id: post.id, path: media.path!, kind: "video" }));
  }
  if (said) await queueFor(pl.db, said, { user_id: pl.profile.id, circle_id: pl.circle.id, surface: "wall", ref_table: "wall_posts", ref_id: post.id, content: body });
  if (media.img && media.img.action !== "allow") {
    await enqueue(pl.db, {
      user_id: pl.profile.id, circle_id: pl.circle.id, surface: "wall", ref_table: "wall_posts", ref_id: post.id, content: body || null,
      media_bucket: "photos", media_path: media.path, verdict: media.img.action === "hold" ? "held" : "veiled", category: "nudity", reason: media.img.reason ?? null,
      detail: { scores: media.img.scores, ai: media.img.ai },
    });
  }
  revalidatePath("/circle/wall");
  return { ok: true, notice: await noticeFor(said, held) };
}

export async function addComment(form: FormData): Promise<Result> {
  const pl = await player();
  const no = canPost(pl);
  if (no) return no;
  const post = await postInMyCircle(pl, String(form.get("post_id") ?? ""));
  if (!post) return { ok: false, error: "That post is gone." };
  const body = clean(form.get("body"), 800);
  const media = await readMedia(pl, form);
  if ("error" in media) return { ok: false, error: media.error };
  if (!body && !media.path) return { ok: false, error: "Write something first." };

  const said = body ? await moderateText(body, "public") : null;
  const held = said?.action === "hold" || media.img?.action === "hold";
  const veiled = media.img?.action === "veil";
  const isVideo = media.kind === "video";
  const { data: c, error } = await pl.db
    .from("wall_comments")
    .insert({ post_id: post.id, user_id: pl.profile.id, body: body || null, photo_path: media.path, media_type: media.kind, ready: !isVideo, held, veiled })
    .select("id")
    .single();
  if (error || !c) return { ok: false, error: "That didn't post. Try again." };

  if (isVideo) {
    const db = pl.db;
    after(() => convertClip(db, { table: "wall_comments", id: c.id, path: media.path!, kind: "video" }));
  }
  if (said) await queueFor(pl.db, said, { user_id: pl.profile.id, circle_id: pl.circle.id, surface: "wall", ref_table: "wall_comments", ref_id: c.id, content: body });
  if (media.img && media.img.action !== "allow") {
    await enqueue(pl.db, {
      user_id: pl.profile.id, circle_id: pl.circle.id, surface: "wall", ref_table: "wall_comments", ref_id: c.id, content: body || null,
      media_bucket: "photos", media_path: media.path, verdict: media.img.action === "hold" ? "held" : "veiled", category: "nudity", reason: media.img.reason ?? null,
      detail: { scores: media.img.scores, ai: media.img.ai },
    });
  }

  // Tell the guy who posted, and everyone else in the conversation.
  if (!held) {
    const { data: others } = await pl.db.from("wall_comments").select("user_id").eq("post_id", post.id);
    const to = [...new Set([post.user_id as string, ...(others ?? []).map((o) => o.user_id as string)])].filter((id) => id !== pl.profile.id);
    if (to.length) {
      const said = body ? (body.length > 80 ? body.slice(0, 79) + "…" : body) : media.kind === "video" ? "sent a video" : "sent a photo";
      await notify(pl.db, to, {
        title: `${pl.profile.first_name} commented`,
        body: said,
        url: `/circle/wall/${post.id}`,
        tag: `wall:${post.id}`,
        email: false,
      });
    }
  }
  revalidatePath("/circle/wall", "layout");
  return { ok: true, notice: await noticeFor(said, held) };
}

export async function toggleLike(postId: string): Promise<Result> {
  const pl = await player();
  if (pl.closed) return READ_ONLY;
  const post = await postInMyCircle(pl, postId);
  if (!post) return { ok: false };
  const { data: had } = await pl.db.from("wall_likes").select("post_id").eq("post_id", post.id).eq("user_id", pl.profile.id).maybeSingle();
  if (had) await pl.db.from("wall_likes").delete().eq("post_id", post.id).eq("user_id", pl.profile.id);
  else await pl.db.from("wall_likes").insert({ post_id: post.id, user_id: pl.profile.id });
  revalidatePath("/circle/wall", "layout");
  return { ok: true };
}

export async function toggleCommentLike(commentId: string): Promise<Result> {
  const pl = await player();
  if (pl.closed || !UUID.test(commentId)) return pl.closed ? READ_ONLY : { ok: false };
  const { data: c } = await pl.db.from("wall_comments").select("id, post_id").eq("id", commentId).maybeSingle();
  if (!c || !(await postInMyCircle(pl, c.post_id as string))) return { ok: false };
  const { data: had } = await pl.db.from("wall_comment_likes").select("comment_id").eq("comment_id", c.id).eq("user_id", pl.profile.id).maybeSingle();
  if (had) await pl.db.from("wall_comment_likes").delete().eq("comment_id", c.id).eq("user_id", pl.profile.id);
  else await pl.db.from("wall_comment_likes").insert({ comment_id: c.id, user_id: pl.profile.id });
  revalidatePath("/circle/wall", "layout");
  return { ok: true };
}

// Your own post or comment, gone, along with its photo or video.
export async function deleteWallItem(kind: "post" | "comment", id: string): Promise<Result> {
  const pl = await player();
  if (!UUID.test(id)) return { ok: false };
  const table = kind === "post" ? "wall_posts" : "wall_comments";
  const { data: row } = await pl.db.from(table).select("id, user_id, photo_path, media_type").eq("id", id).maybeSingle();
  if (!row || row.user_id !== pl.profile.id) return { ok: false, error: "That's not yours to delete." };
  const media: { bucket: string; path: string }[] = [];
  if (row.photo_path) media.push({ bucket: row.media_type === "video" ? "clips" : "photos", path: row.photo_path as string });
  if (kind === "post") {
    const { data: cs } = await pl.db.from("wall_comments").select("photo_path, media_type").eq("post_id", id).not("photo_path", "is", null);
    for (const c of cs ?? []) media.push({ bucket: c.media_type === "video" ? "clips" : "photos", path: c.photo_path as string });
  }
  await pl.db.from(table).delete().eq("id", id);
  for (const b of ["photos", "clips"]) {
    const paths = media.filter((m) => m.bucket === b).map((m) => m.path);
    if (paths.length) await pl.db.storage.from(b).remove(paths);
  }
  revalidatePath("/circle/wall", "layout");
  return { ok: true };
}
