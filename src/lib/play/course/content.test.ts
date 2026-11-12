import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { parseCourseMarkdown } from "./parse.mjs";
import { ragCourse } from "./content";
const source = readFileSync(
  "docs/play-content/rag-course/topics-1-3.md",
  "utf8",
);
it("compiles the source without rewriting any slides, questions or feedback", () => {
  expect(parseCourseMarkdown(source)).toEqual(ragCourse);
  expect(ragCourse).toHaveLength(3);
  for (const topic of ragCourse) {
    expect(topic.slides).toHaveLength(5);
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
