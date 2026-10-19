"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import VoiceRecorder from "@/components/VoiceRecorder";
import { fireReading, readingTicket, saveReading } from "../../game-actions";

export function RecordReading({ week }: { week: number }) {
  const router = useRouter();
  return (
    <VoiceRecorder
      seconds={120}
      label="🎙️ Read the whole story out loud, up to 2 minutes"
      getTicket={(type, size) => readingTicket(week, type, size)}
      onUploaded={async (path) => {
        const r = await saveReading(week, path);
        if (r.ok) router.refresh();
        return r;
      }}
    />
  );
}

export function FireReading({ id, count, mine }: { id: string; count: number; mine: boolean }) {
  const [on, setOn] = useState(mine);
  const [n, setN] = useState(count);
  const [pending, start] = useTransition();
  return (
    <button
      className={on ? "story-vote on" : "story-vote"}
      disabled={pending}
      aria-pressed={on}
      onClick={() =>
        start(async () => {
          const r = await fireReading(id);
          if (r.ok) {
            setN(n + (on ? -1 : 1));
            setOn(!on);
          }
        })
      }
    >
      🔥 {n > 0 ? n : ""}
    </button>
  );
}
