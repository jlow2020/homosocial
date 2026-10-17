"use server";

import { getSupabaseAuth } from "@/lib/supabase-server";

// Turns the tokens from an email sign-in link into a normal login cookie.
export async function finishSignIn(accessToken: string, refreshToken: string): Promise<boolean> {
  if (!accessToken || !refreshToken) return false;
  const auth = await getSupabaseAuth();
  if (!auth) return false;
  const { error } = await auth.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  return !error;
}
