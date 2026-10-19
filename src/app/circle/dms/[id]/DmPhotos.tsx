"use client";

import { useState, useTransition } from "react";
import { setDmPhotos, sendDmPhoto } from "../../game-actions";
import { reportMember } from "../../actions";
import { shrinkImage } from "@/lib/image";

export function PhotoSwitch({ threadId, mine, theirs, name }: { threadId: string; mine: boolean; theirs: boolean; name: string }) {
  const [pending, start] = useTransition();
  const both = mine && theirs;
  const line = both
    ? "Photos and videos are on for both of you. Explicit is OK here, only of yourself."
    : mine
      ? `You turned photos and videos on. Waiting on ${name}.`
      : theirs
        ? `${name} turned photos and videos on. Your call.`
        : "Photos and videos are off. You both have to turn them on.";
  return (
    <div className={both ? "photo-switch on" : "photo-switch"}>
      <span>📷 {line}</span>
      <button className="link-button" disabled={pending} onClick={() => start(async () => void (await setDmPhotos(threadId, !mine)))}>
        {mine ? "Turn mine off" : "Turn them on"}
      </button>
    </div>
  );
}

export function PhotoSend({ threadId }: { threadId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <label className={pending ? "photo-send busy" : "photo-send"}>
      {pending ? "Sending..." : "📷 Send a photo"}
      <input
        type="file"
        accept="image/*"
        className="visually-hidden"
        disabled={pending}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          start(async () => {
            setError("");
            const small = await shrinkImage(f, 1600, 0.85);
            const form = new FormData();
            form.set("thread", threadId);
            form.set("photo", small);
            const r = await sendDmPhoto(form);
            if (!r.ok) setError(r.error ?? "That didn't send.");
          });
        }}
      />
      {error && <span className="error">{error}</span>}
    </label>
  );
}

// Every DM photo starts blurred. Tap to see it.
export function DmPhoto({ src, fromThem, otherId, messageId }: { src: string; fromThem: boolean; otherId: string; messageId: string }) {
  const [shown, setShown] = useState(!fromThem);
  const [reported, setReported] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="dm-photo">
      <button className={shown ? "dm-photo-btn" : "dm-photo-btn blurred-photo"} onClick={() => setShown(true)} aria-label={shown ? "Photo" : "Tap to see photo"}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" />
        {!shown && <span className="dm-photo-tap">Tap to see</span>}
      </button>
      {fromThem && !reported && (
        <button
          className="link-button quiet dm-photo-report"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await reportMember(otherId, "other", `Unwanted DM photo (${messageId})`);
              if (r.ok) setReported(true);
            })
          }
        >
          Report this photo
        </button>
      )}
      {reported && <span className="fine">Reported, and he&apos;s blocked. Thanks for telling us.</span>}
    </div>
  );
}
