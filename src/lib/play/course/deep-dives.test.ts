import { createElement } from "react";
import { createHash } from "node:crypto";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { parseCourseSlidesMarkdown } from "./parse-slides.mjs";
import { courseSlideSchema, type CourseSlide } from "./slides-public";
import { ragCourse } from "./content";
import compiled from "./rag.json";
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
  expect(
    ragCourse.map(
      (topic) => topic.slides.filter((slide) => slide.deepDive).length,
    ),
  ).toEqual([8, 12, 12, 11, 11, 11, 11, 11, 11, 11]);
  const digest = (value: unknown) =>
    createHash("sha256").update(JSON.stringify(value)).digest("hex");
  expect(digest(compiled.map((topic) => topic.questions))).toBe(
    "962d33cd2cdfb10019772e00add393f739cb32e2df3515aa2863737658924b5e",
  );
  expect(
    digest(ragCourse.map((topic) => topic.slides.map((slide) => slide.title))),
  ).toBe("b4a0bc124a3cbe3b3fb13ed270a7f3e781a674ba571b548dc59d5d86574c175c");
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
      expect(text.split(/\s+/u).length).toBeGreaterThanOrEqual(140);
      expect(text.split(/\s+/u).length).toBeLessThanOrEqual(380);
      expect(text).not.toContain("Read more:");
      expect(text).not.toContain("—");
    }
  }
});

it("teaches embedding dimensions, similarity and the encoder's role before advanced tradeoffs", () => {
  const embedding = ragCourse[2].slides.slice(0, 3);
  const text = (value: Pick<CourseSlide, "body">) =>
    value.body
      .flatMap((block) =>
        block.kind === "paragraph" ? block.text : block.items,
      )
      .join(" ");
  expect(text(embedding[0])).toContain("coordinate");
  expect(text(embedding[0])).toContain("Meaning is distributed");
  expect(text(embedding[0])).toContain("do not guarantee better retrieval");
  expect(text(embedding[1])).toContain(
    "multiplies matching coordinates and adds them",
  );
  expect(text(embedding[1])).toContain("Normalization");
  expect(text(embedding[2])).toContain("two independent text-to-vector paths");
  expect(text(embedding[2])).toContain("may share a model");
  expect(text(embedding[2])).toContain("generative LLM");
  const details = embedding.map((slide) => {
    if (!slide.deepDive) throw Error("Missing foundation lesson");
    return text(slide.deepDive);
  });
  expect(details[0]).toContain("not a token count");
  expect(details[1]).toContain("2 / sqrt(5)");
  expect(details[2]).toContain("language-model backbone");
  const ocr = ragCourse[1].slides[2].deepDive;
  if (!ocr) throw Error("Missing OCR lesson");
  expect(text(ocr)).toContain("optical character recognition");
  expect(text(ocr)).toContain("reading order");
  const vectorTopic = ragCourse[2];
  expect(
    vectorTopic.slides
      .slice(0, 6)
      .some((slide) => /\b(?:ANN|HNSW)\b/u.test(text(slide))),
  ).toBe(false);
  expect(text(vectorTopic.slides[6])).toContain(
    "approximate nearest-neighbor search",
  );
  expect(text(vectorTopic.slides[7])).toContain(
    "hierarchical navigable small world",
  );
  expect(text(vectorTopic.slides[7])).toContain("Each node is a vector");
  const compressed = vectorTopic.slides[5];
  expect(text(compressed)).toContain("not by deleting dimensions");
  expect(text(compressed)).toContain("3,072 bytes");
  expect(text(compressed)).toContain("768 bytes");
  if (!compressed.deepDive) throw Error("Missing quantization lesson");
  expect(text(compressed.deepDive)).toContain("codebook");
  expect(text(compressed.deepDive)).toContain("Rounding the printed number");
});
