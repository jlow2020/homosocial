"use client";

import { useState, useTransition } from "react";
import { postPlan } from "../game-actions";

export default function PlanForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <button className="btn btn-gold" onClick={() => setOpen(true)}>
        Post a plan
      </button>
    );
  }
  return (
    <form
      className="plan-form"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        start(async () => {
          const r = await postPlan(form);
          if (r.ok) setOpen(false);
          else setError(r.error ?? "That didn't post.");
        });
      }}
    >
      <div className="field">
        <label className="label" htmlFor="plan-title">
          What&apos;s the plan?
        </label>
        <input id="plan-title" name="title" className="input" maxLength={80} placeholder="Trivia Thursday" required />
      </div>
      <div className="field-row">
        <div className="field">
          <label className="label" htmlFor="plan-when">
            When (Eastern time)
          </label>
          <input id="plan-when" name="when" type="datetime-local" className="input" />
        </div>
        <div className="field">
          <label className="label" htmlFor="plan-place">
            Where
          </label>
          <input id="plan-place" name="place" className="input" maxLength={120} placeholder="A public place, the first time" />
        </div>
      </div>
      <div className="field">
        <label className="label" htmlFor="plan-details">
          Details
        </label>
        <textarea id="plan-details" name="details" className="textarea" rows={3} maxLength={600} placeholder="Bring a chair. Wear something ugly." />
      </div>
      {error && <p className="error">{error}</p>}
      <div className="row">
        <button className="btn btn-pink" disabled={pending}>
          {pending ? "Posting..." : "Post it"}
        </button>
        <button type="button" className="link-button quiet" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
