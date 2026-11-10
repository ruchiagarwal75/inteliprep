import { beforeEach, expect, it, vi } from "vitest";
import { savePracticeFeedback, feedbackHandled } from "@/lib/feedback-store";
const { sql } = vi.hoisted(() => ({ sql: vi.fn() }));
vi.mock("@/lib/reporting-db", () => ({ reportingDb: () => sql }));
beforeEach(() => sql.mockReset());
const interviewId = "22222222-2222-4222-8222-222222222222";
it("verifies ownership before writes", async () => {
  sql.mockResolvedValueOnce([]);
  await expect(
    savePracticeFeedback({
      source: "interview_end",
      interviewId,
      skipped: true,
    }),
  ).rejects.toMatchObject({ status: 404 });
  expect(sql).toHaveBeenCalledTimes(1);
  expect(sql.mock.calls[0].slice(1)).toContain(
    "11111111-1111-4111-8111-111111111111",
  );
});
it("uses an atomic upsert for the second send and inherits the interview test flag", async () => {
  sql
    .mockResolvedValueOnce([{ isTest: true }])
    .mockResolvedValueOnce([{ id: "saved" }]);
  expect(
    await savePracticeFeedback({
      source: "interview_end",
      interviewId,
      skipped: false,
      liked: "loved",
      comment: "hello",
    }),
  ).toEqual({ id: "saved" });
  const call = sql.mock.calls[1];
  expect(call[0].join("?")).toContain(
    "on conflict (user_id,interview_id) do update",
  );
  expect(call.slice(1)).toContain(true);
  expect(call.slice(1)).toContain("hello");
});
it("records menu feedback independently and discards answers on skips", async () => {
  sql.mockResolvedValue([{ id: "menu" }]);
  await savePracticeFeedback({
    source: "menu",
    skipped: true,
    comment: "not submitted",
  });
  expect(sql).toHaveBeenCalledTimes(1);
  expect(sql.mock.calls[0].slice(1)).not.toContain("not submitted");
});
it("only checks the verified owner's handled status", async () => {
  sql.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "saved" }]);
  expect(await feedbackHandled(interviewId)).toBe(false);
  expect(await feedbackHandled(interviewId)).toBe(true);
  expect(sql.mock.calls[0].slice(1)).toContain(
    "11111111-1111-4111-8111-111111111111",
  );
});
