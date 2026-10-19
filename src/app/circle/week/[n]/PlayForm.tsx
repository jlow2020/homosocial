"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { answerClipTicket, answerDrop } from "../../game-actions";
import type { PlaySpec } from "@/lib/game/plays";

type Props = { week: number; spec: PlaySpec };

function useSubmit(week: number) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const submit = (data: unknown, extra?: Record<string, string>) =>
    start(async () => {
      setError("");
      const form = new FormData();
      form.set("week", String(week));
      if (data !== null) form.set("data", JSON.stringify(data));
      for (const [k, v] of Object.entries(extra ?? {})) form.set(k, v);
      const r = await answerDrop(form);
      if (!r.ok) setError(r.error ?? "That didn't work.");
      else router.refresh();
    });
  return { pending, error, submit };
}

export default function PlayForm({ week, spec }: Props) {
  switch (spec.kind) {
    case "survey":
      return <Survey week={week} spec={spec} />;
    case "thisorthat":
      return <ThisOrThat week={week} spec={spec} />;
    case "madlibs":
      return <MadLibs week={week} spec={spec} />;
    case "speed":
      return <Speed week={week} spec={spec} />;
    case "twotruths":
      return <TwoTruths week={week} />;
    case "video":
      return <Video week={week} seconds={spec.seconds} />;
  }
}

function Survey({ week, spec }: { week: number; spec: Extract<PlaySpec, { kind: "survey" }> }) {
  const [a, setA] = useState<(boolean | null)[]>(spec.questions.map(() => null));
  const { pending, error, submit } = useSubmit(week);
  const done = a.every((x) => x !== null);
  return (
    <div className="play">
      <ol className="survey">
        {spec.questions.map((q, i) => (
          <li key={i} className="survey-q">
            <span>{q}</span>
            <span className="yn">
              <button type="button" className={a[i] === true ? "yn-btn on" : "yn-btn"} onClick={() => setA(a.map((x, j) => (j === i ? true : x)))}>
                Yes
              </button>
              <button type="button" className={a[i] === false ? "yn-btn on no" : "yn-btn"} onClick={() => setA(a.map((x, j) => (j === i ? false : x)))}>
                No
              </button>
            </span>
          </li>
        ))}
      </ol>
      {error && <p className="error">{error}</p>}
      <button className="btn btn-pink" disabled={pending || !done} onClick={() => submit({ answers: a })}>
        {pending ? "Posting..." : done ? "Post my card" : `${a.filter((x) => x !== null).length} of ${a.length}`}
      </button>
    </div>
  );
}

