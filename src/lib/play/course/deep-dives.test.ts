import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { parseCourseSlidesMarkdown } from "./parse-slides.mjs";
import { courseSlideSchema } from "./slides-public";
import { ragCourse } from "./content";
import { CourseDeepDive } from "@/components/play/course-deep-dive";

it("keeps short teaching separate from optional examples, diagrams and HTTPS references", () => {
  const [raw] = parseCourseSlidesMarkdown(
    "## S1. Evidence\nA short **core**.\n\n#### Deep dive: Follow a claim\nA worked example.\n\n1. Find the source\n2. Check support\n\nDiagram: eval-case\n\nRead more: [Original study](https://arxiv.org/abs/2005.11401)\n",
  );
  const slide = courseSlideSchema.parse(raw);
  expect(slide.body).toEqual([
    { kind: "paragraph", text: "A short **core**." },
  ]);
  expect(slide.deepDive).toMatchObject({
    title: "Follow a claim",
    diagram: "eval-case",
    references: [
      { title: "Original study", url: "https://arxiv.org/abs/2005.11401" },
    ],
  });
  if (!slide.deepDive) throw Error("Missing teaching example");
  const html = renderToStaticMarkup(
    createElement(CourseDeepDive, { content: slide.deepDive }),
  );
  expect(html).toContain("<details");
  expect(html).not.toContain(" open=");
  expect(html).toContain("<summary>");
  expect(html).toContain('rel="noopener noreferrer"');
  expect(html).toContain('data-course-diagram="eval-case"');
});

it("rejects malformed notes and unsafe links while accepting older saved teaching payloads", () => {
  const old = {
    title: "Original",
    body: [{ kind: "paragraph", text: "Still readable." }],
  };
  expect(courseSlideSchema.parse(old)).toEqual(old);
  const prefix = "## S1. Core\nMain point.\n\n#### Deep dive: Example\n";
  expect(() => parseCourseSlidesMarkdown(prefix)).toThrow("teaching content");
  expect(() =>
    parseCourseSlidesMarkdown(
      prefix + "First.\n#### Deep dive: Duplicate\nSecond.",
    ),
  ).toThrow("at most one");
  expect(() =>
    parseCourseSlidesMarkdown(
      prefix + "Example.\nRead more: [Link](javascript:alert(1))",
    ),
  ).toThrow("HTTPS");
  expect(
    courseSlideSchema.safeParse({
      ...old,
      deepDive: {
        title: "Unsafe",
        body: old.body,
        references: [{ title: "Link", url: "http://example.com" }],
      },
    }).success,
  ).toBe(false);
  expect(
    courseSlideSchema.safeParse({
      ...old,
      deepDive: {
        title: "Unknown diagram",
        body: old.body,
        diagram: "unregistered",
      },
    }).success,
  ).toBe(false);
});

it("gives every topic practical depth without moving the existing slides or quiz references", () => {
  expect(ragCourse.map((topic) => topic.slides.length)).toEqual([
    10, 13, 13, 12, 12, 12, 12, 12, 12, 12,
  ]);
  expect(ragCourse.map((topic) => topic.questions.length)).toEqual([
    8, 7, 10, 10, 10, 10, 10, 10, 10, 10,
  ]);
  for (const topic of ragCourse) {
    const notes = topic.slides.flatMap((slide) =>
      slide.deepDive ? [slide.deepDive] : [],
    );
    expect(notes.length).toBeGreaterThanOrEqual(4);
    for (const slide of topic.slides) {
      const core = slide.body
        .flatMap((block) =>
          block.kind === "paragraph" ? [block.text] : block.items,
        )
        .join(" ");
      expect(core.split(/\s+/u).length).toBeLessThanOrEqual(120);
      expect(core).not.toContain("####");
    }
    for (const note of notes) {
      const text = note.body
        .flatMap((block) =>
          block.kind === "paragraph" ? [block.text] : block.items,
        )
        .join(" ");
      expect(text.split(/\s+/u).length).toBeLessThanOrEqual(140);
      expect(text).not.toContain("Read more:");
      expect(text).not.toContain("—");
    }
  }
});
