import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { AnswerSheet } from "./answer-sheet";
import { drillQuestionSchema, drillResultSchema } from "@/lib/play/public";
import { ragCourse } from "@/lib/play/course/content";
const question = drillQuestionSchema.parse({
  type: "spot_flaw",
  attemptId: crypto.randomUUID(),
  drillId: "T1-Q1",
  topic: "rag-course",
  level: 1,
  title: "Saved question",
  prompt: "Choose an answer",
  ordinal: 0,
  total: 7,
  startedAt: new Date().toISOString(),
  serverNow: new Date().toISOString(),
  sample: false,
  courseKind: "concept",
  courseSlide: 6,
  options: ["A", "B", "C", "D"].map((text, i) => ({ id: String(i), text })),
});
const result = drillResultSchema.parse({
  correct: false,
  score: 0,
  points: 0,
  feedback: "Take another look.",
  keyIdea: "Check the chunk boundary.",
  why: "Keep enough context.",
  expected: "A coherent chunk",
  timeMs: 1000,
});
it.each([undefined, "", "   \n "])(
  "omits the feedback paragraph for an empty saved value %s",
  (ifWrong) => {
    const html = renderToStaticMarkup(
      createElement(AnswerSheet, {
        question,
        result: { ...result, ifWrong },
        onNext: () => {},
        onSlides: () => {},
      }),
    );
    expect(html).not.toContain("data-option-feedback");
    expect(html).toContain("See slide 6");
    expect(html).not.toMatch(/<p[^>]*>\s*<\/p>/u);
  },
);
it("preserves real wrong-option feedback as plain text", () => {
  const html = renderToStaticMarkup(
    createElement(AnswerSheet, {
      question,
      result: { ...result, ifWrong: "  Keep the <tag> as text.  " },
      onNext: () => {},
      onSlides: () => {},
    }),
  );
  expect(html).toContain(
    'data-option-feedback="true">Keep the &lt;tag&gt; as text.</p>',
  );
});
it("finds no missing wrong-option feedback in current Topics 1 to 3", () => {
  const missing = ragCourse
    .filter((t) => t.level >= 1 && t.level <= 3)
    .flatMap((t) =>
      t.questions.flatMap((q) =>
        q.options.flatMap((text, i) =>
          i !== q.correctIndex && !q.ifWrong[String(i)]?.trim()
            ? [{ id: q.id, text }]
            : [],
        ),
      ),
    );
  expect(missing).toEqual([]);
});
