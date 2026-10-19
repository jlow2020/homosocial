"use server";

import { createHmac } from "node:crypto";
import { getMe, getSupabaseAdmin } from "@/lib/supabase-server";
import { readDocument } from "@/lib/server/idread";
import { closestIdentity, identitiesIn, type Identity } from "@/lib/server/vision";
import { ageFrom, SEASON, FOUNDER_CAP } from "@/lib/season";

export type IdOutcome = { passed: boolean; message: string; retry: boolean };

const MAX_ATTEMPTS = 10;
const MAX_BYTES = 6 * 1024 * 1024;
// Face on the ID vs. the live Realness Check frames, as a distance (lower is
// more alike). See identityDistance for how this number was picked.
const ID_MAX_DISTANCE = 0.52;

function file(form: FormData, key: string): File | null {
  const f = form.get(key);
  return f instanceof File && f.size > 0 && f.size <= MAX_BYTES && f.type.startsWith("image/") ? f : null;
}

// A one-way fingerprint of the document so one ID can't open two accounts.
// The ID number itself is never stored.
function fingerprint(kind: string, issuer: string, docNumber: string): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "homosocial";
  return createHmac("sha256", key).update(`${kind}:${issuer}:${docNumber}`.toUpperCase()).digest("hex");
}

export async function checkId(form: FormData): Promise<IdOutcome> {
  const me = await getMe();
  const db = getSupabaseAdmin();
  if (!me?.profile || !db) return { passed: false, message: "Your session ended. Sign in again.", retry: false };
  const p = me.profile;
  if (p.id_verified_at) return { passed: true, message: "", retry: false };
  if (!p.verified_at) return { passed: false, message: "Do your Realness Check first.", retry: false };
  if (p.status === "paused" || p.status === "banned") return { passed: false, message: "Your account is paused.", retry: false };
  if ((p.id_attempts ?? 0) >= MAX_ATTEMPTS) {
    return { passed: false, message: "That's too many tries for now. Come back tomorrow.", retry: false };
  }

  const front = file(form, "front");
  const back = file(form, "back");
  if (!front) return { passed: false, message: "Add a photo of your ID.", retry: true };

  const attempt = (p.id_attempts ?? 0) + 1;
  const fail = async (message: string, reason: string, retry = true): Promise<IdOutcome> => {
    await db.from("profiles").update({ id_attempts: attempt, updated_at: new Date().toISOString() }).eq("id", p.id);
    console.log("id-check fail", p.id, reason);
    return { passed: false, message, retry };
  };

  const frontBuf = Buffer.from(await front.arrayBuffer());
  const backBuf = back ? Buffer.from(await back.arrayBuffer()) : null;

  // 1. Read the document: barcode on the back of licenses and ID cards,
  // <<< lines on passports and travel cards.
  let doc;
  try {
    doc = await readDocument(backBuf ? [backBuf, frontBuf] : [frontBuf]);
  } catch (e) {
    console.error("id-check read error", e);
    return fail("Something went wrong reading your ID. Try again.", "read_error");
  }
  if (!doc) {
    return fail(
      backBuf
        ? "We couldn't read the barcode on the back. Lay the card flat in good light, fill the frame, and make sure there's no glare on the barcode."
        : "We couldn't read the lines of <<< at the bottom of the page. Lay it flat in good light, fill the frame, and avoid glare.",
      "unreadable",
    );
  }

  // 2. Dates.
  const now = new Date();
  const birth = doc.birthDate.toISOString().slice(0, 10);
  const age = ageFrom(birth);
  if (doc.expires && doc.expires.getTime() < now.getTime() - 24 * 3600 * 1000) {
    return fail("That ID is expired. Use one that's current.", "expired");
  }
  if (!Number.isFinite(age) || age < SEASON.minAge) {
    return fail(`Homosocial is for guys ${SEASON.minAge} and up.`, "underage", false);
  }
  if (age > 110) return fail("We couldn't read the birthday on that ID. Try a clearer photo.", "bad_birthdate");

  // 3. Face on the ID vs. the live Realness Check and the profile photo.
  let idFaces: Identity[];
  try {
    idFaces = await identitiesIn(frontBuf, 1600);
  } catch (e) {
    console.error("id-check face error", e);
    return fail("Something went wrong reading your ID photo. Try again.", "face_error");
  }
  if (idFaces.length === 0) {
    return fail("We couldn't find the photo on your ID. Retake the front in good light with no glare on the picture.", "no_id_face");
  }
  const idFace = idFaces[0];

  const record = (p as unknown as { verification?: { frames?: string[]; neutralFrames?: string[] } }).verification;
  const livePaths = [...(record?.neutralFrames ?? []), ...(record?.frames ?? [])];
  const references: Identity[] = [];
  for (const path of livePaths.slice(0, 6)) {
    const { data } = await db.storage.from("verifications").download(path);
    if (!data) continue;
    const faces = await identitiesIn(Buffer.from(await data.arrayBuffer()), 1024).catch(() => []);
    if (faces[0]) references.push(faces[0]);
  }
  if (p.photo_path) {
    const { data } = await db.storage.from("photos").download(p.photo_path);
    if (data) {
      const faces = await identitiesIn(Buffer.from(await data.arrayBuffer()), 1024).catch(() => []);
      if (faces[0]) references.push(faces[0]);
    }
  }
  if (references.length === 0) {
    return fail("We need a fresh Realness Check before your ID. Redo it, then come back.", "no_reference", false);
  }
  const distance = await closestIdentity(idFace, references);
  // Stored and logged as a 0-1 score where higher is better: 1 - distance.
  const match = 1 - distance;
  console.log("id-check face", p.id, "distance", distance.toFixed(3));
  if (distance > ID_MAX_DISTANCE) {
    return fail(
      "The photo on your ID doesn't match your Realness Check. Retake the front of your ID in good light, filling the frame.",
      `face_mismatch ${match.toFixed(2)}`,
    );
  }

  // 4. One ID, one account.
  const hash = fingerprint(doc.kind, doc.issuer, doc.docNumber);
  const { data: existing } = await db.from("id_checks").select("user_id").eq("doc_hash", hash).maybeSingle();
  if (existing && existing.user_id !== p.id) {
    return fail("That ID is already linked to another Homosocial account.", "duplicate", false);
  }

  const stamp = new Date().toISOString();
  const { error: checkError } = await db.from("id_checks").upsert({
    user_id: p.id,
    doc_hash: hash,
    doc_kind: doc.kind === "license" ? "us_id" : `mrz_${doc.format}`,
    issuer: doc.issuer,
    face_match: Math.round(match * 1000) / 1000,
    checked_at: stamp,
  });
  if (checkError) {
    if (checkError.code === "23505") return fail("That ID is already linked to another Homosocial account.", "duplicate", false);
    console.error("id-check save error", checkError);
    return { passed: false, message: "Your result didn't save. Try again.", retry: true };
  }

  // The ID's birthday replaces the one he typed.
  const { error } = await db
    .from("profiles")
    .update({ id_verified_at: stamp, id_attempts: attempt, birthdate: birth, updated_at: stamp })
    .eq("id", p.id);
  if (error) return { passed: false, message: "Your result didn't save. Try again.", retry: true };
  // One of the first in? He's a Founder now.
  await db.rpc("claim_founder", { p_user: p.id, p_cap: FOUNDER_CAP });
  return { passed: true, message: "", retry: false };
}
