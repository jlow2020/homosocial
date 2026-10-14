// Copies the face models the Realness Check needs into public/models,
// so they're served from homosocial.net instead of a third-party CDN.
import { copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const src = "node_modules/@vladmandic/human/models";
const dest = "public/models";
const models = ["blazeface", "facemesh", "faceres", "emotion", "antispoof", "liveness"];

mkdirSync(dest, { recursive: true });
for (const m of models) {
  for (const ext of ["json", "bin"]) {
    copyFileSync(join(src, `${m}.${ext}`), join(dest, `${m}.${ext}`));
  }
}
console.log(`Copied ${models.length} face models to ${dest}`);
