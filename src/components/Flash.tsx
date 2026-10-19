"use client";

import { useEffect, useState } from "react";

// A one-time note from the server (a held post, or where to find help).
export default function Flash({ text }: { text: string | null }) {
  const [shown, setShown] = useState(text);
  useEffect(() => {
    setShown(text);
    if (text) document.cookie = "hs_flash=; path=/; max-age=0";
  }, [text]);
  if (!shown) return null;
  return (
    <div className="flash" role="status">
      <p>{shown}</p>
      <button className="link-button quiet" onClick={() => setShown(null)} aria-label="Dismiss">
        Got it
      </button>
    </div>
  );
}
