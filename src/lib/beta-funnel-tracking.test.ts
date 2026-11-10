import { beforeEach, expect, it, vi } from "vitest";
import {
  observeSignedIn,
  recordFunnelMilestone,
  recordScoringThreshold,
  recordScorecardOpened,
} from "@/lib/beta-funnel-tracking";
import { createInterviewStart, getProblem } from "@/lib/problems";
import { exportSessionRecord } from "@/lib/interview-session-record";
vi.hoisted(() => vi.resetModules());
const { sql, defer } = vi.hoisted(() => ({ sql: vi.fn(), defer: vi.fn() }));
vi.mock("@/lib/reporting-db", () => ({
  reportingDb: () => sql,
  reportingConfigured: () => false,
}));
vi.mock("@/lib/reporting-write", () => ({
  deferReporting: defer,
  safeReporting: async (work: () => Promise<unknown>) => work(),
}));
beforeEach(() => {
  sql.mockReset().mockResolvedValue([]);
  defer.mockReset();
});
it("deduplicates hashed session milestones without storing the auth session ID", async () => {
  await recordFunnelMilestone({
    userId: "11111111-1111-4111-8111-111111111111",
    event: "signed_in",
    subject: "sensitive-session-id",
  });
  expect(sql.mock.calls[0][0].join("?")).toContain(
    "on conflict(environment,user_id,event,subject_key) do nothing",
  );
  expect(sql.mock.calls[0].slice(1)).not.toContain("sensitive-session-id");
  observeSignedIn("owner", "invalid");
  expect(defer).not.toHaveBeenCalled();
  observeSignedIn("owner", "11111111-1111-4111-8111-111111111111");
  expect(defer).toHaveBeenCalledOnce();
});
it("records the threshold only from authoritative timing and enough answered stages", async () => {
  const problem = getProblem("url-shortener");
  if (!problem) throw Error("Missing problem");
  const started = createInterviewStart(problem, "mid");
  const record = exportSessionRecord(started.sessionId);
  const start = Date.parse(record.checkpoint.timing?.startedAt ?? "");
  record.checkpoint.answeredStages = [0, 2];
  await recordScoringThreshold(record, new Date(start + 300000).toISOString());
  expect(sql).not.toHaveBeenCalled();
  await recordScoringThreshold(record, new Date(start + 1000000).toISOString());
  expect(sql).toHaveBeenCalledOnce();
});
it("checks scorecard ownership and a generated assessed result before recording opens", async () => {
  sql.mockResolvedValueOnce([]);
  expect(await recordScorecardOpened("owner", "interview")).toBe(false);
  expect(sql).toHaveBeenCalledOnce();
  sql
    .mockReset()
    .mockResolvedValueOnce([{ isTest: true }])
    .mockResolvedValueOnce([]);
  expect(await recordScorecardOpened("owner", "interview")).toBe(true);
  expect(sql.mock.calls[0].slice(1)).toContain("owner");
  expect(sql.mock.calls[0][0].join("?")).toContain("not_scored_reason is null");
});
