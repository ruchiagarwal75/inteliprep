import { expect, it } from "vitest";
import { reviewChange } from "./review-policy";
const now = new Date("2026-11-11T10:00:00Z");
it("spaces wrong drills by 2, 5 and 12 days, then removes a learned review", () => {
  expect(reviewChange({ correct: false, reviewing: false, now })).toEqual({
    kind: "schedule",
    step: 2,
    dueAt: "2026-11-13T10:00:00.000Z",
  });
  expect(
    reviewChange({ correct: true, reviewing: true, currentStep: 2, now }),
  ).toEqual({ kind: "schedule", step: 5, dueAt: "2026-11-16T10:00:00.000Z" });
  expect(
    reviewChange({ correct: true, reviewing: true, currentStep: 5, now }),
  ).toEqual({ kind: "schedule", step: 12, dueAt: "2026-11-23T10:00:00.000Z" });
  expect(
    reviewChange({ correct: true, reviewing: true, currentStep: 12, now }),
  ).toEqual({ kind: "remove" });
  expect(
    reviewChange({ correct: false, reviewing: true, currentStep: 12, now }),
  ).toEqual({ kind: "schedule", step: 2, dueAt: "2026-11-13T10:00:00.000Z" });
  expect(
    reviewChange({ correct: true, reviewing: false, currentStep: 2, now }),
  ).toEqual({ kind: "keep" });
});
