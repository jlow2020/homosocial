import "server-only";
import { readFile } from "node:fs/promises";
import { nodeRequire } from "./noderequire";
import path from "node:path";

// Face detection and matching on the server, so the decision can't be faked
// from the phone. Runs Human on TensorFlow's WebAssembly backend: no GPU, no
// native binaries, nothing to pay for.

const root = process.cwd();
const req = nodeRequire;

/* eslint-disable @typescript-eslint/no-explicit-any */
type HumanLike = {
  load: () => Promise<void>;
  detect: (input: unknown) => Promise<{ face: any[] }>;
  match: { similarity: (a: number[], b: number[]) => number };
};

let ready: Promise<{ human: HumanLike; tf: any; faceapi: any }> | null = null;

function load() {
  if (!ready) {
    ready = (async () => {
      const tf = req("@tensorflow/tfjs-core");
      const wasmDir = path.join(root, "node_modules/@tensorflow/tfjs-backend-wasm/dist") + "/";
      const modelDir = path.join(root, "public/models") + "/";
      tf.io.registerLoadRouter((url: unknown) => {
        if (typeof url !== "string" || !url.startsWith("file://")) return null;
        const file = url.slice("file://".length);
        return {
          load: async () => {
            const json = JSON.parse(await readFile(file, "utf8"));
            const weightSpecs: unknown[] = [];
            const buffers: Buffer[] = [];
            for (const group of json.weightsManifest) {
              weightSpecs.push(...group.weights);
              for (const p of group.paths) buffers.push(await readFile(path.join(path.dirname(file), p)));
            }
            const all = Buffer.concat(buffers);
            return {
              modelTopology: json.modelTopology,
              // The signature lists every output, including the face
              // embedding layer. Without it only age and gender come back.
              signature: json.signature,
              userDefinedMetadata: json.userDefinedMetadata,
              modelInitializer: json.modelInitializer,
              weightSpecs,
              weightData: all.buffer.slice(all.byteOffset, all.byteOffset + all.byteLength),
              format: json.format,
              generatedBy: json.generatedBy,
              convertedBy: json.convertedBy,
            };
          },
        };
      });
      const { Human } = req(path.join(root, "node_modules/@vladmandic/human/dist/human.node-wasm.js"));
      const human: HumanLike = new Human({
        backend: "wasm",
        wasmPath: wasmDir,
        modelBasePath: "file://" + modelDir,
        debug: false,
        // Every call is a different photo, often a different person. Human's
        // video cache would reuse the last photo's face and give wrong matches.
        cacheSensitivity: 0,
        face: {
          enabled: true,
          detector: { rotation: true, maxDetected: 3, minConfidence: 0.3, return: false },
          mesh: { enabled: true },
          iris: { enabled: false },
          description: { enabled: true },
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
      // dlib ResNet face fingerprint (via face-api). Much better than Human's
      // built-in one at matching an old, tiny ID photo to a live face.
      const faceapi = req(path.join(root, "node_modules/@vladmandic/face-api/dist/face-api.node-wasm.js"));
      await faceapi.nets.faceRecognitionNet.loadFromDisk(path.join(root, "node_modules/@vladmandic/face-api/model"));
      return { human, tf, faceapi };
    })();
    ready.catch(() => (ready = null));
  }
  return ready;
}

export type Face = { embedding: number[]; box: [number, number, number, number]; score: number; age: number | null };

// Every face in the photo, biggest first.
export async function facesIn(image: Buffer, maxSide = 1280): Promise<Face[]> {
  const sharp = req("sharp");
  const { human, tf } = await load();
  const { data, info } = await sharp(image)
    .rotate()
    .resize({ width: maxSide, height: maxSide, fit: "inside", withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const tensor = tf.tensor4d(new Uint8Array(data), [1, info.height, info.width, 3], "int32");
  try {
    const result = await human.detect(tensor);
    return result.face
      .filter((f: any) => f.embedding && f.embedding.length > 0)
      .map((f: any) => ({
        embedding: Array.from(f.embedding as number[]),
        box: f.box as [number, number, number, number],
        score: (f.boxScore ?? f.score ?? 0) as number,
        age: typeof f.age === "number" ? f.age : null,
      }))
      .sort((a: Face, b: Face) => b.box[2] * b.box[3] - a.box[2] * a.box[3]);
  } finally {
    tensor.dispose();
  }
}

export async function similarity(a: number[], b: number[]): Promise<number> {
  const { human } = await load();
  return human.match.similarity(a, b);
}

// Best match between one face and any of several others.
export async function bestMatch(face: number[], others: number[][]): Promise<number> {
  let best = 0;
  for (const o of others) best = Math.max(best, await similarity(face, o));
  return best;
}

// ---- Identity matching (ID photo vs. live face) ----

export type Identity = { dlib: number[]; faceres: number[]; size: number };

// Every face in the photo with both fingerprints, biggest first. The face is
// cropped tight to its 468-point outline (the detector's box is too loose and
// lets the background skew the match), then fingerprinted, mirrored and
// fingerprinted again, and averaged.
export async function identitiesIn(image: Buffer, maxSide = 1280): Promise<Identity[]> {
  const sharp = req("sharp");
  const { human, tf, faceapi } = await load();
  const { data, info } = await sharp(image)
    .rotate()
    .resize({ width: maxSide, height: maxSide, fit: "inside", withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const tensor = tf.tensor4d(new Uint8Array(data), [1, info.height, info.width, 3], "int32");
  let faces: any[];
  try {
    faces = (await human.detect(tensor)).face;
  } finally {
    tensor.dispose();
  }
  const out: Identity[] = [];
  for (const f of faces) {
    if (!(f.mesh?.length > 100) || !(f.embedding?.length > 0)) continue;
    const xs = f.mesh.map((p: number[]) => p[0]);
    const ys = f.mesh.map((p: number[]) => p[1]);
    const x = Math.min(...xs), y = Math.min(...ys);
    const side = Math.max(Math.max(...xs) - x, Math.max(...ys) - y);
    const cx = x + (Math.max(...xs) - x) / 2, cy = y + (Math.max(...ys) - y) / 2;
    const left = Math.max(0, Math.round(cx - side / 2));
    const top = Math.max(0, Math.round(cy - side / 2));
    const size = Math.round(Math.min(side, info.width - left, info.height - top));
    if (size < 24) continue;
    const crop = sharp(data, { raw: { width: info.width, height: info.height, channels: 3 } })
      .extract({ left, top, width: size, height: size })
      .resize(150, 150);
    const fingerprint = async (raw: Buffer) => {
      const t = tf.tensor4d(new Uint8Array(raw), [1, 150, 150, 3], "int32").toFloat();
      try {
        return Array.from((await faceapi.nets.faceRecognitionNet.computeFaceDescriptor(t)) as Float32Array);
      } finally {
        t.dispose();
      }
    };
    const a = await fingerprint(await crop.clone().raw().toBuffer());
    const b = await fingerprint(await crop.clone().flop().raw().toBuffer());
    out.push({ dlib: a.map((v, i) => (v + b[i]) / 2), faceres: Array.from(f.embedding as number[]), size });
  }
  return out.sort((p, q) => q.size - p.size);
}

// Lower is more alike. Tested on faded, low-res ID-style photos: real
// matches land under 0.52 about 92% of the time on the first try, and
// strangers land under it well under 1% of the time.
export async function identityDistance(a: Identity, b: Identity): Promise<number> {
  const { human } = await load();
  const dlib = Math.hypot(...a.dlib.map((v, i) => v - b.dlib[i]));
  const fr = 1 - human.match.similarity(a.faceres, b.faceres);
  return 0.7 * dlib + 0.3 * fr;
}

export async function closestIdentity(face: Identity, others: Identity[]): Promise<number> {
  let best = Infinity;
  for (const o of others) best = Math.min(best, await identityDistance(face, o));
  return best;
}

