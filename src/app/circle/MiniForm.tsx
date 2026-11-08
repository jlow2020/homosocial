"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { answerMini } from "./game-actions";

// One tap and it's in. Results show as soon as it saves.
export default function MiniForm({
  week,
  slot,
  options,
  guys,
}: {
  week: number;
  slot: number;
  options?: string[];
  guys?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [picked, setPicked] = useState<string | null>(null);
  const [error, setError] = useState("");

  const send = (key: string, choice: number | null, guy: string | null) => {
    setPicked(key);
    setError("");
    start(async () => {
      const r = await answerMini(week, slot, choice, guy);
      if (!r.ok) {
        setError(r.error ?? "That didn't save.");
        setPicked(null);
      } else router.refresh();
    });
  };

  return (
    <div className="mini-form">
      <div className={guys ? "mini-opts mini-guys" : options && options.length > 2 ? "mini-opts mini-poll" : "mini-opts"}>
        {guys
          ? guys.map((g) => (
              <button key={g.id} type="button" disabled={pending} className={picked === g.id ? "tot-btn on" : "tot-btn"} onClick={() => send(g.id, null, g.id)}>
                {g.name}
              </button>
            ))
          : (options ?? []).map((o, i) => (
              <button key={o} type="button" disabled={pending} className={picked === String(i) ? "tot-btn on" : "tot-btn"} onClick={() => send(String(i), i, null)}>
                {o}
              </button>
            ))}
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
