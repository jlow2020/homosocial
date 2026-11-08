// Browser-only. What to do when the page crashes.

// A new version went live while the page was open: old code asking for files or
// server functions that no longer exist. A fresh load fixes it.
const STALE = /ChunkLoadError|Loading chunk|Loading CSS chunk|Failed to find Server Action|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|older or newer deployment|Server Action .* was not found/i;

export function looksStale(e: unknown): boolean {
  const msg = e instanceof Error ? `${e.name} ${e.message}` : String(e ?? "");
  return STALE.test(msg);
}

// Reload once. If we reloaded in the last 20 seconds, don't loop.
export function reloadOnce(): boolean {
  try {
    const last = Number(sessionStorage.getItem("hs-reloaded") || 0);
    if (Date.now() - last < 20000) return false;
    sessionStorage.setItem("hs-reloaded", String(Date.now()));
  } catch {
    // no storage: still reload, a loop is unlikely
  }
  window.location.reload();
  return true;
}

export function reportCrash(e: unknown, reloaded = false) {
  try {
    const err = e as { message?: string; stack?: string; digest?: string; name?: string };
    const body = JSON.stringify({
      message: `${err?.name ?? ""} ${err?.message ?? String(e)}`.trim(),
      stack: err?.stack ?? "",
      digest: err?.digest ?? "",
      path: location.pathname + location.search,
      reloaded,
    });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/client-error", new Blob([body], { type: "application/json" }));
    else void fetch("/api/client-error", { method: "POST", body, keepalive: true });
  } catch {
    // ignore
  }
}

// Crash handling for any boundary: stale code reloads quietly, anything else gets reported.
export function handleCrash(e: unknown): "reloading" | "shown" {
  const stale = looksStale(e);
  reportCrash(e, stale);
  if (stale && reloadOnce()) return "reloading";
  return "shown";
}
