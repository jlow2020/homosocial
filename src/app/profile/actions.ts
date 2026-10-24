"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getMe, getSupabaseAdmin } from "@/lib/supabase-server";
import { SEASON, ageFrom } from "@/lib/season";
import { placeForZip } from "@/lib/geo";
import { purgeAllMedia } from "@/lib/retention";
import { moderateImage, moderateText, enqueue } from "@/lib/moderation";

export type ProfileState = { error?: string; saved?: number };

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
  const place = placeForZip(zip);
  if (!place) return { error: "We couldn't find that zip. Homosocial is US only for now." };
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

  // Your profile is public to your Circle, so the same house rules apply.
  const words = [firstName, interests, hotTake].join("\n");
  const said = await moderateText(words, "profile");
  if (said.action === "hold") {
    return { error: `Something in your profile breaks the house rules (${(said.reason ?? "").toLowerCase()}). Edit it and try again. Think we got it wrong? Email support@homosocial.net.` };
  }

  let photoPath = existing?.photo_path ?? "";
  let photoCheck: Awaited<ReturnType<typeof moderateImage>> | null = null;
  if (hasPhoto) {
    const buf = Buffer.from(await photo.arrayBuffer());
    photoCheck = await moderateImage(buf, "a profile photo his whole group sees");
    if (photoCheck.action === "hold") {
      return { error: "Your profile photo shows more than the house rules allow. Underwear's fine, nothing more. Pick another one." };
    }
    photoPath = `${me.userId}/${randomUUID()}.jpg`;
    const up = await db.storage
      .from("photos")
      .upload(photoPath, buf, { contentType: "image/jpeg", upsert: false });
    if (up.error) return { error: "Your photo didn't upload. Try again." };
  }

  const row = {
    id: me.userId,
    email: me.email,
    first_name: firstName,
    birthdate,
    zip,
    region: "us",
    lat: place.lat,
    lng: place.lng,
    city: place.city,
    state: place.state,
    tz: place.tz,
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
  if (said.action === "flag") {
    await enqueue(db, { user_id: me.userId, circle_id: existing?.circle_id ?? null, surface: "profile", content: words, verdict: "flagged", category: said.category, reason: said.reason, urgent: said.urgent, detail: said.detail });
  }
  if (photoCheck && photoCheck.action === "veil") {
    await enqueue(db, { user_id: me.userId, circle_id: existing?.circle_id ?? null, surface: "profile_photo", media_bucket: "photos", media_path: photoPath, verdict: "flagged", category: "nudity", reason: photoCheck.reason, detail: { scores: photoCheck.scores, ai: photoCheck.ai } });
  }

  // New guys go straight into the rest of the profile; it all can be skipped.
  if (!existing) redirect("/profile/more");
  // A new face photo means a new Realness Check.
  if (hasPhoto) redirect("/verify");
  // Still signing up: carry on with the rest of the profile.
  if (!existing.verified_at) redirect("/profile/more");
  revalidatePath("/profile");
  revalidatePath("/circle", "layout");
  return { saved: Date.now() };
}

export async function deleteAccount() {
  const me = await getMe();
  const db = getSupabaseAdmin();
  if (!me || !db) redirect("/");
  await purgeAllMedia(db, me.userId);
  await db.auth.admin.deleteUser(me.userId);
  redirect("/?deleted=1");
}
