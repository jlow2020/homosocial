"use client";

import { useState, useTransition } from "react";
import { guessWho } from "../../game-actions";

export default function GuessWho({ dropId, answerId, current, guys }: { dropId: string; answerId: string; current: string; guys: { id: string; name: string }[] }) {
  const [value, setValue] = useState(current);
  const [pending, start] = useTransition();
  return (
    <label className="guess">
      <span>Who wrote this?</span>
      <select
        className="input"
        value={value}
        disabled={pending}
        onChange={(e) => {
          const v = e.target.value;
          setValue(v);
          start(async () => void (await guessWho(dropId, answerId, v)));
        }}
      >
        <option value="">Pick a guy</option>
        {guys.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>
    </label>
  );
}
