import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// What the Privacy Policy and Biometric Notice promise, carried out.

// Realness Check frames: deleted once the ID check passes, or 90 days after
// the Realness Check if he never does it.
export async function purgeVerificationFrames(db: SupabaseClient, userId: string): Promise<void> {
  const { data } = await db.storage.from("verifications").list(userId, { limit: 1000 });
  if (data?.length) await db.storage.from("verifications").remove(data.map((f) => `${userId}/${f.name}`));
  const { data: row } = await db.from("profiles").select("verification").eq("id", userId).maybeSingle();
  const v = row?.verification as Record<string, unknown> | null;
  if (v && (v.frames || v.neutralFrames)) {
    await db.from("profiles").update({ verification: { ...v, frames: [], neutralFrames: [], purgedAt: new Date().toISOString() } }).eq("id", userId);
  }
}

const RETAIN_DAYS = 90;

export async function purgeStaleVerifications(db: SupabaseClient): Promise<number> {
  const cutoff = new Date(Date.now() - RETAIN_DAYS * 864e5).toISOString();
  const { data } = await db
    .from("profiles")
    .select("id, verification")
    .is("id_verified_at", null)
    .lt("verified_at", cutoff)
    .limit(200);
  let n = 0;
  for (const p of data ?? []) {
    const v = p.verification as { frames?: string[]; neutralFrames?: string[] } | null;
    if (v?.frames?.length || v?.neutralFrames?.length) {
      await purgeVerificationFrames(db, p.id as string);
      n++;
    }
  }
  return n;
}

// Everything he ever uploaded, gone, before his account is deleted. The
// database rows go with the account; this clears the files they pointed to.
export async function purgeAllMedia(db: SupabaseClient, userId: string): Promise<void> {
  const photos = new Set<string>();
  const clips = new Set<string>();
  const sort = (path: string | null, type: string | null) => {
    if (!path) return;
    if (type === "video" || type === "audio") clips.add(path);
    else photos.add(path);
  };
  const { data: answers } = await db.from("answers").select("photo_path, media_type").eq("user_id", userId).not("photo_path", "is", null);
  for (const a of answers ?? []) sort(a.photo_path, a.media_type);
  // Every DM thread he's in disappears with him, so both sides' media goes too.
  const { data: threads } = await db.from("dm_threads").select("id").or(`a.eq.${userId},b.eq.${userId}`);
  const ids = (threads ?? []).map((t) => t.id as string);
  if (ids.length) {
    const { data: msgs } = await db.from("dm_messages").select("photo_path, media_type").in("thread_id", ids).not("photo_path", "is", null);
    for (const m of msgs ?? []) sort(m.photo_path, m.media_type);
  }
  const { data: readings } = await db.from("chain_readings").select("path").eq("user_id", userId);
  for (const r of readings ?? []) clips.add(r.path as string);
  const { data: prof } = await db.from("profiles").select("voice_path").eq("id", userId).maybeSingle();
  if (prof?.voice_path) clips.add(prof.voice_path as string);
  for (const [bucket, set] of [["photos", photos], ["clips", clips]] as const) {
    const list = [...set];
    for (let i = 0; i < list.length; i += 100) await db.storage.from(bucket).remove(list.slice(i, i + 100));
  }
  for (const bucket of ["photos", "verifications"]) {
    const { data } = await db.storage.from(bucket).list(userId, { limit: 1000 });
    if (data?.length) await db.storage.from(bucket).remove(data.map((f) => `${userId}/${f.name}`));
  }
  // A banned guy's ID fingerprint stays, so the same ID can't come back.
  const { data: p } = await db.from("profiles").select("status").eq("id", userId).maybeSingle();
  if (p?.status === "banned") {
    const { data: check } = await db.from("id_checks").select("doc_hash").eq("user_id", userId).maybeSingle();
    if (check?.doc_hash) await db.from("banned_ids").upsert({ doc_hash: check.doc_hash }, { onConflict: "doc_hash", ignoreDuplicates: true });
  }
}
