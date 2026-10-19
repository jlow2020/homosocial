"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { answerClipTicket, answerDrop, blindDateIn, takeHotSeat } from "../../game-actions";
import Link from "next/link";
import type { PlaySpec } from "@/lib/game/plays";

type Props = { week: number; spec: PlaySpec; guys?: { id: string; name: string; photo: string | null }[]; meId?: string; myRow?: Record<string, unknown> | null; ending?: boolean };

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

export default function PlayForm({ week, spec, guys = [], meId = "", myRow = null, ending = false }: Props) {
  switch (spec.kind) {
    case "rank":
      return <Rank week={week} spec={spec} guys={guys} meId={meId} />;
    case "chain":
      return ending ? (
        <OneLine week={week} field="line" max={spec.maxLen} placeholder="You're writing the ending. Land it." button="End the story" />
      ) : (
        <OneLine week={week} field="line" max={spec.maxLen} placeholder="Add the next line, and stop mid-sentence so the next guy has somewhere to go" button="Add my line" />
      );
    case "hotseat":
      return spec.seat ? (
        <OneLine week={week} field="question" max={200} placeholder={`Ask ${spec.seatName} anything.`} button="Ask it" />
      ) : (
        <HotSeat week={week} />
      );
    case "caption":
      return <OneLine week={week} field="caption" max={140} placeholder="Caption it." button="Post my caption" />;
    case "voice":
      return <Voice week={week} seconds={spec.seconds} />;
    case "owner":
      return null; // Photos go through the regular photo form.
    case "blinddate":
      return <BlindDate week={week} myRow={myRow} />;
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
  const [count, setCount] = useState<number | null>(null);
  const [left, setLeft] = useState(spec.seconds);
  const [i, setI] = useState(0);
  const [a, setA] = useState<string[]>(spec.questions.map(() => ""));
  const [text, setText] = useState("");
  const { pending, error, submit } = useSubmit(week);
  const box = useRef<HTMLInputElement>(null);
  const finished = useRef(false);

  useEffect(() => {
    if (count === null) return;
    if (count <= 0) {
      setCount(null);
      setStarted(true);
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

  if (count !== null) {
    return (
      <div className="play speed">
        <p className="speed-count" aria-live="assertive">{count === 0 ? "Go" : count}</p>
      </div>
    );
  }
  if (!started) {
    return (
      <div className="play">
        <p className="fine">
          {spec.questions.length} questions, {spec.seconds} seconds. Whatever you type is what the Circle sees. No edits, no takebacks. Put your phone on Do Not Disturb first.
        </p>
        <button className="btn btn-pink" onClick={() => setCount(3)}>
          Ready?
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

function OneLine({ week, field, max, placeholder, button }: { week: number; field: string; max: number; placeholder: string; button: string }) {
  const [t, setT] = useState("");
  const { pending, error, submit } = useSubmit(week);
  return (
    <div className="play">
      <label className="visually-hidden" htmlFor="oneline">
        {placeholder}
      </label>
      <textarea id="oneline" className="textarea" rows={2} maxLength={max} value={t} onChange={(e) => setT(e.target.value)} placeholder={placeholder} />
      <span className="fine">
        {t.length} / {max}
      </span>
      {error && <p className="error">{error}</p>}
      <button className="btn btn-pink" disabled={pending || !t.trim()} onClick={() => submit({ [field]: t.trim() })}>
        {pending ? "Posting..." : button}
      </button>
    </div>
  );
}

function Rank({ week, spec, guys, meId }: { week: number; spec: Extract<PlaySpec, { kind: "rank" }>; guys: { id: string; name: string; photo: string | null }[]; meId: string }) {
  const pool = spec.guys.filter((g) => g !== meId).map((id) => guys.find((g) => g.id === id)).filter(Boolean) as typeof guys;
  const [order, setOrder] = useState<string[]>([]);
  const { pending, error, submit } = useSubmit(week);
  const left = pool.filter((g) => !order.includes(g.id));
  return (
    <div className="play">
      <p className="fine">Tap them in order, best first. {spec.category}.</p>
      <ol className="rank-list">
        {order.map((id, i) => {
          const g = pool.find((x) => x.id === id)!;
          return (
            <li key={id} className="rank-row on">
              <span className="tt-num">{i + 1}</span>
              {g.photo ? <img src={g.photo} alt="" className="avatar" style={{ width: 36, height: 36 }} /> : <span className="avatar avatar-empty" style={{ width: 36, height: 36 }} />}
              <span>{g.name}</span>
              <button type="button" className="link-button quiet" onClick={() => setOrder(order.filter((x) => x !== id))}>
                undo
              </button>
            </li>
          );
        })}
      </ol>
      <ul className="rank-pool">
        {left.map((g) => (
          <li key={g.id}>
            <button type="button" className="pick" onClick={() => setOrder([...order, g.id])}>
              {g.photo ? <img src={g.photo} alt="" /> : <span className="pick-ph" />}
              <span>{g.name}</span>
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="error">{error}</p>}
      <button className="btn btn-pink" disabled={pending || left.length > 0} onClick={() => submit({ order })}>
        {pending ? "Posting..." : left.length ? `${left.length} to go` : "Lock in my ranking"}
      </button>
    </div>
  );
}

function HotSeat({ week }: { week: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <div className="play">
      <p className="fine">Nobody&apos;s in the seat yet. First to tap takes it. Everyone asks you one question, you answer the ones you want in the replies.</p>
      {error && <p className="error">{error}</p>}
      <button
        className="btn btn-pink"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await takeHotSeat(week);
            if (!r.ok) setError(r.error ?? "That didn't work.");
            router.refresh();
          })
        }
      >
        🔥 Put me in the hot seat
      </button>
    </div>
  );
}

function BlindDate({ week, myRow }: { week: number; myRow: Record<string, unknown> | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  if (myRow?.status === "paired") {
    return (
      <div className="play">
        <p className="anon-note">💘 You&apos;re paired. No names, no faces, until the week ends.</p>
        <Link href={`/circle/dms/${myRow.thread}`} className="btn btn-pink">
          Open your blind date
        </Link>
      </div>
    );
  }
  if (myRow?.status === "waiting") return <p className="fine">You&apos;re in. You&apos;ll be paired with the next guy who taps in. Check back.</p>;
  return (
    <div className="play">
      {error && <p className="error">{error}</p>}
      <button
        className="btn btn-pink"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await blindDateIn(week);
            if (!r.ok) setError(r.error ?? "That didn't work.");
            router.refresh();
          })
        }
      >
        💘 I&apos;m in
      </button>
    </div>
  );
}

function Voice({ week, seconds }: { week: number; seconds: number }) {
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [left, setLeft] = useState(seconds);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [path, setPath] = useState("");
  const [busy, setBusy] = useState("");
  const [localError, setLocalError] = useState("");
  const { pending, error, submit } = useSubmit(week);
  const chunks = useRef<Blob[]>([]);

  useEffect(() => {
    if (!rec) return;
    const t = setInterval(() => setLeft((x) => x - 1), 1000);
    return () => clearInterval(t);
  }, [rec]);
  useEffect(() => {
    if (rec && left <= 0) rec.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  const startRec = async () => {
    setLocalError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
      const r = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      chunks.current = [];
      r.ondataavailable = (e) => chunks.current.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const b = new Blob(chunks.current, { type: r.mimeType || type || "audio/webm" });
        setBlob(b);
        setUrl(URL.createObjectURL(b));
        setRec(null);
      };
      r.start();
      setLeft(seconds);
      setRec(r);
    } catch {
      setLocalError("Couldn't use the mic. Check your browser's permission for homosocial.net.");
    }
  };

  const upload = async () => {
    if (!blob) return;
    setBusy("Uploading...");
    try {
      const type = blob.type.split(";")[0] || "audio/webm";
      const t = await answerClipTicket(week, type, blob.size);
      if (!t.ok || !t.signedUrl || !t.path) {
        setLocalError(t.error ?? "That didn't upload.");
        return;
      }
      const up = await fetch(t.signedUrl, { method: "PUT", headers: { "content-type": type, "x-upsert": "false", ...(t.apikey ? { apikey: t.apikey } : {}) }, body: blob });
      if (!up.ok) {
        setLocalError("The recording didn't upload. Try again.");
        return;
      }
      setPath(t.path);
      submit(null, { video_path: t.path });
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="play">
      {!url ? (
        <button className={rec ? "btn btn-danger" : "btn btn-pink"} onClick={() => (rec ? rec.stop() : startRec())}>
          {rec ? `● Recording, ${Math.max(0, left)}s. Tap to stop` : `🎙️ Record, up to ${seconds} seconds`}
        </button>
      ) : (
        <>
          <audio src={url} controls />
          <div className="row">
            <button className="btn btn-pink" disabled={pending || !!busy || !!path} onClick={upload}>
              {busy || (pending ? "Posting..." : "Post it")}
            </button>
            <button className="link-button quiet" onClick={() => (setUrl(null), setBlob(null))} disabled={!!busy}>
              Record again
            </button>
          </div>
        </>
      )}
      {(localError || error) && <p className="error">{localError || error}</p>}
    </div>
  );
}

