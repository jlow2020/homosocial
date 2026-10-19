"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAnswerHidden } from "../actions";

export default function AnswerToggle({ id, hidden }: { id: string; hidden: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      className="link-button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await setAnswerHidden(id, !hidden);
          router.refresh();
        })
      }
    >
      {hidden ? "Put it back" : "Pull it"}
    </button>
  );
}
