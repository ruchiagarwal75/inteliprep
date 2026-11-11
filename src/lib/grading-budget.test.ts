import { expect, it } from "vitest";
import { maxDuration } from "@/app/api/interview/end/route";
import {
  gradingModelBudgetMs,
  SCORECARD_FETCH_TIMEOUT_MS,
  INTERVIEW_SESSION_LOCK_MS,
} from "@/lib/grading-budget";
it("preserves the core provider budget", () => {
  expect(gradingModelBudgetMs("core")).toBe(120_000);
});
it.each(["core", "genai"] as const)(
  "keeps every %s deadline within the enclosing request and shared lease",
  (track) => {
    expect(gradingModelBudgetMs(track)).toBeLessThan(
      SCORECARD_FETCH_TIMEOUT_MS,
    );
    expect(SCORECARD_FETCH_TIMEOUT_MS).toBeLessThan(maxDuration * 1000);
    expect(maxDuration * 1000).toBeLessThan(INTERVIEW_SESSION_LOCK_MS);
  },
);
