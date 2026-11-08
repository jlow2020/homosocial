"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { dmPulse } from "../../game-actions";
import { looksStale, reloadOnce } from "@/lib/crash";

// Checks the chat about once a second with a tiny query, and only reloads it
// when something changed. Faster than reloading the whole page on a timer.
export default function Pulse({ threadId, every = 1200 }: { threadId: string; every?: number }) {
  const router = useRouter();
  const last = useRef<string | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      if (stop || busy.current || document.visibilityState !== "visible") return;
      busy.current = true;
      try {
        const sig = await dmPulse(threadId);
        if (sig && last.current !== null && sig !== last.current) router.refresh();
        if (sig) last.current = sig;
      } catch (e) {
        // A new version went live: reload onto it. Otherwise just offline for a second.
        if (looksStale(e)) reloadOnce();
      } finally {
        busy.current = false;
      }
    };
    void tick();
    const t = setInterval(tick, every);
    const wake = () => document.visibilityState === "visible" && router.refresh();
    document.addEventListener("visibilitychange", wake);
    return () => {
      stop = true;
      clearInterval(t);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [threadId, every, router]);
  return null;
}
