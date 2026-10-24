"use client";

import { useState } from "react";

// Share homosocial.net with the phone's share sheet, or copy it.
export default function InviteButton({ className = "btn btn-pink" }: { className?: string }) {
  const [copied, setCopied] = useState(false);
  const url = "https://homosocial.net";
  async function share() {
    const text = "Join me on Homosocial. A social game for gay, bi, trans and queer men.";
    try {
      if (navigator.share) {
        await navigator.share({ title: "Homosocial", text, url });
        return;
      }
    } catch {
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  }
  return (
    <button className={className} onClick={share}>
      {copied ? "Link copied" : "Invite someone"}
    </button>
  );
}
