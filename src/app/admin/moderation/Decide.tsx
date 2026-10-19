"use client";

import { useState, useTransition } from "react";
import { decide } from "./actions";

export default function Decide({ id, verdict }: { id: string; verdict: string }) {
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  if (msg) return <p className="admin-sub">{msg}</p>;
  const go = (d: "approve" | "dismiss" | "remove" | "strike") => start(async () => setMsg((await decide(id, d)).message));
  return (
    <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
      {verdict === "flagged" ? (
        <button className="btn btn-small" disabled={pending} onClick={() => go("dismiss")}>
          It&apos;s fine
        </button>
      ) : (
        <button className="btn btn-small" disabled={pending} onClick={() => go("approve")}>
          Approve, post it
        </button>
      )}
      <button className="btn btn-small btn-outline" disabled={pending} onClick={() => go("remove")}>
        Remove
      </button>
      <button className="btn btn-small btn-danger" disabled={pending} onClick={() => go("strike")}>
        Remove + strike
      </button>
    </div>
  );
}
