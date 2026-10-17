// Browser-only. A light face finder for the profile photo step: just the
// detector model, nothing that measures or remembers a face.
import type { Human } from "@vladmandic/human";

export type FaceBox = { x: number; y: number; w: number; h: number; score: number };

let humanPromise: Promise<Human> | null = null;

function loadDetector(): Promise<Human> {
  if (!humanPromise) {
    humanPromise = (async () => {
      const { Human } = await import("@vladmandic/human");
      const probe = document.createElement("canvas");
      const hasWebgl = !!(probe.getContext("webgl2") || probe.getContext("webgl"));
      const human = new Human({
        modelBasePath: "/models/",
        // Old phones without WebGL still get the check, just slower.
        backend: hasWebgl ? "webgl" : "cpu",
        debug: false,
        face: {
          enabled: true,
          detector: { rotation: false, maxDetected: 5, minConfidence: 0.5, return: false },
          mesh: { enabled: false },
          iris: { enabled: false },
          description: { enabled: false },
          emotion: { enabled: false },
          antispoof: { enabled: false },
          liveness: { enabled: false },
        },
        body: { enabled: false },
        hand: { enabled: false },
        object: { enabled: false },
        segmentation: { enabled: false },
        gesture: { enabled: false },
        filter: { enabled: false },
      });
      await human.load();
      return human;
    })();
    humanPromise.catch(() => (humanPromise = null));
  }
  return humanPromise;
}

// Start downloading the model early so it's ready when a photo is picked.
export function preloadFaceDetector() {
  loadDetector().catch(() => {});
}

// Returns the faces found, largest first, in the canvas's pixel coordinates.
// Returns null if detection couldn't run at all (old phone, no WebGL).
export async function findFaces(canvas: HTMLCanvasElement): Promise<FaceBox[] | null> {
  try {
    const human = await loadDetector();
    const result = await human.detect(canvas);
    return result.face
      .map((f) => ({ x: f.box[0], y: f.box[1], w: f.box[2], h: f.box[3], score: f.boxScore ?? f.score }))
      .sort((a, b) => b.w * b.h - a.w * a.h);
  } catch {
    return null;
  }
}
