"use client";

import { useState, useTransition } from "react";
import { savePicks } from "../game-actions";

type Guy = { id: string; name: string; photo: string | null };

export default function PicksForm({
  dating,
  guys,
  initial,
}: {
  dating: boolean;
  guys: Guy[];
  initial: { friend: string[]; date: string[]; setups: string[][]; stay: "stay" | "mix" | null };
}) {
  const [friend, setFriend] = useState<string[]>(initial.friend);
  const [date, setDate] = useState<string[]>(initial.date);
  const [setups, setSetups] = useState<string[][]>(() => {
    const s = initial.setups.map((x) => [...x]);
    while (s.length < 2) s.push(["", ""]);
    return s;
  });
  const [stay, setStay] = useState<"stay" | "mix" | null>(initial.stay);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const toggle = (list: string[], set: (v: string[]) => void, id: string, max: number) => {
    if (list.includes(id)) set(list.filter((x) => x !== id));
    else if (list.length < max) set([...list, id]);
  };

  return (
    <form
      className="picks"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData();
        friend.forEach((id) => f.append("friend", id));
        date.forEach((id) => f.append("date", id));
        setups.forEach(([a, b], i) => {
          if (a) f.set(`setup${i}a`, a);
          if (b) f.set(`setup${i}b`, b);
        });
        if (stay) f.set("stay", stay);
        start(async () => {
          const r = await savePicks(f);
          setMsg(r.ok ? { ok: true, text: "Saved. You can change them until the Finale." } : { ok: false, text: r.error ?? "That didn't save." });
        });
      }}
    >
      <section className="pick-section">
        <h2 className="pick-h">
          Friends <span className="pick-count">{friend.length} / 5</span>
        </h2>
        <p className="fine">Who do you want to keep?</p>
        <ul className="pick-grid">
          {guys.map((g) => {
            const on = friend.includes(g.id);
            return (
              <li key={g.id}>
                <button
                  type="button"
                  className={on ? "pick on" : "pick"}
                  aria-pressed={on}
                  onClick={() => toggle(friend, setFriend, g.id, 5)}
                  disabled={!on && friend.length >= 5}
                >
                  {g.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={g.photo} alt="" />
                  ) : (
                    <span className="pick-ph" />
                  )}
                  <span>{g.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {dating && (
        <section className="pick-section pick-date">
          <h2 className="pick-h">
            Dates <span className="pick-count">{date.length} / 3</span>
          </h2>
          <p className="fine">Only shows up as a match if he picked you for a date too. Nobody else ever sees this.</p>
          <ul className="pick-grid">
            {guys.map((g) => {
              const on = date.includes(g.id);
              return (
                <li key={g.id}>
                  <button
                    type="button"
                    className={on ? "pick on" : "pick"}
                    aria-pressed={on}
                    onClick={() => toggle(date, setDate, g.id, 3)}
                    disabled={!on && date.length >= 3}
                  >
                    {g.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={g.photo} alt="" />
                    ) : (
                      <span className="pick-ph" />
                    )}
                    <span>{g.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="pick-section">
        <h2 className="pick-h">Setups</h2>
        <p className="fine">Who in here should get together, as friends or more? Up to 2. Revealed only to the two of them, and only if 2 or more guys say the same pair.</p>
        {setups.map(([a, b], i) => (
          <div key={i} className="setup-row">
            <label className="visually-hidden" htmlFor={`s${i}a`}>
              First guy
            </label>
            <select id={`s${i}a`} className="input" value={a} onChange={(e) => setSetups(setups.map((s, j) => (j === i ? [e.target.value, s[1]] : s)))}>
              <option value="">Pick a guy</option>
              {guys.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <span aria-hidden="true">+</span>
            <label className="visually-hidden" htmlFor={`s${i}b`}>
              Second guy
            </label>
            <select id={`s${i}b`} className="input" value={b} onChange={(e) => setSetups(setups.map((s, j) => (j === i ? [s[0], e.target.value] : s)))}>
              <option value="">Pick a guy</option>
              {guys.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </section>

      <section className="pick-section">
        <h2 className="pick-h">Next Season</h2>
        <div className="stay-opts">
          <button type="button" className={stay === "stay" ? "stay-opt on" : "stay-opt"} onClick={() => setStay("stay")} aria-pressed={stay === "stay"}>
            <b>Stay</b>
            <span>Run it back with this Circle.</span>
          </button>
          <button type="button" className={stay === "mix" ? "stay-opt on" : "stay-opt"} onClick={() => setStay("mix")} aria-pressed={stay === "mix"}>
            <b>Mix me in</b>
            <span>New Circle, new guys. Your mutuals stay yours.</span>
          </button>
        </div>
      </section>

      {msg && <p className={msg.ok ? "notice-inline" : "error"}>{msg.text}</p>}
      <button className="btn btn-pink btn-big" disabled={pending || !stay}>
        {pending ? "Saving..." : "Lock in my picks"}
      </button>
    </form>
  );
}
