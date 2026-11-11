import { expect, it } from "vitest";
import { briefDefaults } from "@/lib/brief-preferences";
import { savedFixture } from "@/lib/fixtures/saved-interview-test";
import { scorecardFixture } from "@/lib/fixtures/scorecard-test";
import { savedInterviewSummary } from "@/lib/saved-interview";
const problems = ["single-server-scaling", "url-shortener", "rate-limiter"].map(
  (problemId) => ({
    problemId,
    title: problemId,
    summary: problemId,
    levels: ["mid", "senior", "staff"] as ("mid" | "senior" | "staff")[],
  }),
);
it("uses the previous level and the stored scorecard suggestion", () => {
  const latest = {
    ...savedFixture(),
    hasEnded: true,
    scorecard: {
      ...scorecardFixture(),
      nextPractice: {
        ...scorecardFixture().nextPractice,
        problemId: "rate-limiter",
      },
    },
    interview: { ...savedFixture().interview, level: "senior" as const },
  };
  expect(
    briefDefaults(problems, latest, savedInterviewSummary(latest)),
  ).toMatchObject({
    problemId: "rate-limiter",
    level: "senior",
    durationMinutes: 45,
  });
  expect(
    briefDefaults(
      problems,
      latest,
      savedInterviewSummary(latest),
      "staff",
      "url-shortener",
    ),
  ).toMatchObject({ problemId: "url-shortener", level: "staff" });
});
it("falls back safely for new browsers, invalid preferences and unavailable old suggestions", () => {
  expect(briefDefaults(problems)).toMatchObject({
    problemId: "single-server-scaling",
    level: "mid",
  });
  expect(
    briefDefaults(problems, undefined, undefined, "unknown", "made-up"),
  ).toMatchObject({ problemId: "single-server-scaling", level: "mid" });
});
it("keeps the readiness prompt's chosen interview level", () => {
  expect(
    briefDefaults(
      problems,
      undefined,
      undefined,
      "mid",
      "url-shortener",
      undefined,
      undefined,
      "senior",
    ).level,
  ).toBe("senior");
  expect(
    briefDefaults(
      problems,
      undefined,
      undefined,
      "mid",
      "url-shortener",
      undefined,
      undefined,
      "invalid",
    ).level,
  ).toBe("mid");
});
