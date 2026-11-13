import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import type postgres from "postgres";
import {
  startPlayPostgres,
  PLAY_TEST_USER as user,
  PLAY_OTHER_USER as other,
} from "./fixtures/play-postgres";
import { claimBossWorldCleared } from "@/lib/boss-cleared";
import { markBossFinished, returnFreeBossAttempt } from "@/lib/boss-lifecycle";
import { ragBossState } from "@/lib/rag-boss-state";
import { withPlayer } from "@/lib/play/database";
import { applyMockOutcome, observeMockStart } from "@/lib/play/mock-hooks";
import { withCandidateIdentity } from "@/lib/candidate-context";
import { getProblem, createInterviewStart } from "@/lib/problems";
import { exportSessionRecord } from "@/lib/interview-session-record";
import { scorecardFixture } from "@/lib/fixtures/scorecard-test";
import type { Scorecard } from "@/lib/scorecard";
let db: Awaited<ReturnType<typeof startPlayPostgres>>,
  runtime: ReturnType<typeof postgres>;
vi.mock("@/lib/reporting-db", () => ({
  reportingDb: () => runtime,
  reportingConfigured: () => true,
}));
beforeAll(async () => {
  db = await startPlayPostgres();
  runtime = db.runtime;
}, 30000);
afterEach(() => vi.useRealTimers());
afterAll(async () => db?.close());
async function finishedRecord(
  owner: string,
  signal: Scorecard["signal"] = "yes",
) {
  const problem = getProblem("enterprise-rag-assistant");
  if (!problem) throw Error("Missing fixture problem");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-13T19:15:00Z"));
  const start = withCandidateIdentity(owner, () =>
    createInterviewStart(problem, "mid", 45),
  );
  const record = exportSessionRecord(start.sessionId);
  const timing = start.timing;
  if (!timing) throw Error("Missing fixture clock");
  await db.operator`insert into practice_game.boss_attempts(session_id,user_id,request_id,access_plan,started_at,deadline_at) values(${start.sessionId},${owner},${crypto.randomUUID()},'free',${timing.startedAt},${timing.deadlineAt})`;
  const endedAt = "2026-11-13T20:00:00.000Z";
  vi.setSystemTime(new Date(endedAt));
  record.checkpoint.ending = {
    endedAt,
    snapshotHash: "fixture-server-evidence",
  };
  record.scorecard = {
    ...scorecardFixture(),
    problemId: problem.id,
    level: "mid",
    endedAt,
    signal,
    session: {
      startedAt: timing.startedAt,
      elapsedSeconds: 2700,
      allowedSeconds: 2700,
      limited: false,
      note: "Complete",
    },
  };
  return record;
}
it("only a verified passing mock clears the boss and awards existing Mid readiness/badges once", async () => {
  expect(await claimBossWorldCleared(user)).toEqual({ show: false });
  const record = await finishedRecord(user),
    card = record.scorecard;
  if (!card) throw Error("Missing fixture grade");
  for (let repeat = 0; repeat < 2; repeat++)
    await withPlayer(user, async (sql) => {
      await markBossFinished(sql, user, record);
      await applyMockOutcome(sql, user, record.checkpoint.id, card);
    });
  expect((await ragBossState(user)).state).toBe("defeated");
  const [ready] =
    await db.operator`select state,verified_level from practice_game.topic_readiness where user_id=${user} and topic='rag-course'`;
  expect(ready).toMatchObject({
    state: "interview_ready",
    verified_level: "mid",
  });
  expect(
    await db.operator`select * from practice_game.badges where user_id=${user} and badge_id='rag-interview'`,
  ).toHaveLength(1);
  expect(
    await db.operator`select * from practice_game.points_ledger where user_id=${user} and reason='mock'`,
  ).toHaveLength(1);
  const claims = await Promise.all([
    claimBossWorldCleared(user),
    claimBossWorldCleared(user),
  ]);
  expect(claims.filter((claim) => claim.show)).toHaveLength(1);
  expect(await claimBossWorldCleared(user)).toEqual({ show: false });
});
it("a failed boss changes no topic unlocks and a finished interview cannot be refunded", async () => {
  await db.operator`insert into practice_game.level_progress(user_id,topic,level,status,passed_at) values(${other},'rag-course',9,'passed',now())`;
  const record = await finishedRecord(other, "no"),
    card = record.scorecard;
  if (!card) throw Error("Missing fixture grade");
  await withPlayer(other, async (sql) => {
    await markBossFinished(sql, other, record);
    await applyMockOutcome(sql, other, record.checkpoint.id, card);
    expect(
      await returnFreeBossAttempt(sql, other, record.checkpoint.id, "timeout"),
    ).toBe(false);
  });
  expect(await claimBossWorldCleared(other)).toEqual({ show: false });
  expect(
    await db.operator`select level,status from practice_game.level_progress where user_id=${other}`,
  ).toEqual([{ level: 9, status: "passed" }]);
  expect(
    await db.operator`select * from practice_game.badges where user_id=${other} and badge_id='rag-interview'`,
  ).toHaveLength(0);
});
it("keeps the existing prompt funnel when the prompt now leads to the boss", async () => {
  await db.operator`insert into practice_game.play_events(id,user_id,event,ref_id,topic) values(${crypto.randomUUID()},${user},'mock_prompt_shown','rag-course','rag-course')`;
  const request = new Request("http://localhost/api/interview/start", {
    headers: { referer: "http://localhost/play/rag?from=play" },
  });
  await withCandidateIdentity(user, () =>
    observeMockStart(
      request,
      crypto.randomUUID(),
      "enterprise-rag-assistant",
      "mid",
    ),
  );
  expect(
    await db.operator`select topic from practice_game.play_events where user_id=${user} and event='mock_started_from_prompt'`,
  ).toEqual([{ topic: "rag-course" }]);
});
