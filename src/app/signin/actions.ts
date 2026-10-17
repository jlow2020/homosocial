"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseAdmin, getSupabaseAuth, getSupabaseMailer, siteOrigin } from "@/lib/supabase-server";
import { normalizeUsername } from "@/lib/username";

export type SignInState = { error?: string; resetSent?: string };

const WRONG = "Wrong username or password.";

export async function signInWithUsername(_prev: SignInState, form: FormData): Promise<SignInState> {
  const who = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!who || !password) return { error: WRONG };

  const auth = await getSupabaseAuth();
  const db = getSupabaseAdmin();
  if (!auth || !db) return { error: "Sign-in isn't connected yet." };

  // Usernames are the front door. Typing the email also works, quietly.
  let email: string | null = null;
  if (who.includes("@") && who.indexOf("@") > 0) {
    const { data } = await db.from("logins").select("email").eq("email", who.toLowerCase()).maybeSingle();
    email = (data?.email as string | undefined) ?? null;
  } else {
    const { data } = await db.from("logins").select("email").eq("username", normalizeUsername(who)).maybeSingle();
    email = (data?.email as string | undefined) ?? null;
  }
  if (!email) return { error: WRONG };

  const { error } = await auth.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.status === 429) return { error: "Too many tries. Wait a few minutes and try again." };
    return { error: WRONG };
  }
  redirect("/me");
}

export async function sendReset(_prev: SignInState, form: FormData): Promise<SignInState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "That email doesn't look right." };
  const db = getSupabaseAdmin();
  const mailer = getSupabaseMailer();
  if (!db || !mailer) return { error: "Sign-in isn't connected yet." };

  // Only send to accounts that exist, but never say which ones do.
  const { data } = await db.from("logins").select("user_id").eq("email", email).maybeSingle();
  if (data) {
    const origin = siteOrigin(await headers());
    const { error } = await mailer.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/finish` });
    if (error?.status === 429) return { error: "Too many emails right now. Wait a few minutes and try again." };
  }
  return { resetSent: email };
}
