"use client";

import { useOptimistic, useTransition } from "react";
import { toggleReaction } from "../../game-actions";

const SET: [string, string][] = [
  ["fire", "🔥"],
  ["lol", "😂"],
  ["crown", "👑"],
  ["heart", "❤️"],
];

type R = { user_id: string; emoji: string };

export default function Reactions({ answerId, reactions, meId }: { answerId: string; reactions: R[]; meId: string }) {
  const [, start] = useTransition();
  const [list, flip] = useOptimistic(reactions, (cur: R[], emoji: string) =>
    cur.some((r) => r.user_id === meId && r.emoji === emoji)
      ? cur.filter((r) => !(r.user_id === meId && r.emoji === emoji))
      : [...cur, { user_id: meId, emoji }]
  );
  return (
    <div className="reactions">
      {SET.map(([key, icon]) => {
        const n = list.filter((r) => r.emoji === key).length;
        const mine = list.some((r) => r.emoji === key && r.user_id === meId);
        return (
          <button
            key={key}
            className={mine ? "react on" : "react"}
            aria-pressed={mine}
            onClick={() =>
              start(async () => {
                flip(key);
                await toggleReaction(answerId, key);
              })
            }
          >
            {icon} {n > 0 && <span>{n}</span>}
          </button>
        );
      })}
    </div>
  );
}
