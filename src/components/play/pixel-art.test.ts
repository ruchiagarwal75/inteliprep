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
it("keeps every original face and idle pixel while outlining the curls in each pose", () => {
  for (const [pose, grid] of Object.entries(MASCOT_GRIDS)) {
    const top = pose === "celebrate" ? 3 : 5;
    PIXEL_GRIDS.mascotIdle
      .slice(0, pose === "idle" ? 20 : 11)
      .forEach((row, y) =>
        [...row].forEach((key, x) => {
          if (key !== ".") expect(grid[y + top][x + 6]).toBe(key);
        }),
      );
    for (const y of [top + 3, top + 6, top + 9]) {
      expect(grid[y][5]).toBe("K");
      expect(grid[y][22]).toBe("K");
    }
    expect(grid[top + 3][4]).toBe("O");
    expect(grid[top + 3][23]).toBe("O");
    expect(grid.some((row) => row.includes("O"))).toBe(true);
  }
});
it("rejects broken source grids instead of silently altering artwork", () => {
  expect(() => compileSprite(["YY", "Y"], { Y: "gold" })).toThrow();
  expect(() => compileSprite(["YQ"], { Y: "gold" })).toThrow();
});
