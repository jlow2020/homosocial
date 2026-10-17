"use server";

import { getSupabaseAuth } from "@/lib/supabase-server";

// Turns the tokens from an email sign-in link into a normal login cookie.
// Returns "ok" or a short reason, which ends up in the URL for debugging.
export async function finishSignIn(accessToken: string, refreshToken: string): Promise<string> {
  if (!accessToken || !refreshToken) return "missing_token";
  const auth = await getSupabaseAuth();
  if (!auth) return "not_configured";
  const { error } = await auth.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  if (error) {
    console.error("finishSignIn", error.message);
    return error.code ?? "set_session_failed";
  }
  return "ok";
}
