import { etLabel } from "@/lib/game/clock";
import type { MiniState } from "@/lib/game/mini-engine";
import MiniForm from "./MiniForm";

// The week's minis on the Circle home: locked until he plays the main drop,
// then two, spread over the rest of his week.
export default function MiniCard({
  state,
  guys,
  me,
  tz,
}: {
  state: MiniState;
  guys: { id: string; name: string }[];
  me: string;
  tz?: string | null;
}) {
  if (state.locked) {
    return (
      <section className="mini-card mini-locked" id="mini">
        <p className="eyebrow">Minis · locked</p>
        <h3>Play this week&apos;s drop to unlock 2 minis.</h3>
      </section>
    );
  }
  if (!state.items.length) return null;
  const others = guys.filter((g) => g.id !== me);
  return (
    <section className="mini-card mini-live" id="mini">
      {state.items.map((it) => (
        <div key={it.slot} className="mini-item">
          <p className="eyebrow">
            Mini {it.slot} of {state.items.length}
            {it.open && !it.mine ? " · new" : ""}
          </p>
          {!it.open ? (
            <p className="mini-next">Unlocks {etLabel(it.unlockAt, tz ?? undefined)}.</p>
          ) : (
            <>
              <h3 className="mini-q">{it.mini.q}</h3>
              {!it.mine ? (
                <MiniForm week={state.week} slot={it.slot} options={it.mini.options} guys={it.mini.kind === "who" ? others : undefined} />
              ) : (
                <Results it={it} />
              )}
            </>
          )}
        </div>
      ))}
    </section>
  );
}

function Results({ it }: { it: MiniState["items"][number] }) {
  const rows = it.results ?? [];
  const top = Math.max(1, ...rows.map((r) => r.votes));
  const mineIdx = it.mine?.choice;
  return (
    <div className="mini-results">
      <ul>
        {rows.map((r, i) => {
          const mine = it.mini.kind === "who" ? r.id === it.mine?.pick_user : i === mineIdx;
          return (
            <li key={r.id ?? r.label} className={mine ? "mine" : ""}>
              <span className="mini-label">{r.label}</span>
              <span className="mini-bar">
                <span style={{ width: `${Math.round((100 * r.votes) / top)}%` }} />
              </span>
              <span className="mini-n">{r.votes}</span>
            </li>
          );
        })}
      </ul>
      <p className="fine">
        {it.total} {it.total === 1 ? "answer" : "answers"} so far{it.mini.kind === "who" ? ". Votes are anonymous." : "."}
      </p>
    </div>
  );
}
