"use client";

import { useState, useTransition } from "react";
import { leaveTest, nextSeason, setWeek } from "@/app/admin/test-actions";
import type { Clock } from "@/lib/game/clock";

export default function TestBar({ circleId, clock, seasonNo }: { circleId: string; clock: Clock; seasonNo: number }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const now = clock.phase === "season" ? clock.week : clock.phase === "revealed" ? 9 : 0;
  return (
    <div className="testbar">
      <div className="wrap testbar-inner">
        <span className="testbar-label">Daddy controls</span>
        <div className="testbar-weeks" role="group" aria-label="Jump to week">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((w) => (
            <button
              key={w}
              className={w === now ? "wk on" : "wk"}
              disabled={pending}
              onClick={() => start(async () => setMsg((await setWeek(circleId, w)).message))}
              title={w === 9 ? "Finale revealed" : `Week ${w}`}
            >
              {w === 9 ? "★" : w}
            </button>
          ))}
        </div>
        {now === 9 && (
          <button className="link-button" disabled={pending} onClick={() => start(async () => setMsg((await nextSeason(circleId)).message))}>
            Start Season {seasonNo + 1}
          </button>
        )}
        <form action={leaveTest}>
          <button className="link-button quiet" type="submit">
            Leave test Circle
          </button>
        </form>
        {msg && <span className="testbar-msg">{msg}</span>}
      </div>
    </div>
  );
}
