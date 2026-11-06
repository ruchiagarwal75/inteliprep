import { expect, it } from "vitest";
import { updateInterviewHistory } from "@/lib/interview-history-update";
import { savedFixture } from "@/lib/fixtures/saved-interview-test";
import { savedInterviewSummary } from "@/lib/saved-interview";

it("updates a committed row without losing history, duplicating it, or sorting by last edit", () => {
  const older = {
    ...savedInterviewSummary(savedFixture()),
    createdAt: "2026-01-01T00:00:00Z",
  };
  const newer = {
    ...savedInterviewSummary(savedFixture()),
    createdAt: "2026-02-01T00:00:00Z",
  };
  const entries = [newer, older];
  const ended = {
    ...older,
    hasEnded: true,
    closedWithoutScoring: true,
    updatedAt: "2026-12-01T00:00:00Z",
  };
  const updated = updateInterviewHistory(entries, ended);
  expect(updated).toEqual([newer, ended]);
  expect(entries).toEqual([newer, older]);
  expect(
    updateInterviewHistory(updated, { ...newer, hasScorecard: true }),
  ).toHaveLength(2);
});
