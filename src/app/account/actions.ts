"use server";

import { redirect } from "next/navigation";
import { getMe, getSupabaseAdmin, getSupabaseAuth } from "@/lib/supabase-server";
import { normalizeUsername, passwordProblem, usernameProblem } from "@/lib/username";
import { recordConsent } from "@/lib/consent";
import { TERMS_VERSION } from "@/lib/legal";

export type AccountState = { error?: string; saved?: boolean };

// First time: pick a username and password. After that: change password.
export async function saveAccount(_prev: AccountState, form: FormData): Promise<AccountState> {
  const me = await getMe();
  const auth = await getSupabaseAuth();
  const db = getSupabaseAdmin();
  if (!me || !auth || !db) redirect("/signin");

  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  const isNew = !me.username;

  let username = me.username;
  if (isNew) {
    username = normalizeUsername(String(form.get("username") ?? ""));
    const bad = usernameProblem(username);
    if (bad) return { error: bad };
    if (form.get("agree") !== "on") return { error: "Check the box to agree to the Terms first." };
    const { data: taken } = await db.from("logins").select("user_id").eq("username", username).maybeSingle();
    if (taken) return { error: "That username's taken. Try another." };
  }

  const badPw = passwordProblem(password, confirm);
  if (badPw) return { error: badPw };

  const { error: pwError } = await auth.auth.updateUser({ password });
  if (pwError) {
    if (/different from the old/i.test(pwError.message)) return { error: "Pick a password you haven't used here before." };
    if (/weak|pwned|leaked/i.test(pwError.message)) return { error: "That password is too easy to guess. Try a longer one." };
    return { error: "Your password didn't save. Try again." };
  }

  if (isNew) {
    const { error } = await db.from("logins").insert({ user_id: me.userId, username, email: (me.email ?? "").toLowerCase() });
    if (error) {
      if (error.code === "23505") return { error: "Someone just grabbed that username. Try another." };
      return { error: "Your username didn't save. Try again." };
    }
    await recordConsent(db, me.userId, "terms", TERMS_VERSION);
    redirect("/me");
  }
  return { saved: true };
}
