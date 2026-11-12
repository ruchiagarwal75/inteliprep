import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { parseCourseSlidesMarkdown, parseSlideBody } from "./parse-slides.mjs";
import { courseSlideSchema } from "./slides-public";
import { SlideBody } from "@/components/play/slide-body";

it("keeps all 13 slide titles and source paragraphs, lists and bold wording", () => {
  const source = readFileSync(
    "docs/play-content/rag-course/topic-1-slides-v2.md",
    "utf8",
  );
  const slides = parseCourseSlidesMarkdown(source);
  expect(slides).toHaveLength(13);
  expect(slides.map((slide) => slide.title)).toEqual([
    "Why ingestion decides answer quality",
    "The ingestion pipeline",
    "Parsing: every format breaks differently",
    "Cleaning and deduplication",
    "Why we chunk at all",
    "Chunk size and overlap",
    "Chunking strategies",
    "Respect the structure",
    "Small-to-big retrieval",
    "Metadata on every chunk",
    "Keeping the index fresh",
    "Deletes and permission changes",
    "Interview checklist",
  ]);
  const sections = source.split(/^## S\d+\. .+\n/mu).slice(1);
  for (const [index, slide] of slides.entries()) {
    const original = sections[index]
      .split("\n")
      .filter((line) => !line.startsWith("Diagram:"))
      .map((line) => line.replace(/^(?:- |\d+\. )/u, ""))
      .join(" ")
      .replace(/\s+/gu, " ")
      .trim();
    const compiled = slide.body
      .flatMap((block) =>
        block.kind === "paragraph" ? [block.text] : block.items,
      )
      .join(" ");
    expect(compiled).toBe(original);
    expect(courseSlideSchema.safeParse(slide).success).toBe(true);
  }
});
it("renders only supported formatting and escapes markup", () => {
  const body = courseSlideSchema.parse({
    title: "Safe",
    body: parseSlideBody(
      "A **bold** point.\n\n- First\n- Second\n\n1. One\n2. Two\n\n<script>doNotRun()</script>",
    ),
  }).body;
  const html = renderToStaticMarkup(createElement(SlideBody, { blocks: body }));
  expect(html).toContain("<strong>bold</strong>");
  expect(html).toContain("<ul><li>First</li><li>Second</li></ul>");
  expect(html).toContain("<ol><li>One</li><li>Two</li></ol>");
  expect(html).toContain("&lt;script&gt;");
  expect(html).not.toContain("<script>");
  expect(() => parseCourseSlidesMarkdown("## S2. Skipped\nBody")).toThrow(
    "numbered in order",
  );
});
