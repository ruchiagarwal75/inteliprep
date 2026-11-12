import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { roundSummarySchema } from "@/lib/play/public";
import { RoundSummaryCard } from "./round-summary";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/candidate-account-context", () => ({
  useCandidateAccount: () => ({ request: vi.fn() }),
}));
it("shows the actual level name and stored rewards as pixel labels, with readable review copy", () => {
  const summary = roundSummarySchema.parse({
    mode: "level",
    topic: "rag",
    level: 2,
    levelTitle: "Scale math",
    correct: 3,
    total: 5,
    passed: false,
    passedLevels: [],
    retryDrills: [
      { drillId: "review", title: "Check the vector storage", level: 2 },
    ],
    bonusPoints: 0,
    earnedBadges: [],
    practiceReadyNow: false,
    pointsEarned: 45,
  });
  const html = renderToStaticMarkup(
    createElement(RoundSummaryCard, { summary }),
  );
  expect(html).toContain("Scale math");
  expect(html).toContain('aria-label="45 XP earned"');
  expect(html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ")).toContain(
    "3 of 5. Get 4 to pass.",
  );
  expect(html).toContain("Check the vector storage");
  expect(html).toContain("data-game-label");
});
