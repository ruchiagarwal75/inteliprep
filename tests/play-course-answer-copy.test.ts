import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { AnswerSheet } from "@/components/play/answer-sheet";
import { courseDrills } from "@/lib/play/course/drills";
import { gradeDrill } from "@/lib/play/grade";
import { createVariant, publicQuestion } from "@/lib/play/question";
import { drillAnswerSchema } from "@/lib/play/public";
it("replaces the retired course retry nudge with the teaching-slide action, including old saved grades", async () => {
  const drill = courseDrills[0];
  if (drill.type !== "spot_flaw") throw Error("Expected choice");
  const variant = createVariant(drill),
    question = publicQuestion(
      drill,
      variant,
      {
        id: crypto.randomUUID(),
        ordinal: 0,
        startedAt: new Date().toISOString(),
      },
      8,
    );
  const wrong = variant.order.findIndex(
    (source) => source !== drill.correctIndex,
  );
  const grade = await gradeDrill(
    drill,
    variant,
    drillAnswerSchema.parse({ type: "spot_flaw", option: String(wrong) }),
  );
  expect(grade.feedback).toBe("");
  const result = { ...grade, points: 0, timeMs: 1000, badgesEarned: [] };
  for (const stored of [
    result,
    { ...result, feedback: "Take another look." },
  ]) {
    const before = structuredClone(stored);
    const html = renderToStaticMarkup(
      createElement(AnswerSheet, {
        question,
        result: stored,
        onNext: () => {},
        onSlides: () => {},
      }),
    );
    expect(html).not.toContain("Take another look.");
    expect(html.replace(/<[^>]*>/gu, " ").replace(/\s+/gu, " ")).toContain(
      "See slide 1",
    );
    expect(stored).toEqual(before);
  }
});
