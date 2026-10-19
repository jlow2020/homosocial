"use client";

import { useState, useTransition } from "react";
import { voteStory } from "../../game-actions";

export default function StoryVote({ dropId, answerId, mine, votes }: { dropId: string; answerId: string; mine: boolean; votes: number }) {
  const [on, setOn] = useState(mine);
  const [n, setN] = useState(votes);
  const [pending, start] = useTransition();
  return (
    <button
      className={on ? "story-vote on" : "story-vote"}
      disabled={pending || on}
      onClick={() =>
        start(async () => {
          const r = await voteStory(dropId, answerId);
          if (r.ok) {
            setOn(true);
            setN(n + 1);
          }
        })
      }
    >
      {on ? "📖 Your pick for best story" : "📖 Best story"} {n > 0 && <span className="fine">· {n}</span>}
    </button>
  );
}
