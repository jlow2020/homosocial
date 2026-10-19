"use client";

import { useState } from "react";

// A photo or video the filter wasn't sure about: posted, but behind a tap
// until a person has looked. No judgment on the guy who posted it.
export default function Veil({ src, kind }: { src: string; kind: "photo" | "video" }) {
  const [shown, setShown] = useState(false);
  if (shown) {
    return kind === "video" ? (
      <video src={src} controls playsInline preload="metadata" className="answer-photo" />
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" className="answer-photo" />
    );
  }
  return (
    <button className="veil" onClick={() => setShown(true)}>
      {kind === "video" ? (
        <video src={`${src}#t=0.1`} muted playsInline preload="metadata" aria-hidden="true" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" aria-hidden="true" />
      )}
      <span className="veil-label">
        Spicy. Tap to see.
        <small>Hidden until a person takes a look</small>
      </span>
    </button>
  );
}
