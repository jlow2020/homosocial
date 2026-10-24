"use client";

import { useEffect, useRef, useState } from "react";

// Record a short clip with the camera, right in the page. Front camera first,
// flip to the back one on phones. Hands the finished clip back to the caller.
export default function VideoRecorder({ seconds, onDone, onCancel }: { seconds: number; onDone: (clip: Blob) => void; onCancel: () => void }) {
  const live = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [left, setLeft] = useState(seconds);
  const [clip, setClip] = useState<{ blob: Blob; url: string } | null>(null);
  const [error, setError] = useState("");
  const chunks = useRef<Blob[]>([]);

  useEffect(() => {
    let s: MediaStream | null = null;
    let gone = false;
    (async () => {
      try {
        s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        if (gone) return s.getTracks().forEach((t) => t.stop());
        setStream(s);
        if (live.current) live.current.srcObject = s;
      } catch {
        setError("Couldn't use the camera. Check your browser's permission for homosocial.net.");
      }
    })();
    return () => {
      gone = true;
      s?.getTracks().forEach((t) => t.stop());
    };
  }, [facing]);

  useEffect(() => {
    if (!rec) return;
    const t = setInterval(() => setLeft((x) => x - 1), 1000);
    return () => clearInterval(t);
  }, [rec]);
  useEffect(() => {
    if (rec && left <= 0 && rec.state === "recording") rec.stop();
  }, [left, rec]);

  const record = () => {
    if (!stream) return;
    const type = ["video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
    const r = new MediaRecorder(stream, type ? { mimeType: type, videoBitsPerSecond: 2_500_000 } : undefined);
    chunks.current = [];
    r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    r.onstop = () => {
      const blob = new Blob(chunks.current, { type: (r.mimeType || type || "video/webm").split(";")[0] });
      setClip({ blob, url: URL.createObjectURL(blob) });
      setRec(null);
    };
    r.start(250);
    setLeft(seconds);
    setRec(r);
  };

  return (
    <div className="vrec" role="dialog" aria-label="Record a video">
      <div className="vrec-frame">
        {clip ? (
          <video src={clip.url} playsInline controls autoPlay loop />
        ) : (
          <video ref={live} playsInline muted autoPlay className={facing === "user" ? "mirror" : ""} />
        )}
        {rec && <span className="vrec-time">● {Math.max(0, left)}s</span>}
      </div>
      {error && <p className="error">{error}</p>}
      <div className="vrec-actions">
        {clip ? (
          <>
            <button className="btn btn-pink" onClick={() => onDone(clip.blob)}>
              Use it
            </button>
            <button className="btn btn-outline" onClick={() => setClip(null)}>
              Retake
            </button>
          </>
        ) : rec ? (
          <button className="btn btn-danger" onClick={() => rec.stop()}>
            Stop
          </button>
        ) : (
          <>
            <button className="btn btn-pink" disabled={!stream} onClick={record}>
              Record
            </button>
            <button className="btn btn-outline" disabled={!stream} onClick={() => setFacing(facing === "user" ? "environment" : "user")}>
              Flip
            </button>
          </>
        )}
        {!rec && (
          <button className="link-button quiet" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
