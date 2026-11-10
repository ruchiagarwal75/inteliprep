import { createRequire } from "node:module";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
const loader = createRequire(import.meta.url)(
  "../scripts/excalidraw-fonts-loader.cjs",
) as (source: string) => string;
it.each(["dev", "prod"])(
  "keeps the pinned %s font fallback local and leaves other chunks unchanged",
  (mode) => {
    const directory = resolve("node_modules/@excalidraw/excalidraw/dist", mode);
    let changed = 0;
    for (const file of readdirSync(directory).filter((file) =>
      file.endsWith(".js"),
    )) {
      const original = readFileSync(resolve(directory, file), "utf8"),
        patched = loader(original);
      if (patched !== original) {
        changed++;
        expect(patched).not.toContain("https://esm.sh/");
        expect(patched).toContain(
          'new URL("/fonts/excalidraw/", globalThis.location.origin).href',
        );
      }
    }
    expect(changed).toBe(1);
  },
);
it("fails closed when an upstream font initializer changes", () => {
  expect(() =>
    loader('init("ASSETS_FALLBACK_URL", "different initializer")'),
  ).toThrow("Review the pinned Excalidraw");
});
