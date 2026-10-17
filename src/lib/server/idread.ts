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
  const meta = await sharp(image).rotate().metadata();
  const bases: Buffer[] = [];
  // The <<< lines are in the bottom part of the page or card. Try that first.
  const full = await sharp(image).rotate().toBuffer();
  const h = meta.height ?? 0;
  const w = meta.width ?? 0;
  if (h && w) {
    const top = Math.round(h * 0.55);
    bases.push(await sharp(full).extract({ left: 0, top, width: w, height: h - top }).toBuffer());
  }
  bases.push(full);
  for (const base of bases) {
    for (const v of await variants(base, [1800, 1200])) {
      const { data } = await worker.recognize(v);
      const parsed = parseMrz(String(data.text ?? "").split("\n"));
      if (parsed) return parsed;
    }
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