function ThisOrThat({ week, spec }: { week: number; spec: Extract<PlaySpec, { kind: "thisorthat" }> }) {
  const [p, setP] = useState<(0 | 1 | null)[]>(spec.pairs.map(() => null));
  const { pending, error, submit } = useSubmit(week);
  const done = p.every((x) => x !== null);
  return (
    <div className="play">
      <ul className="tot">
        {spec.pairs.map(([a, b], i) => (
          <li key={i} className="tot-pair">
            <button type="button" className={p[i] === 0 ? "tot-btn on" : "tot-btn"} onClick={() => setP(p.map((x, j) => (j === i ? 0 : x)))}>
              {a}
            </button>
            <span className="tot-or">or</span>
            <button type="button" className={p[i] === 1 ? "tot-btn on" : "tot-btn"} onClick={() => setP(p.map((x, j) => (j === i ? 1 : x)))}>
              {b}
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="error">{error}</p>}
      <button className="btn btn-pink" disabled={pending || !done} onClick={() => submit({ picks: p })}>
        {pending ? "Posting..." : done ? "Lock it in" : `${p.filter((x) => x !== null).length} of ${p.length}`}
      </button>
    </div>
  );
}

function MadLibs({ week, spec }: { week: number; spec: Extract<PlaySpec, { kind: "madlibs" }> }) {
  const [w, setW] = useState<string[]>(spec.slots.map(() => ""));
  const { pending, error, submit } = useSubmit(week);
  const done = w.every((x) => x.trim());
  return (
    <div className="play">
      <p className="fine">Don&apos;t read ahead. The story comes after.</p>
      <ol className="madlibs">
        {spec.slots.map((s, i) => (
          <li key={i}>
            <label className="label" htmlFor={`ml-${i}`}>
              {s}
            </label>
            <input id={`ml-${i}`} className="input" maxLength={40} value={w[i]} onChange={(e) => setW(w.map((x, j) => (j === i ? e.target.value : x)))} />
          </li>
        ))}
      </ol>
      {error && <p className="error">{error}</p>}
      <button className="btn btn-pink" disabled={pending || !done} onClick={() => submit({ words: w.map((x) => x.trim()) })}>
        {pending ? "Writing..." : "Write my story"}
      </button>
    </div>
  );
}

function Speed({ week, spec }: { week: number; spec: Extract<PlaySpec, { kind: "speed" }> }) {
  const [started, setStarted] = useState(false);
  const [left, setLeft] = useState(spec.seconds);
  const [i, setI] = useState(0);
  const [a, setA] = useState<string[]>(spec.questions.map(() => ""));
  const [text, setText] = useState("");
  const { pending, error, submit } = useSubmit(week);
  const box = useRef<HTMLInputElement>(null);
  const finished = useRef(false);

  useEffect(() => {
    if (!started) return;
    const t = setInterval(() => setLeft((x) => x - 1), 1000);
    return () => clearInterval(t);
  }, [started]);

  const finish = (answers: string[]) => {
    if (finished.current) return;
    finished.current = true;
    submit({ answers });
  };

  useEffect(() => {
    if (started && left <= 0) finish(a.map((x, j) => (j === i ? text : x)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  const next = () => {
    const updated = a.map((x, j) => (j === i ? text : x));
    setA(updated);
    setText("");
    if (i + 1 >= spec.questions.length) finish(updated);
    else {
      setI(i + 1);
      box.current?.focus();
    }
  };

  if (!started) {
    return (
      <div className="play">
        <p className="fine">
          {spec.questions.length} questions, {spec.seconds} seconds. Whatever you type is what the Circle sees. No edits, no takebacks.
        </p>
        <button className="btn btn-pink" onClick={() => setStarted(true)}>
          Start the clock
        </button>
      </div>
    );
  }
  return (
    <div className="play speed">
      <div className="speed-top">
        <span className="speed-n">
          {i + 1} / {spec.questions.length}
        </span>
        <span className={left <= 10 ? "speed-clock hot" : "speed-clock"}>{Math.max(0, left)}s</span>
      </div>
      <p className="speed-q">{spec.questions[i]}</p>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          next();
        }}
      >
        <input ref={box} className="input" autoFocus maxLength={80} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type it. Hit enter." disabled={pending || left <= 0} />
        <button className="btn btn-pink btn-small" disabled={pending || left <= 0}>
          Next
        </button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

function TwoTruths({ week }: { week: number }) {
  const [s, setS] = useState(["", "", ""]);
  const [lie, setLie] = useState<number | null>(null);
  const { pending, error, submit } = useSubmit(week);
  return (
    <div className="play">
      <ol className="twotruths">
        {s.map((x, i) => (
          <li key={i} className={lie === i ? "tt-row lie" : "tt-row"}>
            <input className="input" maxLength={160} value={x} placeholder={`Statement ${i + 1}`} onChange={(e) => setS(s.map((y, j) => (j === i ? e.target.value : y)))} />
            <button type="button" className={lie === i ? "yn-btn on no" : "yn-btn"} onClick={() => setLie(i)}>
              {lie === i ? "The lie" : "This is the lie"}
            </button>
          </li>
        ))}
      </ol>
      <p className="fine">Only you see which one&apos;s the lie, until the week ends.</p>
      {error && <p className="error">{error}</p>}
      <button className="btn btn-pink" disabled={pending || lie === null || !s.every((x) => x.trim())} onClick={() => submit({ statements: s.map((x) => x.trim()), lie })}>
        {pending ? "Posting..." : "Post them"}
      </button>
    </div>
  );
}

function Video({ week, seconds }: { week: number; seconds: number }) {
  const [busy, setBusy] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [path, setPath] = useState("");
  const { pending, error, submit } = useSubmit(week);
  const [localError, setLocalError] = useState("");

  const pick = async (f: File) => {
    setLocalError("");
    const len = await videoLength(f);
    if (len > seconds + 1) {
      setLocalError(`Clips can be up to ${seconds} seconds. That one's ${Math.round(len)}. Trim it in Photos first.`);
      return;
    }
    const type = f.type === "video/quicktime" || f.type === "video/webm" ? f.type : "video/mp4";
    setBusy("Uploading...");
    try {
      const t = await answerClipTicket(week, type, f.size);
      if (!t.ok || !t.signedUrl || !t.path) {
        setLocalError(t.error ?? "That didn't upload.");
        return;
      }
      const up = await fetch(t.signedUrl, { method: "PUT", headers: { "content-type": type, "x-upsert": "false", ...(t.apikey ? { apikey: t.apikey } : {}) }, body: f });
      if (!up.ok) {
        setLocalError("The video didn't upload. Try a shorter clip.");
        return;
      }
      setPath(t.path);
      setPreview(URL.createObjectURL(f));
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="play">
      {preview ? (
        <video src={preview} controls playsInline className="answer-photo" />
      ) : (
        <label className="photo-pick">
          <span>{busy || `Tap to record or pick a clip, up to ${seconds} seconds`}</span>
          <input
            type="file"
            accept="video/*"
            capture="user"
            className="visually-hidden"
            disabled={!!busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void pick(f);
            }}
          />
        </label>
      )}
      {(localError || error) && <p className="error">{localError || error}</p>}
      {path && (
        <div className="row">
          <button className="btn btn-pink" disabled={pending} onClick={() => submit(null, { video_path: path })}>
            {pending ? "Posting..." : "Post it"}
          </button>
          <button className="link-button quiet" onClick={() => (setPath(""), setPreview(null))}>
            Pick a different one
          </button>
        </div>
      )}
    </div>
  );
}

function videoLength(f: File): Promise<number> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(v.src);
      resolve(Number.isFinite(v.duration) ? v.duration : 0);
    };
    v.onerror = () => resolve(0);
    v.src = URL.createObjectURL(f);
  });
}
