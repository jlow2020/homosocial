"use client";

import { useState, useTransition } from "react";
import { guessWho } from "../../game-actions";

type Card = { id: string; photo: string | null; body: string | null };
type Guy = { id: string; name: string; photo: string | null };

// Guess the Owner as a deck: one anonymous photo at a time, tap the face you think it belongs to.
export default function OwnerDeck({ dropId, cards, guys, initial }: { dropId: string; cards: Card[]; guys: Guy[]; initial: Record<string, string> }) {
  const [guess, setGuess] = useState<Record<string, string>>(initial);
  const firstOpen = cards.findIndex((c) => !initial[c.id]);
  const [i, setI] = useState(firstOpen === -1 ? 0 : firstOpen);
  const [pending, start] = useTransition();
  if (!cards.length) return <p className="fine">Nothing to guess yet.</p>;
  const card = cards[i];
  const done = cards.filter((c) => guess[c.id]).length;

  const pick = (guyId: string) => {
    const next = { ...guess, [card.id]: guyId };
    setGuess(next);
    start(async () => {
      await guessWho(dropId, card.id, guyId);
    });
    const nextOpen = cards.findIndex((c, j) => j > i && !next[c.id]);
    if (nextOpen !== -1) setTimeout(() => setI(nextOpen), 350);
    else if (i < cards.length - 1) setTimeout(() => setI(i + 1), 350);
  };

  return (
    <div className="deck">
      <div className="deck-top">
        <button className="link-button quiet" disabled={i === 0} onClick={() => setI(i - 1)}>
          ‹ Back
        </button>
        <span className="fine">
          {i + 1} of {cards.length} · {done} guessed
        </span>
        <button className="link-button quiet" disabled={i >= cards.length - 1} onClick={() => setI(i + 1)}>
          Next ›
        </button>
      </div>
      <div className="deck-card" key={card.id}>
        {card.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.photo} alt="" className="answer-photo" />
        ) : (
          <p className="deck-text">{card.body}</p>
        )}
      </div>
      <p className="eyebrow">Whose is it?</p>
      <ul className="faces">
        {guys.map((g) => (
          <li key={g.id}>
            <button className={guess[card.id] === g.id ? "face on" : "face"} disabled={pending} onClick={() => pick(g.id)} aria-pressed={guess[card.id] === g.id}>
              {g.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={g.photo} alt="" />
              ) : (
                <span className="avatar avatar-empty" />
              )}
              <span>{g.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
