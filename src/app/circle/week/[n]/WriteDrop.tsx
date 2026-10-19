"use client";

import { useState, useTransition } from "react";
import { submitDrop } from "../../game-actions";

const WEEKS = ["Arrivals", "Hot Takes", "Show and Tell", "Confessions", "Type", "Out", "Roses", "The Finale"];

export default function WriteDrop({ left }: { left: number }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  if (done) return <p className="notice-inline">{done}</p>;
  if (!open) {
    return (
      <button className="write-drop-open" onClick={() => setOpen(true)} disabled={left === 0}>
        ✍️ Write a drop for a future Season {left === 0 ? "(you've sent 3, thank you)" : ""}
      </button>
    );
  }
  return (
    <form
      className="write-drop"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        start(async () => {
          const r = await submitDrop(f);
          if (r.ok) setDone("Sent to Daddy. If it runs, it runs with your name on it.");
          else setError(r.error ?? "That didn't send.");
        });
      }}
    >
      <p className="eyebrow">Write the drop</p>
      <p className="fine">Make it filthy. Make it specific.</p>
      <label className="visually-hidden" htmlFor="wd-body">
        Your drop
      </label>
      <textarea id="wd-body" name="body" className="textarea" rows={3} maxLength={300} placeholder="The question you wish somebody would ask." required />
      <div className="field-row">
        <label className="field">
          <span className="label">Fits best in</span>
          <select name="week" className="input" defaultValue="4">
            {WEEKS.map((w, i) => (
              <option key={w} value={i + 1}>
                Week {i + 1}: {w}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="label">How filthy, 1 to 5</span>
          <select name="heat" className="input" defaultValue="4">
            {[1, 2, 3, 4, 5].map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="label">Answers are</span>
          <select name="mode" className="input" defaultValue="text">
            <option value="text">Named</option>
            <option value="anon">Anonymous</option>
            <option value="guesswho">Guess Who</option>
            <option value="photo">Photos</option>
            <option value="dare">A dare</option>
          </select>
        </label>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="row">
        <button className="btn btn-gold btn-small" disabled={pending}>
          {pending ? "Sending..." : "Send it to Daddy"}
        </button>
        <button type="button" className="link-button quiet" onClick={() => setOpen(false)}>
          Never mind
        </button>
      </div>
    </form>
  );
}
