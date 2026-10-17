"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { findFaces, type FaceBox } from "@/lib/faceDetect";
import { canvasToJpeg } from "@/lib/image";

const VIEW = 300; // on-screen crop size in CSS px
const OUT = 800; // saved photo is OUT x OUT
const MAX_ZOOM = 5;

type Props = {
  file: Blob;
  onDone: (photo: Blob) => void;
  onCancel: () => void;
};

type View = { cx: number; cy: number; zoom: number };

export default function PhotoCropper({ file, onDone, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [img, setImg] = useState<ImageBitmap | null>(null);
  const [view, setView] = useState<View | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "checking">("loading");
  const [problem, setProblem] = useState<string | null>(null);
  const [softProblem, setSoftProblem] = useState<string | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);

  const base = img ? Math.max(VIEW / img.width, VIEW / img.height) : 1;

  const clamp = useCallback(
    (v: View): View => {
      if (!img) return v;
      const zoom = Math.min(MAX_ZOOM, Math.max(1, v.zoom));
      const side = VIEW / (base * zoom);
      const cx = Math.min(img.width - side / 2, Math.max(side / 2, v.cx));
      const cy = Math.min(img.height - side / 2, Math.max(side / 2, v.cy));
      return { cx, cy, zoom };
    },
    [img, base],
  );

  // Load the photo and start centered on the biggest face.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const bitmap = await createImageBitmap(file);
        if (cancelled) return;
        setImg(bitmap);
        const fit = Math.max(VIEW / bitmap.width, VIEW / bitmap.height);
        let start: View = { cx: bitmap.width / 2, cy: bitmap.height / 2, zoom: 1 };

        const probe = document.createElement("canvas");
        const k = Math.min(1, 640 / Math.max(bitmap.width, bitmap.height));
        probe.width = Math.round(bitmap.width * k);
        probe.height = Math.round(bitmap.height * k);
        probe.getContext("2d")?.drawImage(bitmap, 0, 0, probe.width, probe.height);
        const faces = await findFaces(probe);
        if (cancelled) return;
        const face = faces?.[0];
        if (face) {
          const fw = face.w / k;
          const fh = face.h / k;
          const side = Math.max(fw, fh) / 0.5; // face fills about half the circle
          start = {
            cx: face.x / k + fw / 2,
            cy: face.y / k + fh / 2,
            zoom: VIEW / side / fit,
          };
        }
        setView(start);
        setStatus("ready");
      } catch {
        if (!cancelled) setProblem("That photo didn't load. Try a different one.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file]);

  // Keep the view inside the photo whenever the photo or view changes.
  const v = view && img ? clamp(view) : null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img || !v) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = VIEW * dpr;
    canvas.height = VIEW * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const side = VIEW / (base * v.zoom);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, v.cx - side / 2, v.cy - side / 2, side, side, 0, 0, canvas.width, canvas.height);
  }, [img, v, base]);

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && v) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: v.zoom };
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev || !v) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setSoftProblem(null);
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      setView(clamp({ ...v, zoom: pinch.current.zoom * (dist / pinch.current.dist) }));
      return;
    }
    const s = base * v.zoom;
    setView(clamp({ ...v, cx: v.cx - (e.clientX - prev.x) / s, cy: v.cy - (e.clientY - prev.y) / s }));
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  }

  function onWheel(e: React.WheelEvent) {
    if (!v) return;
    setView(clamp({ ...v, zoom: v.zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08) }));
  }

  async function confirmCrop(force = false) {
    if (!img || !v) return;
    setProblem(null);
    setStatus("checking");
    const out = document.createElement("canvas");
    out.width = OUT;
    out.height = OUT;
    const side = VIEW / (base * v.zoom);
    out.getContext("2d")?.drawImage(img, v.cx - side / 2, v.cy - side / 2, side, side, 0, 0, OUT, OUT);

    if (!force) {
      const faces = await findFaces(out);
      if (faces) {
        const real = faces.filter((f: FaceBox) => f.score >= 0.5);
        if (real.length === 0) {
          setStatus("ready");
          setProblem(
            "We can't find a face in this circle. Use a photo of your face, front and center. It has to match you in the Realness Check.",
          );
          return;
        }
        if (real.length > 1) {
          setStatus("ready");
          setProblem("Just you, please. Zoom in so nobody else is in the circle.");
          return;
        }
        if (real[0].w < OUT * 0.28) {
          setStatus("ready");
          setSoftProblem("Your face is pretty small in there. Zoom in so it fills more of the circle.");
          return;
        }
      }
    }
    try {
      onDone(await canvasToJpeg(out, 0.88));
    } catch {
      setStatus("ready");
      setProblem("That photo didn't save. Try again.");
    }
  }

  return (
    <div className="cropper" role="dialog" aria-label="Position your photo">
      <p className="cropper-title">Center your face</p>
      <div
        className="cropper-frame"
        style={{ width: VIEW, height: VIEW }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <canvas ref={canvasRef} style={{ width: VIEW, height: VIEW }} aria-hidden="true" />
        <span className="cropper-mask" aria-hidden="true" />
        {status === "loading" && <span className="cropper-loading">Finding your face</span>}
      </div>
      <label className="cropper-zoom">
        <span className="visually-hidden">Zoom</span>
        <span aria-hidden="true">−</span>
        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={v?.zoom ?? 1}
          disabled={!v}
          onChange={(e) => v && setView(clamp({ ...v, zoom: Number(e.target.value) }))}
        />
        <span aria-hidden="true">+</span>
      </label>
      <p className="hint">Drag to move. Pinch or slide to zoom.</p>
      {problem && <p className="error" role="alert">{problem}</p>}
      {softProblem && (
        <div className="notice-inline" role="status">
          {softProblem}{" "}
          <button type="button" className="link-button" onClick={() => confirmCrop(true)}>
            Use it anyway
          </button>
        </div>
      )}
      <div className="row">
        <button
          type="button"
          className="btn btn-pink"
          disabled={status !== "ready"}
          onClick={() => confirmCrop(false)}
        >
          {status === "checking" ? "Checking" : "Use this photo"}
        </button>
        <button type="button" className="link-button quiet" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
