import { expect, it } from "vitest";
import { courseDrills } from "./drills";
import { ragCourse } from "./content";
import { createVariant, publicQuestion } from "../question";
import { gradeDrill } from "../grade";
import { drillAnswerSchema } from "../public";
it("keeps every course question a shuffled choice with no pre-answer solution fields", async () => {
  expect(courseDrills).toHaveLength(95);
  for (const drill of courseDrills) {
    if (drill.type !== "spot_flaw" || !drill.course)
      throw Error("Course requires choices");
    const variant = createVariant(drill),
      question = publicQuestion(
        drill,
        variant,
        {
          id: crypto.randomUUID(),
          ordinal: 0,
          startedAt: new Date().toISOString(),
        },
        7,
      );
    expect(question.type).toBe("spot_flaw");
    expect(JSON.stringify(question)).not.toMatch(
      /"(?:correctIndex|why|keyIdea|ifWrong|rubric|expected)":/,
    );
    if (question.type !== "spot_flaw") throw Error("Expected public choices");
    expect(question.options.map((o) => o.text).sort()).toEqual(
      [...drill.options].sort(),
    );
    const position = variant.order.indexOf(drill.correctIndex);
    const result = await gradeDrill(
      drill,
      variant,
      drillAnswerSchema.parse({ type: "spot_flaw", option: String(position) }),
    );
    expect(result.correct).toBe(true);
    expect(result.expected).toBe(drill.options[drill.correctIndex]);
    expect(result.keyIdea).toBe(drill.course.keyIdea);
  }
});
it("keeps the compiled course feedback guarded by the browser-bundle scanner", async () => {
  const { assertPrivatePlayAbsent } =
    await import("../../../../scripts/check-private-play.mjs");
  for (const topic of ragCourse)
    for (const q of topic.questions) {
      expect(() => assertPrivatePlayAbsent(q.keyIdea)).toThrow(/Private Play/);
      expect(() => assertPrivatePlayAbsent(q.why)).toThrow(/Private Play/);
    }
});
