"use client";

import { useEffect, useState } from "react";
import { handleCrash, reloadOnce } from "@/lib/crash";

// Shown instead of the browser's bare "Application error" screen.
export default function CrashScreen({ error, reset }: { error: Error & { digest?: string }; reset?: () => void }) {
  const [state, setState] = useState<"reloading" | "shown" | null>(null);
  useEffect(() => setState(handleCrash(error)), [error]);

  return (
    <main className="crash">
      <p className="crash-mark" aria-hidden="true">
        ✦
      </p>
      <h1 className="crash-title">{state === "reloading" ? "Loading the new version..." : "That glitched."}</h1>
      {state !== "reloading" && (
        <>
          <p className="crash-text">We just got a note about it. Try again.</p>
          <div className="crash-actions">
            <button
              type="button"
              className="btn btn-pink"
              onClick={() => {
                if (reset) reset();
                else if (!reloadOnce()) window.location.reload();
              }}
            >
              Try again
            </button>
            <a href="/circle" className="btn btn-outline">
              Back to my Circle
            </a>
          </div>
        </>
      )}
    </main>
  );
}
