"use client";

import { useEffect, useRef, useState } from "react";

type Ticket = { ok: boolean; error?: string; signedUrl?: string; path?: string; apikey?: string };

// Record a voice memo, listen back, post it. The upload goes straight from
// the phone to storage with a one-time ticket from the server.
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

  const start = async () => {
    setError("");
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
        <button className={rec ? "btn btn-danger" : "btn btn-pink"} onClick={() => (rec ? rec.stop() : start())}>
          {rec ? `● Recording, ${Math.max(0, left)}s. Tap to stop` : label}
        </button>
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
    </div>
  );
}
