"use client";

import { useState, useTransition } from "react";
import { reportAnswer } from "../../game-actions";

const REASONS = [
  { value: "explicit", label: "Explicit for a public space" },
  { value: "harassment", label: "Harassment or hate" },
  { value: "underage", label: "Someone might be under 18" },
  { value: "fake", label: "Not his photo" },
  { value: "other", label: "Something else" },
];

export default function ReportAnswer({ answerId }: { answerId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  if (done) return <p className="fine">Reported. A mod will look.</p>;
  if (!open) {
    return (
      <button className="answer-report" onClick={() => setOpen(true)} aria-label="Report this answer">
        Report
      </button>
    );
  }
  return (
    <form
      className="member-menu"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await reportAnswer(answerId, reason, details);
          if (r.ok) setDone(true);
        });
      }}
    >
      <select className="input" value={reason} onChange={(e) => setReason(e.target.value)} required>
        <option value="">Why?</option>
        {REASONS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <input className="input" placeholder="Anything else (optional)" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={500} />
      <div className="row">
        <button className="btn btn-danger btn-small" disabled={pending || !reason}>
          {pending ? "Sending" : "Send report"}
        </button>
        <button type="button" className="link-button quiet" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
