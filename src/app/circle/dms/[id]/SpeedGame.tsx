"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import SpeedRunner from "@/components/SpeedRunner";
import { playRematch, startRematch } from "../../game-actions";
import { sameAnswer } from "@/lib/game/rematch";

export type Game = { id: string; questions: string[]; seconds: number; mine: string[] | null; theirs: string[] | null };

// A Speed Round card inside the chat.
export default function SpeedGame({ game, otherName }: { game: Game; otherName: string }) {
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  if (playing && !game.mine) {
    return (
      <div className="game-card">
        <SpeedRunner
          questions={game.questions}
          seconds={game.seconds}
          busy={pending}
          onFinish={(answers) =>
            start(async () => {
              const r = await playRematch(game.id, answers);
              if (!r.ok) setError(r.error ?? "That didn't save.");
              setPlaying(false);
              router.refresh();
            })
          }
        />
      </div>
    );
  }

  if (!game.mine) {
    return (
      <div className="game-card">
        <p className="game-title">⚡ Speed Round</p>
        <p className="fine">Same ten questions as {otherName}. {game.seconds} seconds.</p>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-pink btn-small" onClick={() => setPlaying(true)}>
          Ready? Start the clock
        </button>
      </div>
    );
  }

  if (!game.theirs) {
    return (
      <div className="game-card">
        <p className="game-title">⚡ Speed Round</p>
        <p className="fine">Done. Waiting on {otherName}.</p>
      </div>
    );
  }

  const matched = game.questions.filter((_, i) => sameAnswer(game.mine![i] ?? "", game.theirs![i] ?? "")).length;
  return (
    <div className="game-card">
      <p className="game-title">
        ⚡ Speed Round <span className="fine">· {matched === 0 ? "no matches. Opposites?" : `${matched} matched`}</span>
      </p>
      <table className="rematch">
        <thead>
          <tr>
            <th scope="col">Question</th>
            <th scope="col">You</th>
            <th scope="col">{otherName}</th>
          </tr>
        </thead>
        <tbody>
          {game.questions.map((q, i) => {
            const same = sameAnswer(game.mine![i] ?? "", game.theirs![i] ?? "");
            return (
              <tr key={q} className={same ? "same" : ""}>
                <th scope="row">{q}</th>
                <td>{game.mine![i] || <span className="fine">ran out</span>}</td>
                <td>{game.theirs![i] || <span className="fine">ran out</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function Challenge({ threadId }: { threadId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();
  return (
    <>
      <button
        className="dm-challenge"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await startRematch(threadId);
            if (!r.ok) setError(r.error ?? "That didn't start.");
            router.refresh();
          })
        }
        aria-label="Challenge him to a Speed Round"
      >
        ⚡ Speed Round
      </button>
      {error && <span className="fine">{error}</span>}
    </>
  );
}
