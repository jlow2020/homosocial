"use client";

import { useState, useTransition } from "react";
import { voteLie } from "../../game-actions";

export default function LieVote({ dropId, answerId, statements, current }: { dropId: string; answerId: string; statements: string[]; current: number | null }) {
  const [v, setV] = useState<number | null>(current);
  const [pending, start] = useTransition();
  return (
    <ol className="tt-vote">
      {statements.map((s, i) => (
        <li key={i}>
          <button
            type="button"
            className={v === i ? "tt-opt on" : "tt-opt"}
            disabled={pending}
            onClick={() => {
              setV(i);
              start(async () => void (await voteLie(dropId, answerId, i)));
            }}
          >
            <span className="tt-num">{i + 1}</span> {s}
          </button>
        </li>
      ))}
      <li className="fine">{v === null ? "Which one's the lie?" : "Vote's in."}</li>
    </ol>
  );
}
