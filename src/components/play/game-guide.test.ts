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

it("keeps sheets small and provides an explicit large sprite size for path and rewards", () => {
  const large = renderToStaticMarkup(
    createElement(GameGuide, { size: "large", message: "Ready for LV 2?" }),
  );
  const small = renderToStaticMarkup(
    createElement(GameGuide, { pose: "cheer" }),
  );
  expect(large).toContain('data-size="large"');
  expect(small).toContain('data-size="small"');
  expect(large).toContain("Ready for LV 2?");
});
