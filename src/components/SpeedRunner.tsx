"use client";

import { useEffect, useRef, useState } from "react";

// The Speed Round clock: 3-2-1, then one question at a time until time's up.
export default function SpeedRunner({ questions, seconds, onFinish, busy }: { questions: string[]; seconds: number; onFinish: (answers: string[]) => void; busy?: boolean }) {
  const [count, setCount] = useState<number | null>(3);
  const [left, setLeft] = useState(seconds);
  const [i, setI] = useState(0);
  const [a, setA] = useState<string[]>(questions.map(() => ""));
  const [text, setText] = useState("");
  const done = useRef(false);
  const box = useRef<HTMLInputElement>(null);
  const started = count === null;

  useEffect(() => {
    if (count === null) return;
    if (count <= 0) {
      setCount(null);
      return;
    }
    const t = setTimeout(() => setCount(count - 1), 1000);
    return () => clearTimeout(t);
  }, [count]);

  useEffect(() => {
    if (!started) return;
    const t = setInterval(() => setLeft((x) => x - 1), 1000);
    return () => clearInterval(t);
  }, [started]);

  const finish = (answers: string[]) => {
    if (done.current) return;
    done.current = true;
    onFinish(answers);
  };

  useEffect(() => {
    if (started && left <= 0) finish(a.map((x, j) => (j === i ? text : x)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  useEffect(() => {
    if (started) box.current?.focus();
  }, [started, i]);

  const next = () => {
    const updated = a.map((x, j) => (j === i ? text : x));
    setA(updated);
    setText("");
    if (i + 1 >= questions.length) finish(updated);
    else setI(i + 1);
  };

  if (!started) return <p className="speed-count" aria-live="assertive">{count === 0 ? "Go" : count}</p>;
  return (
    <div className="speed">
      <div className="speed-top">
        <span className="speed-n">
          {i + 1} / {questions.length}
        </span>
        <span className={left <= 10 ? "speed-clock hot" : "speed-clock"}>{Math.max(0, left)}s</span>
      </div>
      <p className="speed-q">{questions[i]}</p>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          next();
        }}
      >
        <input ref={box} className="input" maxLength={80} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type it. Hit enter." disabled={busy || left <= 0} aria-label={questions[i]} />
        <button className="btn btn-pink btn-small" disabled={busy || left <= 0}>
          Next
        </button>
      </form>
    </div>
  );
}
