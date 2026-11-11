import { expect, it } from "vitest";
import { gradingAssessmentSchema, scorecardSchema } from "@/lib/scorecard";
it("caps new grading rationales below thirty words", () => {
  const rationale = gradingAssessmentSchema.shape.areas.element.shape.rationale;
  expect(rationale.safeParse(Array(29).fill("word").join(" ")).success).toBe(
    true,
  );
  expect(rationale.safeParse(Array(30).fill("word").join(" ")).success).toBe(
    false,
  );
});
it("continues to read older saved scorecards with longer rationales", () => {
  expect(
    scorecardSchema.shape.areas.element.shape.rationale.safeParse(
      Array(50).fill("word").join(" "),
    ).success,
  ).toBe(true);
});
