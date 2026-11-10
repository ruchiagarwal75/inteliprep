import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { scorecardFixture } from "@/lib/fixtures/scorecard-test";
import { savedFixture } from "@/lib/fixtures/saved-interview-test";
vi.mock("@/components/interview-feedback-card", () => ({
  InterviewFeedbackCard: () =>
    createElement(
      "section",
      { "aria-label": "Interview feedback" },
      "Feedback form",
    ),
}));
vi.mock("@/components/scorecard-view-tracker", () => ({
  ScorecardViewTracker: () => null,
}));
vi.mock("@/components/mascot-moments", () => ({ ResultsMascot: () => null }));
vi.mock("@/components/whiteboard", () => ({ Whiteboard: () => null }));
import { InterviewResults } from "@/components/interview-results";
it.each([false, true])(
  "places the outcome before optional feedback (short: %s)",
  (short) => {
    const saved = savedFixture();
    const scorecard = {
      ...scorecardFixture(),
      ...(short ? { notScoredReason: "too_short" as const } : {}),
    };
    const html = renderToStaticMarkup(
      createElement(InterviewResults, {
        scorecard,
        interview: saved.interview,
        whiteboard: saved.whiteboard,
        messages: saved.messages,
        retry: vi.fn(),
        busy: false,
        closed: false,
      }),
    );
    expect(
      html.indexOf('aria-labelledby="results-tab-scorecard"'),
    ).toBeLessThan(html.indexOf('aria-label="Interview feedback"'));
    expect(html).toContain(short ? "Too short to score" : "Scores by area");
  },
);
