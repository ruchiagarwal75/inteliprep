import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { CourseDiagram } from "@/components/play/course-diagram";
import { courseTopic } from "./content";
import type { CourseDiagramKind } from "./slide-diagrams";
const diagrams: ReadonlyArray<[number, number, CourseDiagramKind]> = [
  [4, 2, "encoder-comparison"],
  [4, 3, "two-stage-pipeline"],
  [4, 6, "recall-curve"],
  [4, 8, "mmr-diversity"],
  [5, 1, "prompt-anatomy"],
  [5, 3, "lost-middle"],
  [5, 9, "injection-data"],
  [5, 10, "cached-prefix"],
  [6, 2, "model-router"],
  [6, 5, "citation-check"],
  [6, 6, "faithfulness-check"],
  [6, 8, "streaming-timeline"],
];
it.each(diagrams)(
  "maps Topic %s slide %s to its accessible, responsive %s vector diagram",
  (level, number, kind) => {
    expect(courseTopic(level)?.slides[number - 1].diagram).toBe(kind);
    const html = renderToStaticMarkup(createElement(CourseDiagram, { kind }));
    expect(html.match(/<svg /gu)).toHaveLength(2);
    expect(html).toContain('data-diagram-layout="landscape"');
    expect(html).toContain('data-diagram-layout="portrait"');
    expect(html.match(/<title>[^<]{20,}<\/title>/gu)).toHaveLength(2);
    expect(html).toMatch(/aria-label="[^"]{30,}"/u);
    expect(html).not.toMatch(
      /<image|<img|<foreignObject|https?:|<rect\b[^>]*\brx=|#[\da-fA-F]{3,8}\b|gradient/iu,
    );
  },
);
it("keeps each authored diagram meaning explicit in its labels", () => {
  const text = (kind: CourseDiagramKind) =>
    renderToStaticMarkup(createElement(CourseDiagram, { kind }));
  expect(text("encoder-comparison")).toContain("Score 0.91");
  expect(text("two-stage-pipeline")).toContain("about 80 ms");
  expect(text("recall-curve")).toContain("Good N");
  expect(text("mmr-diversity")).toContain("Without MMR");
  expect(text("prompt-anatomy")).toContain("the answer");
  expect(text("lost-middle")).toContain("Lost in the middle");
  expect(text("injection-data")).toContain("Treated as data");
  expect(text("cached-prefix")).toContain("Changes every question");
  expect(text("model-router")).toContain("20%, multi-step");
  expect(text("citation-check")).toContain("Supports the claim");
  expect(text("faithfulness-check")).toContain("regenerate");
  expect(text("streaming-timeline")).toContain("First word at 830 ms");
});
