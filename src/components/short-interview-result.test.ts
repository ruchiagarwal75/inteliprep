import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { InterviewScorecard } from "@/components/interview-scorecard";
import { scorecardFixture } from "@/lib/fixtures/scorecard-test";
import { withSessionContext } from "@/lib/scorecard-calibration";
import { createInterviewTiming } from "@/lib/interview-timer";
it("shows time, rule and retry without a model summary or area judgments", () => {
  const card = withSessionContext(
    { ...scorecardFixture(), notScoredReason: "too_short" },
    createInterviewTiming(45, Date.parse(scorecardFixture().endedAt) - 300000),
    1,
  );
  const html = renderToStaticMarkup(
    createElement(InterviewScorecard, { scorecard: card }),
  );
  expect(html).toContain("Too short to score");
  expect(html).toContain("5 minutes");
  expect(html).toContain("15 minutes");
  expect(html).toContain("Start a new interview");
  expect(html).not.toContain(card.summary);
  expect(html).not.toContain("Scores by area");
  expect(html).not.toContain("Strengths");
  expect(html).not.toContain("You wrote:");
});
