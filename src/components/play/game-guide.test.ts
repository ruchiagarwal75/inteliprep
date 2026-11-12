import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { GameGuide } from "./game-guide";
it("uses the supplied pixel head for all five guide poses without adding controls", () => {
  for (const pose of [
    "idle",
    "cheer",
    "encourage",
    "thinking",
    "celebrate",
  ] as const) {
    const html = renderToStaticMarkup(createElement(GameGuide, { pose }));
    expect(html).toContain(`data-pose="${pose}"`);
    expect(html).toContain("data-pixel-sprite");
    expect(html).toContain('shape-rendering="crispEdges"');
    expect(html).not.toContain('class="mm-svg"');
    expect(html).not.toContain("<button");
    expect(html).toContain('aria-hidden="true"');
  }
});
