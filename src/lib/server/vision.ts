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

let ready: Promise<{ human: HumanLike; tf: any }> | null = null;

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
      return { human, tf };
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
