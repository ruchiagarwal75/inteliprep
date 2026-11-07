import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { PracticeHome } from "@/components/practice-home";
import { savedFixture } from "@/lib/fixtures/saved-interview-test";
import { savedInterviewSummary } from "@/lib/saved-interview";
vi.mock("@/components/candidate-sign-out", () => ({
  CandidateSignOut: () => null,
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
  expect(html).toContain("All attempts are kept");
});
