import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { GameGuide } from "./game-guide";
it("reuses the original character SVG for all five guide poses without adding controls", () => {
  for (const pose of [
    "idle",
    "cheer",
    "encourage",
    "thinking",
    "celebrate",
  ] as const) {
    const html = renderToStaticMarkup(createElement(GameGuide, { pose }));
    expect(html).toContain(`data-pose="${pose}"`);
    expect(html).toContain('class="mm-svg"');
    expect(html).not.toContain("<button");
    expect(html).toContain('aria-hidden="true"');
  }
});
