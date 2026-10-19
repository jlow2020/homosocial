"use client";

import { useState, useTransition } from "react";

// One-line message box used by the Lounge and DMs.
export default function Composer({
  send,
  placeholder,
  disabled,
}: {
  send: (body: string) => Promise<{ ok: boolean; error?: string }>;
  placeholder: string;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault();
        const body = text.trim();
        if (!body) return;
        start(async () => {
          const r = await send(body);
          if (r.ok) {
            setText("");
            setError("");
          } else setError(r.error ?? "That didn't send.");
        });
      }}
    >
      <label className="visually-hidden" htmlFor="composer">
        Message
      </label>
      <textarea
        id="composer"
        className="textarea"
        rows={1}
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }
        }}
        placeholder={placeholder}
        maxLength={2000}
      />
      <button className="btn btn-pink" disabled={pending || disabled || !text.trim()}>
        Send
      </button>
      {error && <p className="error composer-error">{error}</p>}
    </form>
  );
}
