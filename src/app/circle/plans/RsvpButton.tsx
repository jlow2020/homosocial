"use client";

import { useTransition } from "react";
import { toggleRsvp } from "../game-actions";

export default function RsvpButton({ planId, going }: { planId: string; going: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      className={going ? "btn btn-outline btn-small" : "btn btn-pink btn-small"}
      disabled={pending}
      onClick={() => start(async () => void (await toggleRsvp(planId)))}
    >
      {going ? "Can't make it" : "I'm in"}
    </button>
  );
}
