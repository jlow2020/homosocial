"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { checkId, type IdOutcome } from "./actions";
import { canvasToJpeg, shrinkImage } from "@/lib/image";

// The ID check, one photo at a time: the camera opens right in the page with a
// card-shaped guide, he snaps it, checks it, and moves on. No app switching, so
// the page never reloads on him. Uploading a photo is the backup.

type Kind = "card" | "passport";
type Side = "front" | "back";
type Shot = { file: File; url: string };

const MAX_SIDE = 2400;

const COPY: Record<Kind, Record<Side, { title: string; tip: string }>> = {
  card: {
    front: { title: "Front of your ID", tip: "The side with your picture. Fit the card inside the frame." },
    back: { title: "Back of your ID", tip: "The side with the barcode. Get close so the barcode is sharp." },
  },
  passport: {
    front: { title: "Your passport photo page", tip: "Fit the whole page, including the <<< lines at the bottom." },
    back: { title: "", tip: "" },
  },
};

// Live rear camera with a guide box. Hands back a full-resolution still.
function Camera({ kind, onShot, onFail }: { kind: Kind; onShot: (f: File) => void; onFail: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [snapping, setSnapping] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let gone = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("no camera");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 3840 }, height: { ideal: 2160 } },
          audio: false,
        });
        if (gone) return stream.getTracks().forEach((t) => t.stop());
        const v = video.current;
        if (!v) return;
        v.srcObject = stream;
        await v.play().catch(() => {});
        setReady(true);
      } catch {
        if (!gone) onFail();
      }
    })();
    return () => {
      gone = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onFail]);

  const snap = async () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    setSnapping(true);
    try {
      const scale = Math.min(1, MAX_SIDE / Math.max(v.videoWidth, v.videoHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(v.videoWidth * scale);
      c.height = Math.round(v.videoHeight * scale);
      c.getContext("2d")?.drawImage(v, 0, 0, c.width, c.height);
      const blob = await canvasToJpeg(c, 0.92);
      onShot(new File([blob], "id.jpg", { type: "image/jpeg" }));
    } finally {
      setSnapping(false);
    }
  };

  return (
    <div className="idc-cam">
      <video ref={video} playsInline muted autoPlay />
      <div className={kind === "passport" ? "idc-guide idc-guide-page" : "idc-guide"} aria-hidden="true" />
      {!ready && <p className="idc-cam-wait">Opening your camera...</p>}
      <button type="button" className="idc-shutter" aria-label="Take the photo" disabled={!ready || snapping} onClick={snap} />
    </div>
  );
}

