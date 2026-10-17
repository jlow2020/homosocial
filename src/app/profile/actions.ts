"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { getMe, getSupabaseAdmin } from "@/lib/supabase-server";
import { SEASON, ageFrom, regionForZip } from "@/lib/season";

export type ProfileState = { error?: string };

const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

function text(form: FormData, key: string, max = 500): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export async function saveProfile(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  const me = await getMe();
  const db = getSupabaseAdmin();
  if (!me || !db) redirect("/signin");
  if (!me.username) redirect("/account");
  const existing = me.profile;

  const firstName = text(form, "first_name", 60);
  const birthdate = text(form, "birthdate", 10);
  const zip = text(form, "zip", 5);
  const interests = text(form, "interests", 300);
  const lookingFor = text(form, "looking_for", 20);
  const hotTake = text(form, "hot_take", 600);
  const photo = form.get("photo");
  const hasPhoto = photo instanceof File && photo.size > 0;

  if (!firstName) return { error: "Add your first name." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) return { error: "Add your birthday." };
  const age = ageFrom(birthdate);
  if (!Number.isFinite(age) || age < SEASON.minAge) return { error: `Homosocial is for guys ${SEASON.minAge} and up.` };
  if (age > 99) return { error: "Check your birthday." };
  if (!/^\d{5}$/.test(zip)) return { error: "Add your five-digit zip code." };
  if (!interests) return { error: "Tell us three things you're into." };
  if (lookingFor !== "friends" && lookingFor !== "friends_dating")
    return { error: "Pick what you're looking for." };
  if (!hotTake) return { error: "Give us your hot take." };
  if (!existing && form.get("agree") !== "on")
    return { error: "Agree to the house rules to join." };
  if (!existing && !hasPhoto) return { error: "Add a profile photo of your face." };
  if (hasPhoto) {
    if (!photo.type.startsWith("image/")) return { error: "Your photo needs to be a picture." };
    if (photo.size > MAX_PHOTO_BYTES) return { error: "That photo is too big. Try a smaller one." };
  }

  let photoPath = existing?.photo_path ?? "";
  if (hasPhoto) {
    photoPath = `${me.userId}/${randomUUID()}.jpg`;
    const up = await db.storage
      .from("photos")
      .upload(photoPath, photo, { contentType: "image/jpeg", upsert: false });
    if (up.error) return { error: "Your photo didn't upload. Try again." };
  }

  const region = regionForZip(zip);
  const row = {
    id: me.userId,
    email: me.email,
    first_name: firstName,
    birthdate,
    zip,
    region,
    interests,
    looking_for: lookingFor,
    hot_take: hotTake,
    photo_path: photoPath,
    updated_at: new Date().toISOString(),
    // A new photo has to pass a new Realness Check.
    ...(hasPhoto ? { verified_at: null } : {}),
  };

  const { error } = await db.from("profiles").upsert(row, { onConflict: "id" });
  if (error) {
    if (hasPhoto) await db.storage.from("photos").remove([photoPath]);
    return { error: "Your profile didn't save. Try again." };
  }
  if (hasPhoto && existing?.photo_path && existing.photo_path !== photoPath) {
    await db.storage.from("photos").remove([existing.photo_path]);
  }

  redirect(hasPhoto || !existing?.verified_at ? "/verify" : "/circle");
}

export async function deleteAccount() {
  const me = await getMe();
  const db = getSupabaseAdmin();
  if (!me || !db) redirect("/");
  for (const bucket of ["photos", "verifications"]) {
    const { data } = await db.storage.from(bucket).list(me.userId, { limit: 100 });
    if (data && data.length) {
      await db.storage.from(bucket).remove(data.map((f) => `${me.userId}/${f.name}`));
    }
  }
  await db.auth.admin.deleteUser(me.userId);
  redirect("/?deleted=1");
}
