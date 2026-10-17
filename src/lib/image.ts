// Browser-only helpers.

// Shrink phone photos before upload so they fit the server limit.
export async function shrinkImage(file: File | Blob, maxSide = 1200, quality = 0.85): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await canvasToJpeg(canvas, quality);
  return new File([blob], "photo.jpg", { type: "image/jpeg" });
}

export function canvasToJpeg(canvas: HTMLCanvasElement, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/jpeg", quality)
  );
}
