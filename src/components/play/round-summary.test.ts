import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { RoundSummary } from "@/lib/play/public";
import { RoundSummaryCard } from "./round-summary";
const summary: RoundSummary = {
  mode: "level",
  topic: "rag",
  level: 1,
  passed: true,
  correct: 5,
  total: 5,
  passedLevels: [1],
  retryDrills: [],
  bonusPoints: 25,
  pointsEarned: 90,
  earnedBadges: ["first-level"],
  practiceReadyNow: false,
  stars: 3,
  bestCombo: 5,
  answerTimeMs: 63400,
  nextLevel: { level: 2, title: "Scale math" },
};
it("shows a server-earned three-star reward and returns to the verified path", () => {
  const html = renderToStaticMarkup(
    createElement(RoundSummaryCard, { summary }),
  );
  expect(html).toContain('aria-label="3 of 3 stars"');
  expect(html).toContain('href="/play/rag?unlocked=2"');
  expect(html).toContain("Accuracy");
  expect(html).toContain("01:03");
  expect(html).toContain('aria-label="90 XP earned"');
  expect(html).not.toContain("Levels cleared");
  expect(html).not.toContain("Dismiss");
});
it("keeps old saved summaries readable without inventing stars or timing", () => {
  const old = {
    ...summary,
    stars: undefined,
    bestCombo: undefined,
    answerTimeMs: undefined,
  };
  const html = renderToStaticMarkup(
    createElement(RoundSummaryCard, { summary: old }),
  );
  expect(html).toContain("Unavailable");
  expect(html).not.toContain('aria-label="3 of 3 stars"');
});
