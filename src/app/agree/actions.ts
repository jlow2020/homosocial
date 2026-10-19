"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getMe, getSupabaseAdmin } from "@/lib/supabase-server";
import { recordConsent } from "@/lib/consent";
import { BIOMETRIC_VERSION, TERMS_VERSION } from "@/lib/legal";

export async function acceptTerms(form: FormData): Promise<void> {
  const me = await getMe();
  const db = getSupabaseAdmin();
  if (!me || !db) redirect("/signin");
  if (form.get("agree") !== "on") redirect("/agree?error=1");
  await recordConsent(db, me.userId, "terms", TERMS_VERSION);
  redirect("/me");
}

export async function acceptBiometric(form: FormData): Promise<void> {
  const me = await getMe();
  const db = getSupabaseAdmin();
  if (!me || !db) redirect("/signin");
  const back = String(form.get("back") ?? "/verify");
  const safe = back === "/verify/id" ? "/verify/id" : "/verify";
  if (form.get("agree") !== "on") redirect(`${safe}?consent=missing`);
  await recordConsent(db, me.userId, "biometric", BIOMETRIC_VERSION);
  revalidatePath(safe);
  redirect(safe);
}
