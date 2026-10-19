"use client";

import { useState, useTransition } from "react";
import { createTestCircle, playIn } from "../test-actions";

export function CreateTestCircle() {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <div className="act">
      <h3>Test Circle</h3>
      <p className="admin-sub">
        A private Circle with 14 fake guys who answer drops, chat, post plans, give Roses and make picks. You move in and can
        jump to any week. Real members never see it.
      </p>
      <div>
        <button
          className="btn btn-gold btn-small"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await createTestCircle();
              if (r && !r.ok) setError(r.message);
            })
          }
        >
          {pending ? "Building it... (about 20 seconds)" : "Make a test Circle and play"}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

export function PlayHere({ circleId }: { circleId: string }) {
  return (
    <form action={playIn.bind(null, circleId)}>
      <button className="btn btn-gold btn-small">Play in this Circle</button>
    </form>
  );
}
