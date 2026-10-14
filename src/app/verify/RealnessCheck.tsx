"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Human, FaceResult, Result } from "@vladmandic/human";
import { MOVES, type Move, type RealnessResult } from "@/lib/realness";
import { canvasToJpeg } from "@/lib/image";
import { completeVerification } from "./actions";

type Phase =
  | { kind: "intro" }
  | { kind: "loading"; what: string; camera?: boolean }
  | { kind: "moving"; step: number; prompt: string; hint?: string }
  | { kind: "saving" }
  | { kind: "failed"; message: string; retry: boolean }
  | { kind: "error"; message: string; fix?: { href: string; label: string } };

const HOLD_FRAMES = 4;
const TIME_LIMIT_MS = 60_000;

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

function mouthOpen(result: Result): number {
  for (const g of result.gesture) {
    const m = /mouth (\d+)% open/.exec(String(g.gesture));
    if (m) return Number(m[1]);
  }
  return 0;
}

function happy(face: FaceResult): number {
  return face.emotion?.find((e) => e.emotion === "happy")?.score ?? 0;
}

function yaw(face: FaceResult): number {
  return Math.abs(face.rotation?.angle.yaw ?? 0);
}

function doing(move: Move, face: FaceResult, result: Result): boolean {
  if (move === "turn") return yaw(face) > 0.35;
  if (move === "smile") return happy(face) > 0.6;
  return mouthOpen(result) >= 30;
}

// Between moves he has to come back to a plain, straight-on face, so one held
// expression can't count twice.
function neutral(face: FaceResult, result: Result): boolean {
  return yaw(face) < 0.2 && happy(face) < 0.5 && mouthOpen(result) < 15;
}

let humanPromise: Promise<Human> | null = null;
function loadHuman(): Promise<Human> {
  if (!humanPromise) {
    humanPromise = (async () => {
      const { Human } = await import("@vladmandic/human");
      const human = new Human({
        modelBasePath: "/models/",
        backend: "webgl",
        debug: false,
        cacheSensitivity: 0,
        face: {
          enabled: true,
          detector: { rotation: false, maxDetected: 2, minConfidence: 0.5 },
          mesh: { enabled: true },
          iris: { enabled: false },
          description: { enabled: true },
          emotion: { enabled: true },
          antispoof: { enabled: true },
          liveness: { enabled: true },
        },
        body: { enabled: false },
        hand: { enabled: false },
        object: { enabled: false },
        segmentation: { enabled: false },
        gesture: { enabled: true },
        filter: { enabled: true, equalization: false },
      });
      await human.load();
      await human.warmup();
      return human;
    })();
    humanPromise.catch(() => (humanPromise = null));
  }
  return humanPromise;
}

