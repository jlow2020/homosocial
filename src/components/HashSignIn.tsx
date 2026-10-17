"use client";

import { useEffect } from "react";
import { finishSignIn } from "@/app/auth/finish/actions";

let started = false;

// Email links come back with the session in the URL fragment
// (#access_token=...). Supabase may land them on any page, so this runs once
// from the root layout, turns the tokens into a login cookie, and moves on.
export default function HashSignIn() {
  useEffect(() => {
    if (started) return;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const access = hash.get("access_token");
    const failed = hash.get("error_code") || hash.get("error");
    const onFinishPage = window.location.pathname === "/auth/finish";
    if (!access && !failed && !onFinishPage) return;
    started = true;
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    if (!access) {
      window.location.replace(`/join?error=link&why=${encodeURIComponent(failed ?? "no_token")}`);
      return;
    }
    (async () => {
      const result = await finishSignIn(access, hash.get("refresh_token") ?? "");
      const recovery = hash.get("type") === "recovery";
      window.location.replace(
        result === "ok"
          ? recovery
            ? "/account?reset=1"
            : "/me"
          : `/join?error=link&why=${encodeURIComponent(result)}`,
      );
    })();
  }, []);
  return null;
}
