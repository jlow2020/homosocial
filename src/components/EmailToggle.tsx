"use client";

import { useState, useTransition } from "react";
import { setNotifyEmail } from "@/app/push-actions";

export default function EmailToggle({ on: initial }: { on: boolean }) {
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <div className="push-row">
      <span>
        <b>Email backup</b>
        <span className="fine"> · {on ? "On" : "Off"}</span>
      </span>
      <button
        className="link-button quiet"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await setNotifyEmail(!on);
            setOn(!on);
          })
        }
      >
        Turn {on ? "off" : "on"}
      </button>
    </div>
  );
}
