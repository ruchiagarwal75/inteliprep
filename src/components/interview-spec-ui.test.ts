import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { InterviewPacing } from "@/components/interview-pacing";
import { InterviewScorecard } from "@/components/interview-scorecard";
import { scorecardFixture } from "@/lib/fixtures/scorecard-test";
import { EndInterviewConfirmation } from "@/components/end-interview-confirmation";
import { InterviewTimer } from "@/components/interview-timer";
it("shows exactly one filled pace control, and disables Done until a message exists", () => {
  for (const action of [undefined, "draw", "explain", "review"] as const) {
    const html = renderToStaticMarkup(
      createElement(InterviewPacing, {
        action,
        hasDrawing: true,
        hasExplanation: false,
        disabled: false,
        onChoose: vi.fn(),
      }),
    );
    expect((html.match(/bg-foreground/gu) ?? []).length).toBe(
      action === "draw" || action === "explain" ? 1 : 0,
    );
    if (action === "explain")
      expect(html).toMatch(/disabled=""[^>]*>Done explaining/u);
    if (action === undefined) expect(html).not.toContain("Done explaining");
  }
});
it("shows only the honest retry line when there was no technical answer", () => {
  const card = scorecardFixture();
  card.summary =
    "You ended before giving a technical answer. Retry to get feedback.";
  const html = renderToStaticMarkup(
    createElement(InterviewScorecard, { scorecard: card }),
  );
  expect(html).toContain(card.summary);
  expect(html).not.toContain("Scores by area");
  expect(html).not.toContain("No demonstrated gaps");
});
it("keeps end confirmation concise and preserves an optional unsent answer", () => {
  const html = renderToStaticMarkup(
    createElement(EndInterviewConfirmation, {
      open: true,
      draft: "My unsent answer",
      onCancel: vi.fn(),
      onConfirm: vi.fn(),
    }),
  );
  expect(html).toContain("End this interview and see your scorecard?");
  expect(html).toContain("Keep going");
  expect(html).toContain("My unsent answer");
  expect(html).toContain("Include answer and end");
});
it("retains both five-minute and under-one-minute warnings", () => {
  const at = (remainingSeconds: number) =>
    renderToStaticMarkup(
      createElement(InterviewTimer, {
        remainingSeconds,
        ended: false,
        expired: false,
        testMode: false,
      }),
    );
  expect(at(299)).toContain("5 minutes left");
  expect(at(59)).toContain("Less than a minute");
  expect(at(301)).not.toContain("5 minutes left");
});
