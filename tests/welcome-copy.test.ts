import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WELCOME_PANELS } from "@/lib/play/welcome-copy";
import { WelcomeScene } from "@/components/play/welcome-scene";
it("keeps the four panels and every dialogue line within its readable limit", () => {
  expect(WELCOME_PANELS.map((panel) => panel.title)).toEqual([
    "WELCOME, ENGINEER",
    "YOUR FIRST WORLD",
    "MEET THE INTERVIEWER",
    "YOUR QUEST BEGINS",
  ]);
  for (const panel of WELCOME_PANELS)
    for (const beat of panel.beats) {
      const lines = beat.line.split("\n");
      expect(lines.length).toBeLessThanOrEqual(2);
      for (const line of lines) {
        expect(line.split(/\s+/u).length).toBeLessThanOrEqual(12);
        expect(line.length).toBeLessThanOrEqual(60);
        expect(line).not.toContain("\u2014");
      }
    }
  expect(WELCOME_PANELS[2].beats[2]).toEqual({
    speaker: "THE INTERVIEWER",
    line: "Show me what you'd build, and why.",
  });
});
it("reuses the supplied pixel mark, guide and shared gate without a new character", () => {
  expect(
    renderToStaticMarkup(createElement(WelcomeScene, { panel: 1 })),
  ).toContain("/brand/pixel/shardling-mark.svg");
  expect(
    renderToStaticMarkup(createElement(WelcomeScene, { panel: 3 })),
  ).toContain('data-boss-gate="closed"');
  expect(
    renderToStaticMarkup(createElement(WelcomeScene, { panel: 2 })),
  ).toContain('data-pixel-pose="cheer"');
  const final = renderToStaticMarkup(createElement(WelcomeScene, { panel: 4 }));
  expect(final).toContain('width="32"');
  expect(final).toContain('height="32"');
});
