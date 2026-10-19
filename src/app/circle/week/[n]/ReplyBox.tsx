"use client";

import { useState, useTransition } from "react";
import { replyToAnswer } from "../../game-actions";

export default function ReplyBox({ answerId }: { answerId: string }) {
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <form
      className="reply-box"
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        start(async () => {
          const r = await replyToAnswer(answerId, text);
          if (r.ok) setText("");
          else setError(r.error ?? "That didn't send.");
        });
      }}
    >
      <label className="visually-hidden" htmlFor={`reply-${answerId}`}>
        Reply
      </label>
      <input
        id={`reply-${answerId}`}
        className="input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Reply"
        maxLength={500}
      />
      <button className="btn btn-outline btn-small" disabled={pending || !text.trim()}>
        Send
      </button>
      {error && <span className="error">{error}</span>}
    </form>
  );
}
