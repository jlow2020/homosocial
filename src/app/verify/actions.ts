"use server";

import { getMe, getSupabaseAdmin } from "@/lib/supabase-server";
import { passes, type RealnessResult, MOVES } from "@/lib/realness";
import { SEASON } from "@/lib/season";
import { bestMatch, facesIn } from "@/lib/server/vision";
import { hasConsent } from "@/lib/consent";
import { BIOMETRIC_VERSION } from "@/lib/legal";

export type VerifyOutcome = { passed: boolean; message: string; retry: boolean };

const MAX_ATTEMPTS = 15;
const MAX_FRAME_BYTES = 1024 * 1024;

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export async function completeVerification(form: FormData): Promise<VerifyOutcome> {
  const me = await getMe();
  const db = getSupabaseAdmin();
  if (!me?.profile || !db) {
    return { passed: false, message: "Your session ended. Sign in again.", retry: false };
  }
  const p = me.profile;
  if (p.verified_at) return { passed: true, message: "", retry: false };
  if (!(await hasConsent(db, me.userId, "biometric", BIOMETRIC_VERSION))) {
    return { passed: false, message: "Agree to the face-matching notice first. Reload the page.", retry: false };
  }
  if (p.status === "paused" || p.status === "banned") {
    return { passed: false, message: "Your account is paused.", retry: false };
  }
  if (p.verification_attempts >= MAX_ATTEMPTS) {
    return {
      passed: false,
      message: "That's too many tries for today. Come back tomorrow with good light and a clear profile photo.",
      retry: false,
    };
  }

  let raw: Partial<RealnessResult> = {};
  try {
    raw = JSON.parse(String(form.get("result") ?? "{}"));
  } catch {
    return { passed: false, message: "Something went wrong. Try again.", retry: true };
  }
  const validMoves = Object.keys(MOVES);
  const result: RealnessResult = {
    moves: Array.isArray(raw.moves) ? raw.moves.filter((m) => validMoves.includes(m)).slice(0, 3) : [],
    match: num(raw.match),
    moveMatch: num(raw.moveMatch),
    real: num(raw.real),
    live: num(raw.live),
    minAge: num(raw.minAge),
    durationMs: num(raw.durationMs),
  };

  const frames: File[] = [];
  for (let i = 0; i < 3; i++) {
    const f = form.get(`frame${i}`);
    if (f instanceof File && f.type === "image/jpeg" && f.size > 0 && f.size <= MAX_FRAME_BYTES) frames.push(f);
  }

  const neutralFrames: File[] = [];
  for (let i = 0; i < 3; i++) {
    const f = form.get(`neutral${i}`);
    if (f instanceof File && f.type === "image/jpeg" && f.size > 0 && f.size <= MAX_FRAME_BYTES) neutralFrames.push(f);
  }

  const attempt = p.verification_attempts + 1;
  const stamp = Date.now();
  const paths: string[] = [];
  for (let i = 0; i < frames.length; i++) {
    const path = `${p.id}/${stamp}-${i}.jpg`;
    const up = await db.storage.from("verifications").upload(path, frames[i], { contentType: "image/jpeg" });
    if (!up.error) paths.push(path);
  }
  const neutralPaths: string[] = [];
  for (let i = 0; i < neutralFrames.length; i++) {
    const path = `${p.id}/${stamp}-n${i}.jpg`;
    const up = await db.storage.from("verifications").upload(path, neutralFrames[i], { contentType: "image/jpeg" });
    if (!up.error) neutralPaths.push(path);
  }

  // Don't trust the phone's face match. Redo it here against the profile photo.
  let serverMatch: number | null = null;
  try {
    const { data: photo } = await db.storage.from("photos").download(p.photo_path);
    const ref = photo ? (await facesIn(Buffer.from(await photo.arrayBuffer()), 1024))[0] : undefined;
    if (ref) {
      const live: number[][] = [];
      for (const f of neutralFrames.length ? neutralFrames : frames) {
        const face = (await facesIn(Buffer.from(await f.arrayBuffer()), 1024))[0];
        if (face) live.push(face.embedding);
      }
      serverMatch = live.length ? await bestMatch(ref.embedding, live) : 0;
    }
  } catch (e) {
    console.error("realness server match failed", e);
  }
  // If the server check couldn't run at all, fall back to the phone's number
  // rather than lock everyone out. The ID check is the hard gate.
  const checked: RealnessResult = serverMatch === null ? result : { ...result, match: serverMatch };

  const passed = frames.length === 3 && paths.length === 3 && passes(checked);
  const record = {
    ...result,
    clientMatch: result.match,
    serverMatch,
    passed,
    attempt,
    frames: paths,
    neutralFrames: neutralPaths,
    at: new Date(stamp).toISOString(),
  };

  const update: Record<string, unknown> = {
    verification: record,
    verification_attempts: attempt,
    updated_at: new Date().toISOString(),
  };
  if (passed) {
    update.verified_at = new Date().toISOString();
    if (!p.region) update.status = "waitlist";
  }
  const { error } = await db.from("profiles").update(update).eq("id", p.id);
  if (error) return { passed: false, message: "Your result didn't save. Try again.", retry: true };

  if (passed && p.region && !p.circle_id) {
    await db.rpc("place_member", { p_user: p.id, p_season: SEASON.id, p_region: p.region, p_capacity: SEASON.spots });
  }

  if (passed) return { passed: true, message: "", retry: false };

  // Don't explain which check failed. It only helps people game it.
  const lowMatch = checked.match < 0.5;
  return {
    passed: false,
    message: lowMatch
      ? "We couldn't match you to your profile photo. Try again in better light, or use a clearer profile photo."
      : "We couldn't verify you that time. Find good, even light, hold your phone at eye level, and try again.",
    retry: true,
  };
}
