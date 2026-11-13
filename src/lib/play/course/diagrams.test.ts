import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ragCourse } from "./content";
import { COURSE_DIAGRAMS } from "./slide-diagrams";
import { CourseDiagram } from "@/components/play/course-diagram";

it("attaches the four revised ingestion diagrams and keeps other topic diagrams", () => {
  expect(
    ragCourse.flatMap((topic) =>
      topic.slides.flatMap((slide, index) =>
        slide.diagram ? [[topic.level, index + 1, slide.diagram]] : [],
      ),
    ),
  ).toEqual([
    [0, 2, "rag-answer"],
    [0, 7, "rag-models"],
    [0, 8, "rag-two-paths"],
    [1, 2, "pipeline"],
    [1, 6, "overlap"],
    [1, 8, "split-table"],
    [1, 9, "small-to-big"],
    [2, 2, "two-tower"],
    [2, 4, "ann"],
    [3, 2, "rrf"],
  ]);
  expect(
    ragCourse.every((topic) =>
      topic.slides.every((slide) => !slide.title.endsWith(".")),
    ),
  ).toBe(true);
});
it("gives every original SVG meaningful alt text without external artwork", () => {
  for (const kind of COURSE_DIAGRAMS) {
    const html = renderToStaticMarkup(createElement(CourseDiagram, { kind }));
    expect(html).toContain('role="img"');
    expect(html).toMatch(/aria-label="[^"]{30,}"/u);
    expect(html).toContain("<svg");
    expect(html).not.toMatch(/<image|<img|http|shape-rendering="crispEdges"/u);
  }
});
