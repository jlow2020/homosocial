"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteWallItem, toggleCommentLike, toggleLike } from "./actions";

export function LikeButton({ id, liked, count, comment = false }: { id: string; liked: boolean; count: number; comment?: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(liked);
  const [n, setN] = useState(count);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className={on ? "wall-like on" : "wall-like"}
      aria-pressed={on}
      disabled={pending}
      onClick={() => {
        setOn(!on);
        setN(n + (on ? -1 : 1));
        start(async () => {
          const r = comment ? await toggleCommentLike(id) : await toggleLike(id);
          if (!r.ok) {
            setOn(on);
            setN(n);
          }
          router.refresh();
        });
      }}
    >
      {on ? "❤️" : "🤍"} {n > 0 ? n : ""} <span className="visually-hidden">likes</span>
    </button>
  );
}

export function DeleteButton({ kind, id, after }: { kind: "post" | "comment"; id: string; after?: string }) {
  const router = useRouter();
  const [sure, setSure] = useState(false);
  const [pending, start] = useTransition();
  if (!sure) {
    return (
      <button type="button" className="link-button quiet wall-del" onClick={() => setSure(true)}>
        Delete
      </button>
    );
  }
  return (
    <span className="wall-del">
      <button
        type="button"
        className="link-button danger"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await deleteWallItem(kind, id);
            if (after) router.push(after);
            else router.refresh();
          })
        }
      >
        {pending ? "Deleting..." : "Yes, delete"}
      </button>{" "}
      <button type="button" className="link-button quiet" onClick={() => setSure(false)}>
        Keep
      </button>
    </span>
  );
}
