import "server-only";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { SupabaseClient } from "@supabase/supabase-js";

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

export type ClipRef = { table: "answers" | "dm_messages"; id: string; path: string; kind: "video" | "audio" };

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
        ? ["-y", "-i", inFile, "-map_metadata", "-1", "-vf", "scale='min(720,iw)':-2", "-c:v", "libx264", "-preset", "veryfast", "-crf", "26", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", "-t", "95", outFile]
        : ["-y", "-i", inFile, "-map_metadata", "-1", "-vn", "-c:a", "aac", "-b:a", "80k", "-movflags", "+faststart", "-t", "125", outFile];
    await run(ffmpeg, args, { timeout: 4 * 60 * 1000, maxBuffer: 16 * 1024 * 1024 });
    const out = await readFile(outFile);
    const newPath = ref.path.replace(/\.[a-z0-9]+$/i, "") + `-c.${outExt}`;
    const up = await db.storage.from("clips").upload(newPath, out, { contentType: ref.kind === "video" ? "video/mp4" : "audio/mp4", upsert: true });
    if (up.error) throw up.error;
    await db.from(ref.table).update({ photo_path: newPath, ready: true }).eq("id", ref.id);
    await db.storage.from("clips").remove([ref.path]);
  } catch (e) {
    console.error("convert failed", ref, e);
    // Leave the original in place and let it play where it can.
    await db.from(ref.table).update({ ready: true }).eq("id", ref.id);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
