import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { InterviewResults } from "@/components/interview-results";
import { InterviewScorecard } from "@/components/interview-scorecard";
import { scorecardFixture } from "@/lib/fixtures/scorecard-test";
it("keeps one elapsed-time label and makes evidence available behind readable disclosure controls", () => {
  const card = scorecardFixture();
  card.session = {
    startedAt: "2026-01-01T00:00:00Z",
    elapsedSeconds: 1000,
    allowedSeconds: 2700,
    limited: false,
    note: "Feedback from your interview.",
  };
  const html = renderToStaticMarkup(
    createElement(InterviewResults, {
      scorecard: card,
      whiteboard: {
        elements: [],
        appState: { viewBackgroundColor: "#f4f1ea" },
        files: {},
      },
      messages: [],
      retry: () => {},
      busy: false,
      closed: false,
    }),
  );
  expect(html.match(/Time used:/gu)).toHaveLength(1);
  expect(html).toContain("scorecard-overview");
  expect(html).toContain("score-bars");
  expect(html).toContain("Show evidence");
  expect(html).toContain("You wrote:");
  expect(html).not.toContain("overflow-y-auto");
});
it("keeps provisional scores unnumbered and explains the evidence threshold plainly", () => {
  const card = scorecardFixture();
  card.areas = card.areas.map((a) => ({ ...a, score: null }));
  card.session = {
    startedAt: "2026-01-01T00:00:00Z",
    elapsedSeconds: 60,
    allowedSeconds: 2700,
    limited: true,
    note: "Not enough evidence: scores are hidden until at least one third of the session and two stages with technical answers.",
  };
  const html = renderToStaticMarkup(
    createElement(InterviewScorecard, { scorecard: card }),
  );
  expect(html).toContain("Not enough evidence");
  expect(html).not.toContain("score-bars");
  expect(html).toContain("answered in two stages");
  expect(html).not.toContain("Not enough evidence: scores are hidden");
});
