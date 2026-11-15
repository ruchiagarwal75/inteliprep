import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { AdminTopicRatingsPanel } from "./admin-topic-ratings-panel";

it("distinguishes a recorded display, a deliberate close and an older unknown dismissal", () => {
  const base = {
    id: "record",
    userId: "user",
    email: "reader@example.invalid",
    topic: "rag-course",
    level: 0,
    stars: null,
    createdAt: "2026-11-15T00:00:00Z",
    respondedAt: null,
  };
  const html = renderToStaticMarkup(
    createElement(AdminTopicRatingsPanel, {
      data: {
        shown: 2,
        rated: 0,
        skipped: 0,
        closed: 1,
        unanswered: 1,
        olderDismissals: 1,
        average: null,
        entries: [
          {
            ...base,
            id: "shown",
            outcome: "unanswered",
            shownAt: base.createdAt,
          },
          {
            ...base,
            id: "closed",
            outcome: "closed",
            shownAt: base.createdAt,
            respondedAt: base.createdAt,
          },
          {
            ...base,
            id: "older",
            outcome: "older_dismissal",
            shownAt: null,
            respondedAt: base.createdAt,
          },
        ],
      },
    }),
  );
  expect(html).toContain("2 shown");
  expect(html).toContain("Shown, no response recorded");
  expect(html).toContain("Closed with X or Escape");
  expect(html).toContain("Dismissed, reason not recorded");
  expect(html).toContain("Not recorded");
  expect(html).not.toContain("null / 5");
});
