import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { BOSS_GRIDS } from "./boss-art";
import {
  BOSS_LINES,
  BOSS_PALETTE,
  InterviewerSprite,
} from "./interviewer-sprite";
import { BossGate } from "./boss-gate";
it("keeps both supplied sprite grids exact and reproducible", () => {
  execFileSync(process.execPath, ["scripts/build-boss-art.mjs", "--check"]);
  for (const grid of Object.values(BOSS_GRIDS)) {
    expect(grid).toHaveLength(32);
    expect(grid.every((row) => row.length === 32)).toBe(true);
  }
});
it("keeps supplied pigments in theme variables and dialogue short", () => {
  const source = readFileSync("docs/play-content/welcome-intro.md", "utf8");
  const theme = readFileSync("src/app/theme.css", "utf8");
  for (const row of source.matchAll(/\| `([A-Za-z])` \| (#[a-fA-F0-9]{6})/gu)) {
    const variable = BOSS_PALETTE[row[1]]?.slice(4, -1);
    expect(variable).toBeTruthy();
    expect(theme.toLowerCase()).toContain(
      `${variable}: ${row[2].toLowerCase()};`,
    );
  }
  for (const line of Object.values(BOSS_LINES)) {
    expect(line.split(/\s+/u).length).toBeLessThanOrEqual(12);
    expect(line.length).toBeLessThanOrEqual(60);
  }
});
it("uses whole-pixel scales and an open gate on defeat", () => {
  expect(
    renderToStaticMarkup(createElement(InterviewerSprite, { scale: 3 })),
  ).toContain('width="96" height="96"');
  expect(
    renderToStaticMarkup(createElement(BossGate, { open: true, scale: 4 })),
  ).toContain('data-boss-gate="open"');
  const css = readFileSync(
    "src/components/play/interviewer-sprite.module.css",
    "utf8",
  );
  expect(css).toContain("prefers-reduced-motion: reduce");
  expect(css).toContain("animation-play-state: paused");
});
