import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { parsePrimerMarkdown } from "./parse-primer.mjs";
import { courseTopicSchema } from "./definition";
import { courseTopic } from "./content";
import { startRoundInputSchema } from "../public";
it("compiles all supplied primer prose, eight question titles and authored feedback", () => {
  const source = readFileSync(
    "docs/play-content/rag-course/topic-0-primer.md",
    "utf8",
  );
  const primer = courseTopicSchema.parse(parsePrimerMarkdown(source));
  expect(primer).toEqual(courseTopic(0));
  expect(primer.slides).toHaveLength(10);
  expect(primer.questions.map((q) => q.title)).toEqual([
    "Why RAG",
    "Open book",
    "Fresh docs",
    "Fine-tune or RAG",
    "Two models",
    "Meaning match",
    "Count the vectors",
    "Every question",
  ]);
  expect(primer.questions[6]).toMatchObject({
    type: "math",
    options: ["12,000", "1,000", "1,012", "120,000"],
  });
  expect(() =>
    parsePrimerMarkdown(source.replace("- ✓ 12,000", "- 12,000")),
  ).toThrow();
});
it("accepts zero only for a RAG course level round at the request boundary", () => {
  const input = {
    topic: "rag-course",
    level: 0,
    mode: "level",
    requestId: crypto.randomUUID(),
    timeZone: "UTC",
  };
  expect(startRoundInputSchema.safeParse(input).success).toBe(true);
  expect(
    startRoundInputSchema.safeParse({ ...input, topic: "rag" }).success,
  ).toBe(false);
});
