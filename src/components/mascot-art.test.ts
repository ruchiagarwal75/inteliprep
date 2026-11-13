import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import Mascot from "@/components/mascot-art/Mascot";
import { HomeMascot, ResultsMascot } from "@/components/mascot-moments";
import { MascotAppearance } from "@/components/mascot-appearance";
import { scorecardFixture } from "@/lib/fixtures/scorecard-test";

it.each([
  [
    "mascotArt.ts",
    "d48c5794505c3871abe20310d3fb016b68a3a120f8f7de9ba3433b345b7525b5",
  ],
  [
    "Mascot.tsx",
    "fcd36c68c123b5a71a7485a6a225ad2ad03f6f77c5f31895a3371b61da209054",
  ],
  [
    "mascot.css",
    "72fd8b4e0bec76133b227dbfc01759edff3b78e2d1b9d3dedb8d828ade8b9bac",
  ],
])("preserves supplied %s artwork, allowing color tokens", (file, hash) => {
  const original = readFileSync(
    `src/components/mascot-art/${file}`,
    "utf8",
  ).split("\n/** Static brand face")[0];
  // Only SVG paints moved to theme.css. The normalized hash still checks every path and pose.
  const source =
    file === "mascotArt.ts"
      ? original
          .replace(/var\(--mascot-color-([a-f0-9]+)\)/gu, "#$1")
          .replace(/#[a-f0-9]{3,8}\b/giu, (color) => color.toLowerCase())
      : original;
  expect(createHash("sha256").update(source).digest("hex")).toBe(hash);
});
it("uses the supplied wave, typing and done artwork", () => {
  const render = (pose: "wave" | "working" | "done") =>
    renderToStaticMarkup(createElement(Mascot, { pose }));
  expect(render("wave")).toContain('class="mm-wave"');
  expect(render("working")).toContain('class="mm-ty"');
  expect(render("done")).toContain('class="mm-cheer"');
  expect(render("wave")).toContain('stroke="var(--mascot-color-e8b84a)"');
  expect(render("wave")).toContain('viewBox="0 0 220 240"');
});
it("renders nothing before Home and results are ready on the client", () => {
  expect(renderToStaticMarkup(createElement(HomeMascot))).toBe("");
  expect(
    renderToStaticMarkup(createElement(ResultsMascot, { ready: true })),
  ).toBe("");
  expect(
    renderToStaticMarkup(
      createElement(ResultsMascot, {
        ready: false,
        scorecard: scorecardFixture(),
      }),
    ),
  ).toBe("");
});
it("keeps the artwork decorative and adds gentle behavior without redrawing it", () => {
  const html = renderToStaticMarkup(
    createElement(MascotAppearance, {
      pose: "done",
      gentle: true,
      preview: true,
      onDone: vi.fn(),
    }),
  );
  expect(html).toContain('aria-hidden="true"');
  expect(html).toContain('focusable="false"');
  expect(html).toContain("mascot-gentle");
  expect(html).not.toContain("tabindex");
  expect(html).not.toContain("<button");
});
