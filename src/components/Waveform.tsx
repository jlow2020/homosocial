"use client";

import { useEffect, useRef, useState } from "react";

// A voice memo as bars you can tap. Decodes the clip once, draws the waveform,
// and lights it up as it plays.
export default function Waveform({ src }: { src: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const [bars, setBars] = useState<number[] | null>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(0);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const buf = await (await fetch(src)).arrayBuffer();
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new Ctx();
        const decoded = await ctx.decodeAudioData(buf);
        const data = decoded.getChannelData(0);
        const n = 56;
        const step = Math.floor(data.length / n);
        const out: number[] = [];
        for (let i = 0; i < n; i++) {
          let sum = 0;
          for (let j = 0; j < step; j += 4) sum += Math.abs(data[i * step + j]);
          out.push(sum / (step / 4));
        }
        const max = Math.max(...out, 0.01);
        if (live) setBars(out.map((v) => Math.max(0.08, v / max)));
        ctx.close();
      } catch {
        if (live) setBars([]);
      }
    })();
    return () => {
      live = false;
    };
  }, [src]);

  useEffect(() => {
    const c = canvas.current;
    if (!c || !bars) return;
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth;
    const h = 44;
    c.width = w * dpr;
    c.height = h * dpr;
    const g = c.getContext("2d")!;
    g.scale(dpr, dpr);
    g.clearRect(0, 0, w, h);
    const n = bars.length || 1;
    const gap = 2;
    const bw = Math.max(2, (w - gap * (n - 1)) / n);
    bars.forEach((v, i) => {
      const x = i * (bw + gap);
      const bh = Math.max(3, v * h);
      g.fillStyle = i / n <= pos ? "#ff3d8b" : "#5a4475";
      g.beginPath();
      g.roundRect(x, (h - bh) / 2, bw, bh, 2);
      g.fill();
    });
  }, [bars, pos]);

  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) a.play();
    else a.pause();
  };

  if (bars && bars.length === 0) return <audio src={src} controls preload="metadata" />;

  return (
    <div className="wave">
      <button className="wave-play" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
        {playing ? "❚❚" : "▶"}
      </button>
      <canvas
        ref={canvas}
        className="wave-bars"
        onClick={(e) => {
          const a = audio.current;
          if (!a || !dur) return;
          const r = (e.target as HTMLCanvasElement).getBoundingClientRect();
          a.currentTime = ((e.clientX - r.left) / r.width) * dur;
        }}
      />
      <span className="fine wave-time">{fmt(playing || pos > 0 ? pos * dur : dur)}</span>
      <audio
        ref={audio}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setPos(0);
        }}
        onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
        onTimeUpdate={(e) => dur && setPos(e.currentTarget.currentTime / dur)}
      />
    </div>
  );
}

function fmt(s: number): string {
  if (!Number.isFinite(s)) return "";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}
