import "server-only";
import path from "node:path";
import { nodeRequire } from "@/lib/server/noderequire";

// Nudity check for photos posted where the whole Circle can see.
// Two open-source NSFW.js models (MIT license) run on our own server, so
// members' photos never leave it for this step. The fast model screens every
// photo; the deeper one only looks when the first sees anything at all.
//
// House rule: underwear, thirst traps and bare butts are fine. Genitals, an
// anus, or sex acts are not. These models can't tell a butt from an anus,
// so they never get the last word on a borderline photo: those go to the AI
// second opinion (which reads the exact rule) or to a person.

/* eslint-disable @typescript-eslint/no-explicit-any */
type Pred = { className: string; probability: number };
export type ImageScores = { porn: number; sexy: number; hentai: number; neutral: number; deep?: { porn: number; sexy: number; hentai: number } };
export type ImageVerdict = "allow" | "unsure" | "explicit";

let fast: Promise<any> | null = null;
let deep: Promise<any> | null = null;
let tfReady: Promise<any> | null = null;

function tf(): Promise<any> {
  if (!tfReady) {
    tfReady = (async () => {
      const t = nodeRequire("@tensorflow/tfjs");
      const wasm = nodeRequire("@tensorflow/tfjs-backend-wasm");
      try {
        wasm.setWasmPaths(path.join(process.cwd(), "node_modules/@tensorflow/tfjs-backend-wasm/dist") + "/");
      } catch {
        // Already set by the face checker. Same backend, nothing to do.
      }
      if (t.getBackend() !== "wasm") await t.setBackend("wasm");
      await t.ready();
      return t;
    })();
    tfReady.catch(() => (tfReady = null));
  }
  return tfReady;
}

function model(which: "fast" | "deep"): Promise<any> {
  const nsfw = nodeRequire("nsfwjs");
  if (which === "fast") {
    if (!fast) fast = tf().then(() => nsfw.load("MobileNetV2Mid", { type: "graph" }));
    fast.catch(() => (fast = null));
    return fast;
  }
  if (!deep) deep = tf().then(() => nsfw.load("InceptionV3", { size: 299 }));
  deep.catch(() => (deep = null));
  return deep;
}

async function pixels(image: Buffer, size: number, fit: "contain" | "cover") {
  const sharp = nodeRequire("sharp");
  const { data, info } = await sharp(image)
    .rotate()
    .resize(size, size, { fit, background: { r: 0, g: 0, b: 0 } })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data), w: info.width as number, h: info.height as number };
}

async function classify(which: "fast" | "deep", image: Buffer): Promise<{ porn: number; sexy: number; hentai: number; neutral: number }> {
  const t = await tf();
  const m = await model(which);
  const size = which === "fast" ? 224 : 299;
  // The whole photo (letterboxed) and a center crop: something small in the
  // frame can hide in one view and not the other. Take the worse of the two.
  const out = { porn: 0, sexy: 0, hentai: 0, neutral: 1 };
  for (const fit of ["contain", "cover"] as const) {
    const px = await pixels(image, size, fit);
    const img = t.tensor3d(px.data, [px.h, px.w, 3], "int32");
    try {
      const preds: Pred[] = await m.classify(img, 5);
      const p = (n: string) => preds.find((x) => x.className === n)?.probability ?? 0;
      out.porn = Math.max(out.porn, p("Porn"));
      out.sexy = Math.max(out.sexy, p("Sexy"));
      out.hentai = Math.max(out.hentai, p("Hentai"));
      out.neutral = Math.min(out.neutral, p("Neutral") + p("Drawing"));
    } finally {
      img.dispose();
    }
  }
  return out;
}

export async function scoreImage(image: Buffer): Promise<{ verdict: ImageVerdict; scores: ImageScores }> {
  const f = await classify("fast", image);
  const scores: ImageScores = { ...f };
  // Clean photos stop here. That's nearly all of them.
  if (f.porn < 0.12 && f.hentai < 0.2 && f.sexy < 0.35) return { verdict: "allow", scores };
  const d = await classify("deep", image);
  scores.deep = { porn: d.porn, sexy: d.sexy, hentai: d.hentai };
  const explicit = Math.max(f.porn, f.hentai);
  const explicitDeep = Math.max(d.porn, d.hentai);
  // Both models have to be sure before anything gets held.
  if (explicit >= 0.8 && explicitDeep >= 0.8) return { verdict: "explicit", scores };
  // Underwear and butts land here as "sexy", which is allowed. Only real
  // explicit signal from either model counts as unsure.
  if ((explicit + explicitDeep) / 2 >= 0.35 || explicitDeep >= 0.55) return { verdict: "unsure", scores };
  return { verdict: "allow", scores };
}

// Small jpeg for the AI second opinion and the review queue.
export async function previewJpeg(image: Buffer, max = 768): Promise<Buffer> {
  const sharp = nodeRequire("sharp");
  return sharp(image).rotate().resize(max, max, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
}

// Load both models ahead of time. Safe to call often.
export async function warmImageModels(): Promise<void> {
  try {
    await Promise.all([model("fast"), model("deep")]);
  } catch (e) {
    console.error("warm models failed", e);
  }
}
