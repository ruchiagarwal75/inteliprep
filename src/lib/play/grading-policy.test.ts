import { expect, it } from "vitest";
import { needsAiGrade } from "./grading-policy";
import { mathFixture, probeFixture, tradeFixture } from "./fixtures/drills";
it("charges only actual AI grading requests", () => {
  expect(
    needsAiGrade(mathFixture, { type: "math", value: 1, unit: "GB" }),
  ).toBe(false);
  expect(
    needsAiGrade(probeFixture, { type: "pick_probe", text: "I don't know" }),
  ).toBe(false);
  expect(
    needsAiGrade(probeFixture, {
      type: "pick_probe",
      text: "How do cached permissions expire?",
    }),
  ).toBe(true);
  expect(
    needsAiGrade(tradeFixture, {
      type: "tradeoff",
      decision: "Use overlap",
      reason: "Keep the parent section for context",
    }),
  ).toBe(true);
});
