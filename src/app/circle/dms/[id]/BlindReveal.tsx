"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { blindKeep } from "../../game-actions";

type Face = { name: string; photo: string | null; age: number };

export default function BlindReveal({ threadId, me, him, iKept, heKept }: { threadId: string; me: Face; him: Face; iKept: boolean; heKept: boolean }) {
  const [guess, setGuess] = useState<"yes" | "no" | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const face = (f: Face) => (
    <figure className="reveal-face">
      {f.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={f.photo} alt="" />
      ) : (
        <span className="avatar avatar-empty" />
      )}
      <figcaption>
        {f.name}, {f.age}
      </figcaption>
    </figure>
  );
  return (
    <div className="reveal">
      <p className="eyebrow">💘 The reveal</p>
      <div className="reveal-faces">
        {face(me)}
        <span className="reveal-plus">+</span>
        {face(him)}
      </div>
      <h2>Your blind date was {him.name}.</h2>
      {guess === null && !iKept && (
        <div className="row">
          <span className="fine">Did you guess it was him?</span>
          <button className="link-button" onClick={() => setGuess("yes")}>
            Called it
          </button>
          <button className="link-button" onClick={() => setGuess("no")}>
            No idea
          </button>
        </div>
      )}
      {guess === "yes" && <p className="fine">Of course you did.</p>}
      {guess === "no" && <p className="fine">That&apos;s the point.</p>}
      {iKept ? (
        <p className="fine">{heKept ? "You both said keep talking. The chat is open, faces on." : `You said keep talking. Waiting on ${him.name}. If he says yes, the chat opens with faces on. If not, you won't be told.`}</p>
      ) : (
        <>
          <p>
            Keep talking? You both have to say yes. If either of you says no, the chat closes and nobody is told who said what.
          </p>
          <div className="row">
            <button
              className="btn btn-pink"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await blindKeep(threadId, true);
                  router.refresh();
                })
              }
            >
              Keep talking
            </button>
            <button
              className="link-button quiet"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await blindKeep(threadId, false);
                  router.push("/circle/dms");
                })
              }
            >
              That&apos;s all for me
            </button>
          </div>
        </>
      )}
    </div>
  );
}
