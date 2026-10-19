"use client";

import { useTransition } from "react";

export default function AcceptButton({ threadId, accept }: { threadId: string; accept: (id: string) => Promise<{ ok: boolean }> }) {
  const [pending, start] = useTransition();
  return (
    <button className="btn btn-pink" disabled={pending} onClick={() => start(async () => void (await accept(threadId)))}>
      Say yes
    </button>
  );
}