export default function IdCheck() {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>("card");
  const [side, setSide] = useState<Side>("front");
  const [shots, setShots] = useState<Partial<Record<Side, Shot>>>({});
  const [review, setReview] = useState<Shot | null>(null);
  const [noCamera, setNoCamera] = useState(false);
  const [working, setWorking] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<{ message: string; retry: boolean } | null>(null);
  const upload = useRef<HTMLInputElement>(null);
  const failCamera = useRef(() => setNoCamera(true)).current;

  const top = useRef<HTMLParagraphElement>(null);
  // Keep the step he's on at the top of the screen, camera and shutter in view.
  useEffect(() => {
    const t = setTimeout(() => top.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 400);
    return () => clearTimeout(t);
  }, [side, review, kind]);

  const steps = kind === "card" ? 2 : 1;
  const copy = COPY[kind][side];

  // A photo from the library or the phone's camera app. Shown right away, shrunk behind the scenes.
  const picked = async (f: File) => {
    setError(null);
    setWorking("Getting your photo ready...");
    try {
      const small = await shrinkImage(f, MAX_SIDE, 0.92).catch(() => (f.type === "image/jpeg" || f.type === "image/png") && f.size < 6e6 ? f : null);
      if (!small) {
        setError({ message: "That photo didn't open. Use the camera button instead.", retry: true });
        return;
      }
      setReview({ file: small, url: URL.createObjectURL(small) });
    } finally {
      setWorking("");
    }
  };

  const submit = async (all: Partial<Record<Side, Shot>>) => {
    setChecking(true);
    setError(null);
    const form = new FormData();
    form.append("kind", kind);
    form.append("front", all.front!.file);
    if (kind === "card" && all.back) form.append("back", all.back.file);
    let outcome: IdOutcome;
    try {
      outcome = await checkId(form);
    } catch {
      outcome = { passed: false, message: "That didn't go through. Check your connection and tap Try again.", retry: true };
    }
    if (outcome.passed) {
      router.push("/circle");
      router.refresh();
      return;
    }
    setChecking(false);
    setError({ message: outcome.message, retry: outcome.retry });
    // Send him back to the photo that needs redoing.
    if (outcome.retry && outcome.step) {
      setSide(outcome.step);
      setShots((s) => ({ ...s, [outcome.step!]: undefined }));
    }
  };

  const useIt = () => {
    if (!review) return;
    const next = { ...shots, [side]: review };
    setShots(next);
    setReview(null);
    if (kind === "card" && side === "front" && !next.back) setSide("back");
    else void submit(next);
  };

  const switchKind = (k: Kind) => {
    setKind(k);
    setSide("front");
    setShots({});
    setReview(null);
    setError(null);
  };

  if (checking) {
    return (
      <div className="form wrap idc">
        <div className="idc-thumbs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {shots.front && <img src={shots.front.url} alt="" />}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {shots.back && <img src={shots.back.url} alt="" />}
        </div>
        <p className="idc-title">Checking your ID</p>
        <div className="idc-bar" aria-hidden="true">
          <span />
        </div>
        <p className="fine">Usually 10 to 20 seconds. Keep this page open.</p>
      </div>
    );
  }

  if (error && !error.retry) {
    return (
      <div className="form wrap idc">
        <p className="error" role="alert">
          {error.message}
        </p>
        <a href="/circle" className="btn btn-outline btn-full">
          Back to my Circle
        </a>
      </div>
    );
  }

  const ready = shots.front && (kind === "passport" || shots.back);
  return (
    <div className="form wrap idc">
      <p className="idc-step" ref={top}>
        {steps > 1 ? `Step ${side === "front" ? 1 : 2} of 2` : "One photo"}
      </p>
      <p className="idc-title">{copy.title}</p>

      {review ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={review.url} alt={copy.title} className="idc-review" />
          <p className="fine">Is it sharp, with no glare on the picture or the barcode?</p>
          <div className="idc-actions">
            <button type="button" className="btn btn-pink btn-full" onClick={useIt}>
              {kind === "card" && side === "front" && !shots.back ? "Looks good, next" : "Looks good, check my ID"}
            </button>
            <button type="button" className="btn btn-outline btn-full" onClick={() => setReview(null)}>
              Retake
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="idc-tip">{copy.tip}</p>
          {!noCamera && !working && <Camera kind={kind} onShot={(f) => setReview({ file: f, url: URL.createObjectURL(f) })} onFail={failCamera} />}
          {working && <p className="idc-cam-wait">{working}</p>}
          {error && (
            <p className="error" role="alert">
              {error.message}
            </p>
          )}
          {ready && error ? (
            <button type="button" className="btn btn-pink btn-full" onClick={() => void submit(shots)}>
              Try again
            </button>
          ) : null}
          <div className="idc-actions">
            <button type="button" className={noCamera ? "btn btn-pink btn-full" : "link-button"} onClick={() => upload.current?.click()}>
              {noCamera ? "Take or choose a photo" : "Upload a photo instead"}
            </button>
          </div>
          <input
            ref={upload}
            type="file"
            accept="image/*"
            className="visually-hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void picked(f);
            }}
          />
        </>
      )}

      <div className="idc-foot">
        {kind === "card" ? (
          <button type="button" className="link-button quiet" onClick={() => switchKind("passport")}>
            Using a passport book instead?
          </button>
        ) : (
          <button type="button" className="link-button quiet" onClick={() => switchKind("card")}>
            Use a driver&apos;s license or ID card instead
          </button>
        )}
        <p className="fine">Military IDs can&apos;t be photographed by law, so use your license or passport.</p>
      </div>
    </div>
  );
}
