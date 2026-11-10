import { cpSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
// Generated from the lockfile-pinned package; no runtime third-party CDN requests.
const target = resolve("public/fonts/excalidraw/fonts");
mkdirSync(target, { recursive: true });
cpSync(resolve("node_modules/@excalidraw/excalidraw/dist/prod/fonts"), target, {
  recursive: true,
});
