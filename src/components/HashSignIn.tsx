"use client";

import { useEffect } from "react";
import { finishSignIn } from "@/app/auth/finish/actions";

// Email sign-in links come back with the session in the URL fragment
// (#access_token=...). Supabase may land them on any page, so this runs
// everywhere, turns the tokens into a login cookie, and moves on.
export default function HashSignIn({ always = false }: { always?: boolean }) {
  useEffect(() => {
    const raw = window.location.hash.slice(1);
    const hash = new URLSearchParams(raw);
    const access = hash.get("access_token");
    const failed = hash.get("error_code") || hash.get("error");
    if (!access && !failed && !always) return;
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    if (!access) {
      window.location.replace("/join?error=link");
      return;
    }
    (async () => {
      const ok = await finishSignIn(access, hash.get("refresh_token") ?? "");
      const recovery = hash.get("type") === "recovery";
      window.location.replace(!ok ? "/join?error=link" : recovery ? "/account?reset=1" : "/me");
    })();
  }, [always]);
  return null;
}
