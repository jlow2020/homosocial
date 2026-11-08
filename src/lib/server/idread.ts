import "server-only";
import { readFile } from "node:fs/promises";
import { nodeRequire } from "./noderequire";
import path from "node:path";
import { parseAamva, type LicenseData } from "@/lib/id/aamva";
import { parseMrz, type MrzData } from "@/lib/id/mrz";

// Reads an ID photo on the server: the barcode on US licenses and ID cards,
// or the <<< lines on passports and travel cards.

const root = process.cwd();
const req = nodeRequire;

/* eslint-disable @typescript-eslint/no-explicit-any */
let zxingReady: Promise<any> | null = null;
function zxing() {
  if (!zxingReady) {
    zxingReady = (async () => {
      const mod = req("zxing-wasm/reader");
      const wasm = await readFile(path.join(root, "node_modules/zxing-wasm/dist/reader/zxing_reader.wasm"));
      mod.prepareZXingModule({
        overrides: { wasmBinary: wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength) },
        fireImmediately: true,
      });
      return mod;
    })();
    zxingReady.catch(() => (zxingReady = null));
  }
  return zxingReady;
}

let ocrReady: Promise<any> | null = null;
function ocr() {
  if (!ocrReady) {
    ocrReady = (async () => {
      const { createWorker } = req("tesseract.js");
      const langPath = path.join(root, "node_modules/@tesseract.js-data/eng/4.0.0_best_int");
      const worker = await createWorker("eng", 1, { langPath, cacheMethod: "none", gzip: true });
      await worker.setParameters({
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<",
        tessedit_pageseg_mode: "6",
      });
      return worker;
    })();
    ocrReady.catch(() => (ocrReady = null));
  }
  return ocrReady;
}

async function variants(image: Buffer, widths: number[]): Promise<Buffer[]> {
  const sharp = req("sharp");
  const out: Buffer[] = [];
  for (const w of widths) {
    out.push(
      await sharp(image).rotate().resize({ width: w, withoutEnlargement: true }).grayscale().normalize().png().toBuffer(),
    );
  }
  return out;
}

export async function readBarcode(image: Buffer): Promise<LicenseData | null> {
  const z = await zxing();
  for (const v of await variants(image, [2000, 1400, 2600])) {
    const results = await z.readBarcodes(new Uint8Array(v), {
      formats: ["PDF417"],
      tryHarder: true,
      tryRotate: true,
      textMode: "Plain",
      maxNumberOfSymbols: 1,
    });
    for (const r of results) {
      const parsed = parseAamva(r.text ?? "");
      if (parsed) return parsed;
    }
  }
  return null;
}

export async function readMrz(image: Buffer): Promise<MrzData | null> {
  const sharp = req("sharp");
  const worker = await ocr();
  const upright = await sharp(image).rotate().toBuffer();
  const started = Date.now();
  // Phone photos are rarely straight, and OCR on the <<< lines falls apart at a
  // few degrees of tilt. Straighten a few ways, bottom of the page first.
  for (const angle of [0, 3, -3, 6, -6, 1.5, -1.5]) {
    const turned = angle ? await sharp(upright).rotate(angle, { background: "#000" }).toBuffer() : upright;
    const meta = await sharp(turned).metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    const crops: Buffer[] = [];
    if (w && h) {
      const top = Math.round(h * 0.5);
      crops.push(await sharp(turned).extract({ left: 0, top, width: w, height: h - top }).toBuffer());
    }
    if (angle === 0) crops.push(turned);
    for (const crop of crops) {
      const v = await sharp(crop).resize({ width: 1800, withoutEnlargement: false }).grayscale().normalize().sharpen().png().toBuffer();
      const { data } = await worker.recognize(v);
      const parsed = parseMrz(String(data.text ?? "").split("\n"));
      if (parsed) return parsed;
    }
    if (Date.now() - started > 25000) break;
  }
  return null;
}

export type IdData = LicenseData | MrzData;

// Try every way of reading the document, cheapest first.
export async function readDocument(images: Buffer[]): Promise<IdData | null> {
  for (const img of images) {
    const bc = await readBarcode(img).catch(() => null);
    if (bc) return bc;
  }
  for (const img of images) {
    const m = await readMrz(img).catch(() => null);
    if (m) return m;
  }
  return null;
}
