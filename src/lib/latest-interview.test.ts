import { expect, it } from "vitest";
import { latestInterviews } from "@/lib/latest-interview";
it("keeps one newest-created attempt per problem regardless of difficulty or later edits", () => {
  const older = {
    id: "a",
    problemId: "chat",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2030-01-01T00:00:00Z",
    level: "staff",
  };
  const newer = {
    ...older,
    id: "b",
    createdAt: "2026-02-01T00:00:00Z",
    level: "mid",
  };
  const other = { ...older, id: "c", problemId: "feed" };
  expect(latestInterviews([older, newer, other])).toEqual([newer, other]);
  expect(latestInterviews([newer, older, other])).toEqual([newer, other]);
});
it("uses a stable tie breaker, independent of database traversal order", () => {
  const a = { id: "a", problemId: "chat", createdAt: "2026-01-01T00:00:00Z" };
  const b = { ...a, id: "b" };
  expect(latestInterviews([b, a])).toEqual([a]);
  expect(latestInterviews([a, b])).toEqual([a]);
});
