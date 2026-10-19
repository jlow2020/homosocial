"use client";

import { useTransition } from "react";
import { voteHeat } from "./game-actions";

export default function HeatVote({ votes, needed, mine, heat }: { votes: number; needed: number; mine: boolean; heat: number }) {
  const [pending, start] = useTransition();
  return (
    <section className="mini-card heat-card">
      <div className="mini-head">
        <h3>Heat</h3>
        <span className="heat-meter" aria-label={`Heat ${heat} of 5`}>
          {"🔥".repeat(heat)}
          <span className="heat-off">{"🔥".repeat(5 - heat)}</span>
        </span>
      </div>
      {heat >= 5 ? (
        <p className="fine">Maxed out. This Circle runs as filthy as it gets.</p>
      ) : (
        <>
          <p className="fine">
            Want next week filthier? {votes} of {needed} votes.
          </p>
          <button className={mine ? "btn btn-outline btn-small" : "btn btn-pink btn-small"} disabled={pending} onClick={() => start(async () => void (await voteHeat()))}>
            {mine ? "Take my vote back" : "Turn it up"}
          </button>
        </>
      )}
    </section>
  );
}
