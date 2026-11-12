import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { parseCourseMarkdown } from "./parse.mjs";
import { parseCourseSlidesMarkdown } from "./parse-slides.mjs";
import { ragCourse } from "./content";
const source = readFileSync(
  "docs/play-content/rag-course/topics-1-3.md",
  "utf8",
);
it("compiles the supplied lesson and keeps every question and the other topics unchanged", () => {
  const original = parseCourseMarkdown(source);
  expect(original.slice(1)).toEqual(ragCourse.slice(1));
  expect(original[0].questions).toEqual(ragCourse[0].questions);
  expect(
    parseCourseSlidesMarkdown(
      readFileSync("docs/play-content/rag-course/topic-1-slides-v2.md", "utf8"),
      { 2: "pipeline", 6: "overlap", 8: "split-table", 9: "small-to-big" },
    ),
  ).toEqual(ragCourse[0].slides);
  expect(ragCourse).toHaveLength(3);
  for (const topic of ragCourse) {
    expect(topic.slides).toHaveLength(topic.level === 1 ? 13 : 5);
    expect(topic.questions).toHaveLength(7);
    expect(new Set(topic.questions.map((q) => q.id)).size).toBe(7);
    for (const q of topic.questions) {
      expect(q.options).toHaveLength(4);
      expect(q.options[q.correctIndex]).toBeTruthy();
      expect(q.keyIdea).toBeTruthy();
      expect(q.why).toBeTruthy();
    }
  }
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
  ).toEqual(ragCourse.map((topic) => [topic.level, topic.title]));
  expect(RAG_COURSE_NODES.filter((node) => !node.available)).toHaveLength(6);
  for (const node of RAG_COURSE_NODES)
    expect(Object.keys(node).sort()).toEqual(["available", "level", "title"]);
});
