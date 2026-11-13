import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { parseCourseMarkdown } from "./parse.mjs";
import { parseCourseSlidesMarkdown } from "./parse-slides.mjs";
import { ragCourse } from "./content";
const source = readFileSync(
  "docs/play-content/rag-course/topics-1-3.md",
  "utf8",
);
it("keeps Topic 1 slides exactly as authored and compiles the versioned topic sizes", () => {
  expect(
    parseCourseSlidesMarkdown(
      readFileSync("docs/play-content/rag-course/topic-1-slides-v2.md", "utf8"),
      { 2: "pipeline", 6: "overlap", 8: "split-table", 9: "small-to-big" },
    ),
  ).toEqual(ragCourse[1].slides);
  expect(
    ragCourse.map((topic) => [
      topic.level,
      topic.slides.length,
      topic.questions.length,
    ]),
  ).toEqual([
    [0, 10, 8],
    [1, 13, 7],
    [2, 13, 10],
    [3, 12, 10],
    [4, 12, 10],
    [5, 12, 10],
    [6, 12, 10],
    [7, 12, 10],
    [8, 12, 10],
    [9, 12, 10],
  ]);
});
it("rejects missing options, duplicate correct choices and missing feedback", () => {
  for (const changed of [
    source.replace("- Vector databases can't store them\n", ""),
    source.replace(
      "- Vector databases can't store them",
      "- ✓ Vector databases can't store them",
    ),
    source.replace(/^Why: .+\n/mu, ""),
  ])
    expect(() => parseCourseMarkdown(changed)).toThrow();
});

it("keeps playable path nodes aligned with authored course topics", async () => {
  const { RAG_COURSE_NODES } = await import("./metadata");
  expect(
    RAG_COURSE_NODES.filter((node) => node.available).map((node) => [
      node.level,
      node.title,
    ]),
  ).toEqual(
    ragCourse
      .filter((topic) =>
        RAG_COURSE_NODES.some(
          (node) => node.level === topic.level && node.available,
        ),
      )
      .map((topic) => [topic.level, topic.title]),
  );
  expect(RAG_COURSE_NODES.filter((node) => !node.available)).toHaveLength(3);
  for (const node of RAG_COURSE_NODES)
    expect(Object.keys(node).sort()).toEqual(
      node.level <= 6
        ? ["available", "level", "minutes", "title"]
        : ["available", "level", "title"],
    );
});
