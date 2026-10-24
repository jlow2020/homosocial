"use client";

import { useRef, useState } from "react";

type Shot = { url: string; theme: string | null; veiled: boolean; kind?: "photo" | "video" };

// Swipe through his photos. Each themed photo shows its theme.
export default function Gallery({ shots, name, self }: { shots: Shot[]; name: string; self: boolean }) {
  const [i, setI] = useState(0);
  const [shown, setShown] = useState<Record<number, boolean>>({});
  const strip = useRef<HTMLDivElement>(null);
  const goTo = (n: number) => {
    const el = strip.current;
    if (!el) return;
    el.scrollTo({ left: n * el.clientWidth, behavior: "smooth" });
  };
  return (
    <div className="gallery">
      <div
        className="gallery-strip"
        ref={strip}
        onScroll={(e) => {
          const el = e.currentTarget;
          setI(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
        }}
      >
        {shots.map((s, n) => (
          <figure key={n} className="gallery-shot">
            {s.veiled && !self && !shown[n] ? (
              <button className="veil" onClick={() => setShown({ ...shown, [n]: true })}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.url} alt="" aria-hidden="true" />
                <span className="veil-label">
                  Spicy. Tap to see.
                  <small>Hidden until a person takes a look</small>
                </span>
              </button>
            ) : s.kind === "video" ? (
              <video src={s.url} playsInline muted loop autoPlay={n === i} controls preload="metadata" aria-label={s.theme ?? `${name}, video`} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.url} alt={n === 0 ? name : (s.theme ?? `${name}, photo ${n + 1}`)} />
            )}
            {s.theme && <figcaption>{s.theme}</figcaption>}
          </figure>
        ))}
      </div>
      {shots.length > 1 && (
        <div className="gallery-dots" role="tablist" aria-label="Photos">
          {shots.map((_, n) => (
            <button key={n} role="tab" aria-selected={n === i} aria-label={`Photo ${n + 1}`} className={n === i ? "on" : ""} onClick={() => goTo(n)} />
          ))}
        </div>
      )}
    </div>
  );
}
