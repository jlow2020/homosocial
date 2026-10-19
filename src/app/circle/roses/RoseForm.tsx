"use client";

import { useState, useTransition } from "react";
import { giveRose } from "../game-actions";

export default function RoseForm({ left, guys }: { left: number; guys: { id: string; name: string }[] }) {
  const [to, setTo] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="rose-form"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await giveRose(to, text);
          if (r.ok) {
            setTo("");
            setText("");
            setError("");
          } else setError(r.error ?? "That didn't send.");
        });
      }}
    >
      <p className="eyebrow">
        {left} {left === 1 ? "Rose" : "Roses"} left
      </p>
      <div className="field">
        <label className="label" htmlFor="rose-to">
          Who gets it?
        </label>
        <select id="rose-to" className="input" value={to} onChange={(e) => setTo(e.target.value)} required>
          <option value="" disabled>
            Pick a guy
          </option>
          {guys.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label className="label" htmlFor="rose-body">
          Say it
        </label>
        <textarea
          id="rose-body"
          className="textarea"
          rows={3}
          maxLength={280}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Be specific. What did he do that made this Season better?"
          required
        />
      </div>
      {error && <p className="error">{error}</p>}
      <button className="btn btn-gold" disabled={pending || !to || !text.trim()}>
        {pending ? "Sending..." : "Give the Rose"}
      </button>
    </form>
  );
}
