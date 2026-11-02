"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseAdmin, getSupabaseAuth, getSupabaseMailer, siteOrigin } from "@/lib/supabase-server";

export type JoinState = { sent?: string; error?: string; hasAccount?: boolean; resent?: boolean };

export async function joinWithEmail(_prev: JoinState, form: FormData): Promise<JoinState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "That email doesn't look right." };
  }
  const mailer = getSupabaseMailer();
  const db = getSupabaseAdmin();
  if (!mailer || !db) return { error: "Sign-in isn't connected yet. Add the Supabase keys." };

  // Email links are for signing up only. Existing guys use their password.
  const { data: existing } = await db.from("logins").select("user_id").eq("email", email).maybeSingle();
  if (existing) return { error: "That email already has an account. Sign in with your username and password.", hasAccount: true };

  const origin = siteOrigin(await headers());
  const { error } = await mailer.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/finish`, shouldCreateUser: true },
  });
  if (error) {
    // A resend that fails keeps him on the "check your email" screen.
    const keep = form.get("again") === "1" ? { sent: email } : {};
    if (error.status === 429) {
      return { ...keep, error: "One email a minute. Wait a moment and try again." };
    }
    return { ...keep, error: "We couldn't send your link. Try again." };
  }
  return { sent: email, resent: form.get("again") === "1" };
}

export async function joinWithGoogle() {
  const auth = await getSupabaseAuth();
  if (!auth) redirect("/join?error=setup");
  const origin = siteOrigin(await headers());
  const { data, error } = await auth.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error || !data.url) redirect("/join?error=google");
  redirect(data.url);
}

export async function signOut() {
  const auth = await getSupabaseAuth();
  await auth?.auth.signOut();
  redirect("/");
}
