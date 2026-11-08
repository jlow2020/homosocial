"use client";

import { useEffect } from "react";
import { looksStale, reloadOnce, reportCrash } from "@/lib/crash";

// Errors that happen outside a page render (a tap, a background check): stale
// code reloads quietly, and real bugs get reported.
export default function CrashWatch() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      const err = e.error ?? e.message;
      if (!err || /ResizeObserver loop/.test(String(e.message))) return;
      const stale = looksStale(err);
      reportCrash(err, stale);
      if (stale) reloadOnce();
    };
    const onReject = (e: PromiseRejectionEvent) => {
      const stale = looksStale(e.reason);
      if (stale) {
        reportCrash(e.reason, true);
        reloadOnce();
      }
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onReject);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onReject);
    };
  }, []);
  return null;
}
