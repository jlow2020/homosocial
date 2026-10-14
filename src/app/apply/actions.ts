"use server";

import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export type ApplyState = { ok: boolean; error?: string };

const MAX_SELFIE_BYTES = 3 * 1024 * 1024;

function text(form: FormData, key: string, max = 500): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export async function submitApplication(
  _prev: ApplyState,
  form: FormData
): Promise<ApplyState> {
  // Bots fill every field, people never see this one.
  if (text(form, "company")) return { ok: true };

  const firstName = text(form, "first_name", 60);
  const email = text(form, "email", 200).toLowerCase();
  const age = Number(text(form, "age", 3));
  const zip = text(form, "zip", 10);
  const instagram = text(form, "instagram", 60).replace(/^@/, "");
  const interests = text(form, "interests", 300);
  const lookingFor = text(form, "looking_for", 20);
  const hotTake = text(form, "hot_take", 600);
  const heardFrom = text(form, "heard_from", 200);
  const agreed = form.get("agree") === "on";
  const selfie = form.get("selfie");

  if (!firstName) return { ok: false, error: "Add your first name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, error: "That email doesn't look right." };
  if (!Number.isFinite(age) || age < 18)
    return { ok: false, error: "Homosocial is for guys 18 and up." };
  if (age > 99) return { ok: false, error: "Check your age." };
  if (!/^\d{5}$/.test(zip))
    return { ok: false, error: "Add your five-digit zip code." };
  if (!interests)
    return { ok: false, error: "Tell us three things you're into." };
  if (lookingFor !== "friends" && lookingFor !== "friends_dating")
    return { ok: false, error: "Pick what you're looking for." };
  if (!hotTake) return { ok: false, error: "Give us your hot take." };
  if (!agreed)
    return { ok: false, error: "Confirm you're 18+ and agree to the rules." };
  if (!(selfie instanceof File) || selfie.size === 0)
    return { ok: false, error: "Add a selfie so we know you're real." };
  if (!selfie.type.startsWith("image/"))
    return { ok: false, error: "Your selfie needs to be a photo." };
  if (selfie.size > MAX_SELFIE_BYTES)
    return { ok: false, error: "That photo is too big. Try a smaller one." };

  const db = getSupabaseAdmin();
  if (!db) {
    return {
      ok: false,
      error:
        "Applications aren't connected to the database yet. Add the Supabase keys and try again.",
    };
  }

  const ext = selfie.type === "image/png" ? "png" : "jpg";
  const selfiePath = `${randomUUID()}.${ext}`;
  const upload = await db.storage
    .from("selfies")
    .upload(selfiePath, selfie, { contentType: selfie.type, upsert: false });
  if (upload.error) {
    return { ok: false, error: "Your selfie didn't upload. Try again." };
  }

  const { error } = await db.from("applications").insert({
    first_name: firstName,
    email,
    age,
    zip,
    instagram: instagram || null,
    interests,
    looking_for: lookingFor,
    hot_take: hotTake,
    heard_from: heardFrom || null,
    selfie_path: selfiePath,
  });

  if (error) {
    await db.storage.from("selfies").remove([selfiePath]);
    if (error.code === "23505") {
      return {
        ok: false,
        error: "There's already an application with that email.",
      };
    }
    return { ok: false, error: "Your application didn't save. Try again." };
  }

  return { ok: true };
}
