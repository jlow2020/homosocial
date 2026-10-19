"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Re-fetches the page every few seconds while it's open, so new messages show up.
export default function Live({ every = 5000 }: { every?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, every);
    return () => clearInterval(t);
  }, [router, every]);
  return null;
}
