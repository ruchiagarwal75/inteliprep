import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { filledBlocks, SegmentedBar } from "./segmented-bar";
it("ships the licensed, self-hosted font files with their verified bytes", () => {
  expect(
    execFileSync(process.execPath, ["scripts/verify-play-fonts.mjs"], {
      encoding: "utf8",
    }),
  ).toContain("Play fonts verified");
});
it("fills one whole XP block at each boundary without changing server values", () => {
  for (const [xp, count] of [
    [0, 0],
    [9, 0],
    [10, 1],
    [99, 9],
    [100, 10],
  ])
    expect(filledBlocks(xp, 100, 10)).toBe(count);
});
it("keeps correct, wrong and empty outcomes distinct in five visible blocks", () => {
  const html = renderToStaticMarkup(
    createElement(SegmentedBar, {
      states: ["correct", "wrong", "empty", "empty", "empty"],
      label: "Round progress",
      value: 2,
      max: 5,
    }),
  );
  expect(html.match(/data-pixel-block/gu)).toHaveLength(5);
  expect(html).toContain('data-state="wrong"');
  expect(html).toContain('aria-valuenow="2"');
});
