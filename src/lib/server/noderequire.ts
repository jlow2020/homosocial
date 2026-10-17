import "server-only";
import { createRequire } from "node:module";
import path from "node:path";

// Plain Node require for heavy native/wasm packages, so the bundler leaves
// them alone. Inside Next's server bundle that's __non_webpack_require__;
// in plain Node scripts it's createRequire.
declare const __non_webpack_require__: NodeJS.Require | undefined;

export const nodeRequire: NodeJS.Require =
  typeof __non_webpack_require__ === "function"
    ? __non_webpack_require__
    : createRequire(path.join(process.cwd(), "package.json"));
