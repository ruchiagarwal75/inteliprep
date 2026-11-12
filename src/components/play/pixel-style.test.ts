import { readFile, readdir } from "node:fs/promises";
import { expect, it } from "vitest";
it("resolves every pixel palette token used by Play styling", async () => {
  async function cssIn(dir: string): Promise<string[]> {
    const entries = await readdir(dir, { withFileTypes: true });
    return (
      await Promise.all(
        entries.map(async (entry) =>
          entry.isDirectory()
            ? cssIn(`${dir}/${entry.name}`)
            : entry.name.endsWith(".css")
              ? [await readFile(`${dir}/${entry.name}`, "utf8")]
              : [],
        ),
      )
    ).flat();
  }
  const css = (await cssIn("src")).join("\n");
  const used = new Set(
    [...css.matchAll(/var\((--pixel-[a-z-]+)/g)].map((match) => match[1]),
  );
  const defined = new Set(
    [...css.matchAll(/(--pixel-[a-z-]+)\s*:/g)].map((match) => match[1]),
  );
  expect([...used].filter((name) => !defined.has(name))).toEqual([]);
});
