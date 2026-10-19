"use client";

import { useState, useTransition } from "react";
import { daddyPick, reviewDrop } from "./actions";

const WEEKS = ["Arrivals", "Hot Takes", "Show and Tell", "Confessions", "Type", "Out", "Roses", "The Finale"];
const MODES: [string, string][] = [["text", "Named"], ["anon", "Anonymous"], ["guesswho", "Guess Who"], ["photo", "Photos"], ["dare", "Dare"]];

function Fields({ d }: { d?: { body: string; hint: string | null; week: number; heat: number; mode: string; pinned: boolean } }) {
  return (
    <>
      <label className="visually-hidden" htmlFor="body">
        Drop
      </label>
      <textarea name="body" className="textarea" rows={2} maxLength={300} defaultValue={d?.body ?? ""} placeholder="The drop, as the guys will read it." required />
      <input name="hint" className="input" maxLength={200} defaultValue={d?.hint ?? ""} placeholder="Hint under it (optional)" />
      <div className="row">
        <select name="week" className="input" defaultValue={d?.week ?? 4} style={{ width: "auto" }}>
          {WEEKS.map((w, i) => (
            <option key={w} value={i + 1}>
              Wk {i + 1}: {w}
            </option>
          ))}
        </select>
        <select name="heat" className="input" defaultValue={d?.heat ?? 4} style={{ width: "auto" }}>
          {[1, 2, 3, 4, 5].map((h) => (
            <option key={h} value={h}>
              Heat {h}
            </option>
          ))}
        </select>
        <select name="mode" className="input" defaultValue={d?.mode ?? "text"} style={{ width: "auto" }}>
          {MODES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <label className="fine" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" name="pinned" defaultChecked={d?.pinned ?? false} /> Pin: every Circle gets it next
        </label>
      </div>
    </>
  );
}

export function ReviewForm({ d }: { d: { id: string; body: string; hint: string | null; week: number; heat: number; mode: string; pinned: boolean; status: string } }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const send = (status: string) => (e: React.MouseEvent<HTMLButtonElement>) => {
    const f = new FormData(e.currentTarget.form!);
    f.set("status", status);
    start(async () => setMsg((await reviewDrop(d.id, f)).message));
  };
  return (
    <form className="review-form" onSubmit={(e) => e.preventDefault()}>
      <Fields d={d} />
      <div className="row">
        {d.status !== "approved" && (
          <button className="btn btn-gold btn-small" disabled={pending} onClick={send("approved")}>
            Approve
          </button>
        )}
        {d.status === "approved" && (
          <button className="btn btn-outline btn-small" disabled={pending} onClick={send("approved")}>
            Save changes
          </button>
        )}
        {d.status !== "retired" && (
          <button className="btn btn-danger btn-small" disabled={pending} onClick={send("retired")}>
            Retire
          </button>
        )}
        {d.status === "retired" && (
          <button className="btn btn-outline btn-small" disabled={pending} onClick={send("queued")}>
            Back to queue
          </button>
        )}
        {msg && <span className="fine">{msg}</span>}
      </div>
    </form>
  );
}

export function PickForm() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  return (
    <form
      className="review-form"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = new FormData(form);
        start(async () => {
          const r = await daddyPick(f);
          setMsg(r.message);
          if (r.ok) form.reset();
        });
      }}
    >
      <Fields />
      <label className="fine" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
        <input type="checkbox" name="credit" defaultChecked /> Credit it to Daddy
      </label>
      <div className="row">
        <button className="btn btn-pink btn-small" disabled={pending}>
          Add to the bank
        </button>
        {msg && <span className="fine">{msg}</span>}
      </div>
    </form>
  );
}
