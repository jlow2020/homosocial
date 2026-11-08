"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { EMOJI_GROUPS, firstEmoji } from "@/lib/emoji";

// Every emoji, for reactions. The grid covers the usual ones; the box at the
// top takes anything from the phone's own emoji keyboard.
export default function EmojiSheet({ onPick, onClose, title = "React" }: { onPick: (e: string) => void; onClose: () => void; title?: string }) {
  const [typed, setTyped] = useState("");
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  return createPortal(
    <div className="emoji-sheet-back" onClick={onClose}>
      <div className="emoji-sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="emoji-sheet-head">
          <input
            className="emoji-sheet-input"
            value={typed}
            placeholder="Type any emoji"
            aria-label="Type any emoji"
            inputMode="text"
            onChange={(e) => {
              const em = firstEmoji(e.target.value);
              if (em) onPick(em);
              else setTyped(e.target.value.slice(-8));
            }}
          />
          <button type="button" className="link-button quiet" onClick={onClose}>
            Done
          </button>
        </div>
        <div className="emoji-sheet-body">
          {EMOJI_GROUPS.map((g) => (
            <section key={g.name}>
              <p className="emoji-sheet-group">{g.name}</p>
              <div className="emoji-sheet-grid">
                {g.list.map((e) => (
                  <button key={e} type="button" className="emoji-btn" onClick={() => onPick(e)}>
                    {e}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
