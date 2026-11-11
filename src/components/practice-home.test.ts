import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { PracticeHome } from "@/components/practice-home";
import { savedFixture } from "@/lib/fixtures/saved-interview-test";
import { savedInterviewSummary } from "@/lib/saved-interview";
vi.mock("@/components/candidate-profile-menu", () => ({
  CandidateProfileMenu: () => null,
}));
it("shows saved attempts and keeps their existing links without deleting any", () => {
  const old = {
    ...savedInterviewSummary(savedFixture()),
    createdAt: "2026-01-01T00:00:00Z",
  };
  const recent = {
    ...old,
    id: crypto.randomUUID(),
    createdAt: "2026-02-01T00:00:00Z",
  };
  const html = renderToStaticMarkup(
    createElement(PracticeHome, {
      entries: [recent, old],
      problems: [],
      onDelete: async () => {},
    }),
  );
  expect(html).toContain("2 attempts");
  expect(html).toContain(`/interview/${old.id}`);
  expect(html).toContain(`/interview/${recent.id}`);
  expect(html).toContain("Your practice history is saved in this browser.");
});

it("links expired attempts to feedback instead of offering Resume", () => {
  const saved = savedInterviewSummary(savedFixture());
  const entry = {
    ...saved,
    hasEnded: false,
    timing: {
      durationMinutes: 45 as const,
      startedAt: "2026-01-01T00:00:00.000Z",
      deadlineAt: "2026-01-01T00:45:00.000Z",
    },
  };
  const html = renderToStaticMarkup(
    createElement(PracticeHome, {
      entries: [entry],
      problems: [],
      onDelete: async () => {},
    }),
  );
  expect(html).toContain(`/interview/${entry.id}/results`);
  expect(html).toContain("View feedback");
  expect(html).not.toContain(">Resume");
});

it("links to the AI / ML track immediately below the hero subtitle", () => {
  const html = renderToStaticMarkup(
    createElement(PracticeHome, {
      entries: [],
      problems: [],
      onDelete: async () => {},
    }),
  );
  const subtitle = html.indexOf(
    "Type your reasoning, sketch your design, and get feedback on your approach.",
  );
  const announcement = html.indexOf(
    'href="/interview/new?track=genai">Now with AI / ML system design: RAG, agents, recommendations and ads ranking.',
  );
  expect(subtitle).toBeGreaterThan(0);
  expect(announcement).toBeGreaterThan(subtitle);
  expect(announcement).toBeLessThan(html.indexOf("Start practice"));
});
