"use client";

import { useState, useTransition } from "react";
import { blockMember, reportMember } from "./actions";

const reasons = [
  { value: "fake", label: "Fake profile or not who he says he is" },
  { value: "harassment", label: "Harassment or hate" },
  { value: "underage", label: "Might be under 18" },
  { value: "scam", label: "Scam, spam, or selling something" },
  { value: "other", label: "Something else" },
];

export default function MemberActions({ id, name }: { id: string; name: string }) {
  const [mode, setMode] = useState<"closed" | "menu" | "report" | "confirm-block">("closed");
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (mode === "closed") {
    return (
      <button className="member-more" onClick={() => setMode("menu")} aria-label={`Options for ${name}`}>
        Options
      </button>
    );
  }

  if (mode === "menu") {
    return (
      <div className="member-menu">
        <button className="link-button" onClick={() => setMode("confirm-block")}>Block {name}</button>
        <button className="link-button" onClick={() => setMode("report")}>Report {name}</button>
        <button className="link-button quiet" onClick={() => setMode("closed")}>Cancel</button>
      </div>
    );
  }

  if (mode === "confirm-block") {
    return (
      <div className="member-menu">
        <p>
          Block {name}? You won&apos;t see each other in the Circle, and he
          won&apos;t be told.
        </p>
        <div className="row">
          <button
            className="btn btn-danger btn-small"
            disabled={pending}
            onClick={() => start(async () => { await blockMember(id); })}
          >
            {pending ? "Blocking" : `Block ${name}`}
          </button>
          <button className="link-button quiet" onClick={() => setMode("closed")}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="member-menu">
      <fieldset className="choices">
        <legend className="label">Why are you reporting {name}?</legend>
        {reasons.map((r) => (
          <label key={r.value} className="choice choice-small">
            <input type="radio" name={`reason-${id}`} value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} />
            <span>{r.label}</span>
          </label>
        ))}
      </fieldset>
      <label className="field">
        <span className="hint">Optional.</span>
        <textarea className="textarea" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} />
      </label>
      <p className="hint">
        Reporting also blocks him. He won&apos;t know who reported him.
      </p>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="row">
        <button
          className="btn btn-danger btn-small"
          disabled={pending || !reason}
          onClick={() =>
            start(async () => {
              const r = await reportMember(id, reason, details);
              if (!r.ok) setError(r.error ?? "Your report didn't send. Try again.");
            })
          }
        >
          {pending ? "Sending report" : "Send report"}
        </button>
        <button className="link-button quiet" onClick={() => setMode("closed")}>Cancel</button>
      </div>
    </div>
  );
}
