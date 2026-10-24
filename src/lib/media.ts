import "server-only";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { SupabaseClient } from "@supabase/supabase-js";
import { moderateImage, enqueue, HELD_NOTICE } from "@/lib/moderation";
import { notify } from "@/lib/notify";

// Every clip gets converted to one format that plays on every phone and
// browser: H.264 mp4 for video, AAC m4a for voice. iPhone .mov files and
// browser .webm recordings both come out the other side the same. Metadata
// (including the location an iPhone stamps into a video) is dropped.

const run = promisify(execFile);

async function ffmpegPath(): Promise<string> {
  const mod = (await import("ffmpeg-static")) as unknown as { default?: string } | string;
  const p = typeof mod === "string" ? mod : mod.default;
  if (!p) throw new Error("ffmpeg not found");
  return p;
}

export type ClipRef = { table: "answers" | "dm_messages" | "chain_readings" | "profiles" | "profile_photos"; id: string; path: string; kind: "video" | "audio" };

export async function convertClip(db: SupabaseClient, ref: ClipRef): Promise<void> {
  const dir = await mkdtemp(path.join(tmpdir(), "clip-"));
  try {
    const { data: blob, error } = await db.storage.from("clips").download(ref.path);
    if (error || !blob) throw error ?? new Error("download failed");
    const inFile = path.join(dir, "in" + path.extname(ref.path));
    await writeFile(inFile, Buffer.from(await blob.arrayBuffer()));
    const outExt = ref.kind === "video" ? "mp4" : "m4a";
    const outFile = path.join(dir, `out.${outExt}`);
    const ffmpeg = await ffmpegPath();
    const args =
      ref.kind === "video"
        ? ["-y", "-i", inFile, "-map_metadata", "-1", "-vf", "scale='min(720,iw)':-2", "-c:v", "libx264", "-preset", "veryfast", "-crf", "26", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", "-t", ref.table === "profile_photos" ? "31" : "95", outFile]
        : ["-y", "-i", inFile, "-map_metadata", "-1", "-vn", "-c:a", "aac", "-b:a", "80k", "-movflags", "+faststart", "-t", "125", outFile];
    const { stderr } = await run(ffmpeg, args, { timeout: 4 * 60 * 1000, maxBuffer: 16 * 1024 * 1024 });
    const out = await readFile(outFile);
    // Videos posted to the Circle get the same nudity check as photos, on a
    // few frames spread across the clip.
    let check: { action: "allow" | "veil" | "hold"; reason?: string; detail?: unknown } = { action: "allow" };
    if (ref.kind === "video" && (ref.table === "answers" || ref.table === "profile_photos")) check = await checkFrames(ffmpeg, outFile, dir, String(stderr));
    const newPath = ref.path.replace(/\.[a-z0-9]+$/i, "") + `-c.${outExt}`;
    const up = await db.storage.from("clips").upload(newPath, out, { contentType: ref.kind === "video" ? "video/mp4" : "audio/mp4", upsert: true });
    if (up.error) throw up.error;
    const flags = check.action === "hold" ? { held: true } : check.action === "veil" ? { veiled: true } : {};
    if (ref.table === "profiles") await db.from("profiles").update({ voice_path: newPath, voice_ready: true }).eq("id", ref.id);
    else if (ref.table === "profile_photos") await db.from("profile_photos").update({ path: newPath, ready: true, ...flags }).eq("id", ref.id);
    else {
      const col = ref.table === "chain_readings" ? "path" : "photo_path";
      await db.from(ref.table).update({ [col]: newPath, ready: true, ...flags }).eq("id", ref.id);
    }
    await db.storage.from("clips").remove([ref.path]);
    if (check.action !== "allow" && ref.table === "profile_photos") {
      const { data: row } = await db.from("profile_photos").select("user_id").eq("id", ref.id).maybeSingle();
      if (row) {
        const { data: p } = await db.from("profiles").select("circle_id").eq("id", row.user_id).maybeSingle();
        await enqueue(db, {
          user_id: row.user_id as string, circle_id: (p?.circle_id as string) ?? null,
          surface: "profile_photo", ref_table: "profile_photos", ref_id: ref.id, media_bucket: "clips", media_path: newPath,
          verdict: check.action === "hold" ? "held" : "veiled", category: "nudity", reason: check.reason ?? null, detail: { frames: check.detail },
        });
        if (check.action === "hold") {
          await notify(db, [row.user_id as string], { title: "Your video is waiting on a quick look", body: HELD_NOTICE, url: "/profile", tag: "held", email: false });
        }
      }
    } else if (check.action !== "allow") {
      const { data: row } = await db.from("answers").select("user_id, drops(circle_id)").eq("id", ref.id).maybeSingle();
      if (row) {
        await enqueue(db, {
          user_id: row.user_id as string,
          circle_id: (row.drops as unknown as { circle_id: string } | null)?.circle_id ?? null,
          surface: "video", ref_table: "answers", ref_id: ref.id, media_bucket: "clips", media_path: newPath,
          verdict: check.action === "hold" ? "held" : "veiled", category: "nudity", reason: check.reason ?? null, detail: { frames: check.detail },
        });
        if (check.action === "hold") {
          await notify(db, [row.user_id as string], { title: "Your video is waiting on a quick look", body: HELD_NOTICE, url: "/circle", tag: "held", email: false });
        }
      }
    }
  } catch (e) {
    console.error("convert failed", ref, e);
    // Leave the original in place and let it play where it can.
    await db.from(ref.table).update(ref.table === "profiles" ? { voice_ready: true } : { ready: true }).eq("id", ref.id);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// Five frames spread across the clip, each through the photo check. The worst one decides.
async function checkFrames(ffmpeg: string, file: string, dir: string, log: string) {
  const m = log.match(/Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/);
  const secs = m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 10;
  const points = [0.1, 0.3, 0.5, 0.7, 0.9].map((f) => Math.max(0, secs * f));
  let worst: { action: "allow" | "veil" | "hold"; reason?: string; detail?: unknown } = { action: "allow" };
  const details: unknown[] = [];
  for (let i = 0; i < points.length; i++) {
    const frame = path.join(dir, `f${i}.jpg`);
    try {
      await run(ffmpeg, ["-y", "-ss", points[i].toFixed(2), "-i", file, "-frames:v", "1", "-vf", "scale='min(720,iw)':-2", "-q:v", "3", frame], { timeout: 30000 });
      const d = await moderateImage(await readFile(frame), "a video his whole group sees");
      details.push({ at: Math.round(points[i]), action: d.action, scores: d.scores });
      if (d.action === "hold" || (d.action === "veil" && worst.action === "allow")) worst = { action: d.action, reason: d.reason };
      if (d.action === "hold") break;
    } catch {
      // A frame that won't extract is skipped, not held.
    }
  }
  return { ...worst, detail: details };
}
