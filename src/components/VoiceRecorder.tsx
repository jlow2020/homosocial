"use client";

import { useEffect, useRef, useState } from "react";

type Ticket = { ok: boolean; error?: string; signedUrl?: string; path?: string; apikey?: string };

const MIC_KEY = "hs-mic";
// Loudest moment quieter than this means the mic heard nothing.
const SILENT = 0.02;

// Record a voice memo, listen back, post it. Shows a live level so you can see
// the mic is hearing you, lets you pick a different mic, and won't post silence.
// The upload goes straight from the phone to storage with a one-time ticket.
export default function VoiceRecorder({
  seconds,
  label,
  getTicket,
  onUploaded,
}: {
  seconds: number;
  label: string;
  getTicket: (type: string, size: number) => Promise<Ticket>;
  onUploaded: (path: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [left, setLeft] = useState(seconds);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [mic, setMic] = useState("");
  const [level, setLevel] = useState(0);
  const chunks = useRef<Blob[]>([]);
  const peak = useRef(0);
  const stopMeter = useRef<() => void>(() => {});

  // Which mics this device has. Labels only show once he's allowed the mic once.
  const loadMics = async () => {
    try {
      const all = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "audioinput" && d.deviceId);
      setMics(all);
      let saved = "";
      try {
        saved = localStorage.getItem(MIC_KEY) ?? "";
      } catch {}
      if (saved && all.some((d) => d.deviceId === saved)) setMic(saved);
    } catch {}
  };
  useEffect(() => {
    void loadMics();
    return () => stopMeter.current();
  }, []);

  useEffect(() => {
    if (!rec) return;
    const t = setInterval(() => setLeft((x) => x - 1), 1000);
    return () => clearInterval(t);
  }, [rec]);
  useEffect(() => {
    if (rec && left <= 0) rec.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  const start = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { ...(mic ? { deviceId: { exact: mic } } : {}), echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      void loadMics();
      // Live level, and the loudest moment, so silence gets caught.
      peak.current = 0;
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      await ctx.resume().catch(() => {});
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Float32Array(analyser.fftSize);
      let raf = 0;
      const tick = () => {
        analyser.getFloatTimeDomainData(buf);
        let p = 0;
        for (let i = 0; i < buf.length; i++) p = Math.max(p, Math.abs(buf[i]));
        peak.current = Math.max(peak.current, p);
        setLevel(p);
        raf = requestAnimationFrame(tick);
      };
      tick();
      stopMeter.current = () => {
        cancelAnimationFrame(raf);
        ctx.close().catch(() => {});
      };

      const type = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
      const r = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      chunks.current = [];
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      r.onstop = () => {
        stopMeter.current();
        stream.getTracks().forEach((t) => t.stop());
        setRec(null);
        setLevel(0);
        if (peak.current < SILENT) {
          setError(mics.length > 1 ? "We didn't hear anything. Pick a different mic below and try again." : "We didn't hear anything. Check that your mic isn't muted and try again.");
          return;
        }
        const b = new Blob(chunks.current, { type: r.mimeType || type || "audio/webm" });
        setBlob(b);
        setUrl(URL.createObjectURL(b));
      };
      r.start(250);
      setLeft(seconds);
      setRec(r);
    } catch {
      setError("Couldn't use the mic. Check your browser's permission for homosocial.net.");
    }
  };

  const post = async () => {
    if (!blob) return;
    setBusy("Uploading...");
    try {
      const type = blob.type.split(";")[0] || "audio/webm";
      const t = await getTicket(type, blob.size);
      if (!t.ok || !t.signedUrl || !t.path) {
        setError(t.error ?? "That didn't upload.");
        return;
      }
      const up = await fetch(t.signedUrl, { method: "PUT", headers: { "content-type": type, "x-upsert": "false", ...(t.apikey ? { apikey: t.apikey } : {}) }, body: blob });
      if (!up.ok) {
        setError("The recording didn't upload. Try again.");
        return;
      }
      setBusy("Posting...");
      const r = await onUploaded(t.path);
      if (!r.ok) setError(r.error ?? "That didn't post.");
      else setDone(true);
    } finally {
      setBusy("");
    }
  };

  if (done) return <p className="fine">Posted.</p>;
  return (
    <div className="play">
      {!url ? (
        <>
          <button className={rec ? "btn btn-danger" : "btn btn-pink"} onClick={() => (rec ? rec.stop() : start())}>
            {rec ? `● ${Math.max(0, left)}s · Tap to stop` : label}
          </button>
          {rec && (
            <span className="mic-level" aria-hidden="true">
              <span style={{ transform: `scaleX(${Math.min(1, level * 3)})` }} />
            </span>
          )}
        </>
      ) : (
        <>
          <audio src={url} controls />
          <div className="row">
            <button className="btn btn-pink" disabled={!!busy} onClick={post}>
              {busy || "Post it"}
            </button>
            <button className="link-button quiet" onClick={() => (setUrl(null), setBlob(null))} disabled={!!busy}>
              Record again
            </button>
          </div>
        </>
      )}
      {error && <p className="error">{error}</p>}
      {!rec && !url && mics.length > 1 && (
        <label className="mic-pick">
          <span className="fine">Mic</span>
          <select
            className="input input-small"
            value={mic}
            onChange={(e) => {
              setMic(e.target.value);
              try {
                localStorage.setItem(MIC_KEY, e.target.value);
              } catch {}
            }}
          >
            <option value="">Default</option>
            {mics.map((d, i) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Mic ${i + 1}`}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
