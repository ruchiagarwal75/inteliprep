import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { PIXEL_GRIDS, PIXEL_ART, PIXEL_PALETTES } from "./pixel-art";
import { compileSprite } from "./pixel-grid";
import { MASCOT_GRIDS } from "./pixel-mascot-art";
it("preserves all seven supplied source grids exactly", () => {
  const source = [
    ...readFileSync("docs/play-content/game-pixel.md", "utf8").matchAll(
      /```\n([^`]+)\n```/gu,
    ),
  ].map((m) => m[1].split("\n"));
  expect(Object.values(PIXEL_GRIDS)).toEqual(source);
});
it("reconstructs every sprite pixel after row-run compression", () => {
  for (const name of [
    "chest",
    "star",
    "flame",
    "lock",
    "check",
    "sparkle",
  ] as const) {
    const art = PIXEL_ART[name];
    const pixels = Array.from({ length: art.height }, () =>
      Array<string>(art.width).fill("."),
    );
    for (const run of art.runs)
      for (let x = run.x; x < run.x + run.width; x++)
        pixels[run.y][x] = run.color;
    const grid = PIXEL_GRIDS[name];
    const palette: Readonly<Record<string, string>> = PIXEL_PALETTES[name];
    expect(pixels).toEqual(
      grid.map((row) => [...row].map((c) => (c === "." ? "." : palette[c]))),
    );
  }
});
it("keeps the supplied head in every pose and the whole idle character unchanged", () => {
  for (const [pose, grid] of Object.entries(MASCOT_GRIDS)) {
    const top = pose === "celebrate" ? 3 : 5;
    expect(grid.slice(top, top + 11).map((row) => row.slice(6, 22))).toEqual(
      PIXEL_GRIDS.mascotIdle.slice(0, 11),
    );
    if (pose === "idle")
      expect(grid.slice(top, top + 20).map((row) => row.slice(6, 22))).toEqual(
        PIXEL_GRIDS.mascotIdle,
      );
  }
});
it("rejects broken source grids instead of silently altering artwork", () => {
  expect(() => compileSprite(["YY", "Y"], { Y: "gold" })).toThrow();
  expect(() => compileSprite(["YQ"], { Y: "gold" })).toThrow();
});
