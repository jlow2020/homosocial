import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { SEASON } from "@/lib/season";
import { loadCircles, loadPeople } from "../data";
import { when } from "../util";

export default async function Circles() {
  const { db } = await requireAdmin();
  const [circles, people] = await Promise.all([loadCircles(db), loadPeople(db)]);

  const tally = new Map<string, { seated: number; lobby: number; paused: number }>();
  for (const p of people) {
    const c = p.profile?.circle_id;
    if (!c) continue;
    const t = tally.get(c) ?? { seated: 0, lobby: 0, paused: 0 };
    if (p.stage === "Seated") t.seated++;
    else if (p.stage === "Lobby") t.lobby++;
    else if (p.stage === "Paused" || p.stage === "Banned") t.paused++;
    tally.set(c, t);
  }
  const waitlist = people.filter((p) => p.stage === "Waitlist").length;

  return (
    <div className="admin-stack">
      <h2 className="admin-h2">Circles</h2>
      <p className="admin-sub">
        A Circle starts at {SEASON.minToOpen} seated guys. {waitlist} waiting outside the US.
      </p>
      <div className="circle-cards">
        {circles.map((c) => {
          const t = tally.get(c.id) ?? { seated: 0, lobby: 0, paused: 0 };
          const live = t.seated >= SEASON.minToOpen;
          return (
            <Link key={c.id} href={`/admin/circles/${c.id}`} className="circle-card">
              <span className="circle-card-top">
                <b>
                  Circle {c.number}
                  {c.label ? ` · ${c.label}` : ""}
                </b>
                <span className={live ? "pill pill-mint" : "pill pill-gold"}>{live ? "Started" : "Filling"}</span>
              </span>
              <span className="admin-sub">
                {c.season.toUpperCase()} · opened {when(c.created_at)}
              </span>
              <span className="seat-bar" aria-hidden="true">
                <span style={{ width: `${Math.min(100, (t.seated / c.capacity) * 100)}%` }} />
              </span>
              <span className="circle-card-nums">
                <span>
                  <b>{t.seated}</b> seated
                </span>
                <span>
                  <b>{t.lobby}</b> in lobby
                </span>
                <span>
                  <b>{t.paused}</b> paused/banned
                </span>
              </span>
            </Link>
          );
        })}
      </div>
      {circles.length === 0 && <p className="admin-sub">No Circles yet.</p>}
    </div>
  );
}
