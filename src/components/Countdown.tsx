"use client";

import { useEffect, useState } from "react";

// Counts down to the next Sunday at 8pm, the moment every Finale reveals.
function nextSunday8pm(now: Date): Date {
  const t = new Date(now);
  t.setHours(20, 0, 0, 0);
  const days = (7 - t.getDay()) % 7;
  t.setDate(t.getDate() + days);
  if (t <= now) t.setDate(t.getDate() + 7);
  return t;
}

function format(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return d > 0 ? `${d}d ${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

export default function Countdown() {
  const [left, setLeft] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setLeft(format(nextSunday8pm(now).getTime() - now.getTime()));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="countdown" role="timer" aria-label="Time until Sunday 8pm">
      <span className="countdown-label">The Finale</span>
      <span className="countdown-time">{left ?? "--:--:--"}</span>
      <span className="countdown-note">Sunday, 8pm. Everyone finds out at once.</span>
    </div>
  );
}
