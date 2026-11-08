// Browser-only helpers.

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then(
      (v) => (clearTimeout(t), resolve(v)),
      (e) => (clearTimeout(t), reject(e)),
    );
  });
}

type Decoded = { src: CanvasImageSource; w: number; h: number; done: () => void };

// Phones hand us anything from a 1MP screenshot to a 48MP HEIC. Try the image
// element first (it honors the photo's rotation everywhere), then createImageBitmap.
async function decode(file: File | Blob): Promise<Decoded> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await withTimeout(img.decode(), 15000);
    if (img.naturalWidth && img.naturalHeight) return { src: img, w: img.naturalWidth, h: img.naturalHeight, done: () => URL.revokeObjectURL(url) };
  } catch {
    // fall through
  }
  URL.revokeObjectURL(url);
  const b = await withTimeout(createImageBitmap(file, { imageOrientation: "from-image" }), 15000);
  return { src: b, w: b.width, h: b.height, done: () => b.close() };
}

// Some phones run out of canvas memory and hand back a blank picture without an error.
function looksBlank(canvas: HTMLCanvasElement): boolean {
  const probe = document.createElement("canvas");
  probe.width = probe.height = 12;
  const ctx = probe.getContext("2d");
  if (!ctx) return false;
  ctx.drawImage(canvas, 0, 0, 12, 12);
  const d = ctx.getImageData(0, 0, 12, 12).data;
  let min = 255;
  let max = 0;
  for (let i = 0; i < d.length; i += 4) {
    const v = (d[i] + d[i + 1] + d[i + 2]) / 3;
    min = Math.min(min, v);
    max = Math.max(max, v);
  }
  return max - min < 3;
}

// Shrink phone photos before upload so they fit the server limit. Always a JPEG.
export async function shrinkImage(file: File | Blob, maxSide = 1200, quality = 0.85): Promise<File> {
  const img = await decode(file);
  try {
    const scale = Math.min(1, maxSide / Math.max(img.w, img.h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.w * scale));
    canvas.height = Math.max(1, Math.round(img.h * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.drawImage(img.src, 0, 0, canvas.width, canvas.height);
    if (looksBlank(canvas)) throw new Error("blank");
    const blob = await canvasToJpeg(canvas, quality);
    return new File([blob], "photo.jpg", { type: "image/jpeg" });
  } finally {
    img.done();
  }
}

export function canvasToJpeg(canvas: HTMLCanvasElement, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/jpeg", quality)
  );
}
