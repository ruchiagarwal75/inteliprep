import { expect, it } from "vitest";
import { projectBossState, bossAttemptSchema } from "./rag-boss-state";
import type { MockAccess } from "./mock-access-public";
const now = new Date("2026-11-13T20:00:00Z");
const access: MockAccess = {
  plan: "free",
  admin: false,
  freeBossUsedAt: null,
  freeBossSessionId: null,
  proInterestAt: null,
  worldClearedSeenAt: null,
};
const attempt = bossAttemptSchema.parse({
  session_id: "71717171-7171-4171-8171-717171717171",
  started_at: "2026-11-13T19:30:00Z",
  deadline_at: "2026-11-13T20:15:00Z",
  ended_at: null,
  graded_at: null,
  score: null,
  signal: null,
  passed: false,
  refunded_at: null,
});
it("projects all six states from persisted ownership and timing", () => {
  expect(projectBossState(access, false, [], now).state).toBe("locked");
  expect(projectBossState(access, true, [], now).state).toBe("ready");
  expect(projectBossState(access, true, [attempt], now)).toMatchObject({
    state: "in_progress",
    sessionId: attempt.session_id,
  });
  const ended = { ...attempt, ended_at: now, score: 0.5, signal: "no" };
  expect(
    projectBossState(
      { ...access, freeBossUsedAt: now.toISOString() },
      true,
      [ended],
      now,
    ).state,
  ).toBe("used");
  expect(
    projectBossState({ ...access, plan: "pro" }, true, [ended], now).state,
  ).toBe("retry");
  expect(
    projectBossState(
      access,
      true,
      [{ ...ended, passed: true, signal: "yes" }],
      now,
    ),
  ).toMatchObject({
    state: "defeated",
    defeatedAt: now.toISOString(),
    result: { score: 0.5 },
  });
});
it("keeps an existing boss resumable after a plan or course change", () => {
  expect(projectBossState(access, false, [attempt], now).state).toBe(
    "in_progress",
  );
});
it("does not treat a past deadline or refunded attempt as running", () => {
  const used = { ...access, freeBossUsedAt: now.toISOString() };
  expect(
    projectBossState(used, true, [attempt], new Date("2026-11-13T21:00:00Z"))
      .state,
  ).toBe("used");
  expect(
    projectBossState(access, true, [{ ...attempt, refunded_at: now }], now)
      .state,
  ).toBe("ready");
});
it("preserves a defeat after later failures and readiness aging", () => {
  const won = {
    ...attempt,
    passed: true,
    ended_at: now,
    score: 0.75,
    signal: "yes",
  };
  const later = {
    ...attempt,
    session_id: crypto.randomUUID(),
    ended_at: now,
    score: 0.25,
    signal: "no",
  };
  expect(
    projectBossState(
      access,
      true,
      [later, won],
      new Date("2027-01-01T00:00:00Z"),
    ).state,
  ).toBe("defeated");
});