export default function RealnessCheck({ firstName }: { firstName: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ kind: "intro" });
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cancelled = useRef(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    // Start fetching the models as soon as the page opens.
    loadHuman().catch(() => {});
    return () => {
      cancelled.current = true;
      stopCamera();
    };
  }, [stopCamera]);

  async function run() {
    cancelled.current = false;
    try {
      setPhase({ kind: "loading", what: "Loading the Realness Check" });
      const human = await loadHuman();

      setPhase({ kind: "loading", what: "Looking at your profile photo" });
      const res = await fetch("/api/me/photo", { cache: "no-store" });
      if (!res.ok) throw new Error("photo");
      const bitmap = await createImageBitmap(await res.blob());
      const ref = document.createElement("canvas");
      ref.width = bitmap.width;
      ref.height = bitmap.height;
      ref.getContext("2d")!.drawImage(bitmap, 0, 0);
      const refResult = await human.detect(ref);
      const refFaces = refResult.face.filter((f) => f.embedding?.length);
      if (refFaces.length !== 1) {
        setPhase({
          kind: "error",
          message:
            refFaces.length === 0
              ? "We couldn't find your face in your profile photo. Use one where your face is clear and well lit."
              : "Your profile photo has more than one face in it. Use one that's just you.",
          fix: { href: "/profile", label: "Change my photo" },
        });
        return;
      }
      const refEmbedding = refFaces[0].embedding!;

      setPhase({ kind: "loading", what: "Turning on your camera", camera: true });
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
      } catch {
        setPhase({
          kind: "error",
          message:
            "Your camera didn't turn on. Allow camera access for this site in your browser settings, then try again.",
        });
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();

      const moves = shuffle(Object.keys(MOVES) as Move[]);
      const frames: Blob[] = [];
      const matches: number[] = []; // during moves (turned, smiling): kept for the record
      const neutralMatches: number[] = []; // straight-on, plain face: what decides the match
      const reals: number[] = [];
      const lives: number[] = [];
      const ages: number[] = [];
      const started = performance.now();
      const grab = document.createElement("canvas");

      for (let step = 0; step < moves.length; step++) {
        const move = moves[step];
        let ready = false; // has he gone back to neutral first?
        let held = 0;
        setPhase({ kind: "moving", step, prompt: "Straight face, look right at the camera" });

        while (true) {
          if (cancelled.current) return;
          if (performance.now() - started > TIME_LIMIT_MS) {
            stopCamera();
            setPhase({ kind: "failed", message: "That took too long. Find good light and try again.", retry: true });
            return;
          }
          const result = await human.detect(video);
          const faces = result.face;
          if (faces.length === 0) {
            held = 0;
            setPhase({ kind: "moving", step, prompt: ready ? MOVES[move] : "Straight face, look right at the camera", hint: "We can't see your face. Move into good light." });
            continue;
          }
          if (faces.length > 1) {
            held = 0;
            setPhase({ kind: "moving", step, prompt: ready ? MOVES[move] : "Straight face, look right at the camera", hint: "Only you in the frame." });
            continue;
          }
          const face = faces[0];
          if (!ready) {
            if (neutral(face, result)) {
              ready = true;
              if (face.embedding?.length) neutralMatches.push(human.match.similarity(refEmbedding, face.embedding));
              setPhase({ kind: "moving", step, prompt: MOVES[move] });
            }
            continue;
          }
          if (doing(move, face, result)) {
            held++;
            if (held >= HOLD_FRAMES) {
              grab.width = video.videoWidth;
              grab.height = video.videoHeight;
              grab.getContext("2d")!.drawImage(video, 0, 0);
              frames.push(await canvasToJpeg(grab, 0.8));
              if (face.embedding?.length) matches.push(human.match.similarity(refEmbedding, face.embedding));
              if (typeof face.real === "number") reals.push(face.real);
              if (typeof face.live === "number") lives.push(face.live);
              if (typeof face.age === "number") ages.push(face.age);
              break;
            }
          } else {
            held = 0;
          }
        }
      }

      stopCamera();
      const avg = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
      const result: RealnessResult = {
        moves,
        // Profile photos are straight-on, so match on the straight-on frames.
        match: neutralMatches.length ? Math.max(...neutralMatches) : avg(matches),
        moveMatch: avg(matches),
        real: avg(reals),
        live: avg(lives),
        minAge: ages.length ? Math.min(...ages) : 0,
        durationMs: Math.round(performance.now() - started),
      };

      setPhase({ kind: "saving" });
      const form = new FormData();
      frames.forEach((f, i) => form.append(`frame${i}`, new File([f], `frame${i}.jpg`, { type: "image/jpeg" })));
      form.append("result", JSON.stringify(result));
      const outcome = await completeVerification(form);
      if (outcome.passed) {
        router.push("/circle");
        router.refresh();
        return;
      }
      setPhase({ kind: "failed", message: outcome.message, retry: outcome.retry });
    } catch (e) {
      stopCamera();
      const photo = e instanceof Error && e.message === "photo";
      setPhase({
        kind: "error",
        message: photo
          ? "We couldn't load your profile photo. Try again in a moment."
          : "Something went wrong running the Realness Check. Close other apps using the camera and try again.",
      });
    }
  }

  // The video must be on screen before it plays, or iPhones may not run it.
  const showVideo = phase.kind === "moving" || (phase.kind === "loading" && phase.camera === true);

  return (
    <div className="realness wrap">
      <div className={showVideo ? "cam cam-on" : "cam"}>
        <video ref={videoRef} playsInline muted className="cam-video" />
        {phase.kind === "moving" && (
          <div className="cam-overlay" aria-live="assertive">
            <span className="cam-step">
              {phase.step + 1} of 3
            </span>
            <span className="cam-prompt">{phase.prompt}</span>
            {phase.hint && <span className="cam-hint">{phase.hint}</span>}
          </div>
        )}
      </div>

      {phase.kind === "intro" && (
        <div className="stack">
          <p className="lede-dark">
            {firstName}, this is the last step. Your camera turns on and we ask
            for three quick moves, in a random order. We check it&apos;s really
            you, live, and that you match your profile photo.
          </p>
          <ul className="facts">
            <li>Takes about 20 seconds.</li>
            <li>The face check runs on your phone. We save three photos from the check, never any face measurements.</li>
            <li>Find good light and hold your phone at eye level.</li>
          </ul>
          <button className="btn btn-pink btn-full" onClick={run}>
            Start my Realness Check
          </button>
        </div>
      )}

      {phase.kind === "loading" && <p className="status" aria-live="polite">{phase.what}</p>}
      {phase.kind === "saving" && <p className="status" aria-live="polite">Checking your results</p>}

      {phase.kind === "failed" && (
        <div className="stack">
          <p className="error" role="alert">{phase.message}</p>
          {phase.retry && (
            <button className="btn btn-pink btn-full" onClick={run}>
              Try again
            </button>
          )}
        </div>
      )}

      {phase.kind === "error" && (
        <div className="stack">
          <p className="error" role="alert">{phase.message}</p>
          {phase.fix ? (
            <a className="btn btn-pink btn-full" href={phase.fix.href}>{phase.fix.label}</a>
          ) : (
            <button className="btn btn-pink btn-full" onClick={run}>
              Try again
            </button>
          )}
        </div>
      )}

    </div>
  );
}
