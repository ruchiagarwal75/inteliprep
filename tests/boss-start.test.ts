vi.unmock("@/lib/mock-start-access");
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import type postgres from "postgres";
import {
  startPlayPostgres,
  PLAY_TEST_USER as user,
  PLAY_OTHER_USER as other,
} from "./fixtures/play-postgres";
import { POST } from "@/app/api/interview/start/route";
import { POST as resume } from "@/app/api/interview/resume/route";
import { withCandidateIdentity } from "@/lib/candidate-context";
import { withMockStartAccess } from "@/lib/mock-start-access";
import { requireCandidateIdentity } from "@/lib/candidate-auth";
import { mockAccess } from "@/lib/mock-access-store";
import {
  refundableBossFailure,
  returnFreeBossAttempt,
} from "@/lib/boss-lifecycle";
import { withPlayer } from "@/lib/play/database";
import { problemBriefs } from "@/lib/problems";
let db: Awaited<ReturnType<typeof startPlayPostgres>>,
  runtime: ReturnType<typeof postgres>;
vi.mock("@/lib/reporting-db", () => ({
  reportingDb: () => runtime,
  reportingConfigured: () => false,
}));
const boss = {
  problemId: "enterprise-rag-assistant",
  level: "mid",
  durationMinutes: 45,
  launch: "rag_boss",
};
const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/interview/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
beforeAll(async () => {
  db = await startPlayPostgres();
  runtime = db.runtime;
}, 30000);
afterAll(async () => db?.close());
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
it("blocks every non-boss selection for Free and checks Topic 9 on the server", async () => {
  for (const change of [
    { launch: undefined },
    { level: "senior" },
    { level: "staff" },
    { durationMinutes: 60 },
    { durationMinutes: 1 },
    { problemId: "url-shortener" },
  ]) {
    const response = await post({ ...boss, ...change });
    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe(
      change.problemId ? "mock_unavailable" : "pro_required",
    );
  }
  const locked = await post(boss);
  expect(locked.status).toBe(403);
  expect((await locked.json()).code).toBe("boss_locked");
  expect(
    await db.operator`select * from practice_game.boss_attempts`,
  ).toHaveLength(0);
});
let originalId = "";
let originalRequestId = "";
it("consumes one attempt at creation and coalesces simultaneous/retried requests", async () => {
  await db.operator`insert into practice_game.level_progress(user_id,topic,level,status,passed_at) values(${user},'rag-course',9,'passed',now())`;
  originalRequestId = crypto.randomUUID();
  const responses = await Promise.all([
    post({ ...boss, requestId: originalRequestId }),
    post({ ...boss, requestId: originalRequestId }),
  ]);
  expect(responses.map((r) => r.status)).toEqual([200, 200]);
  const first = await responses[0].json(),
    second = await responses[1].json();
  originalId = first.sessionId;
  expect(second.sessionId).toBe(first.sessionId);
  expect(second.timing).toEqual(first.timing);
  const resumed = await resume(
    new Request("http://localhost/api/interview/resume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: first.sessionId,
        problemId: boss.problemId,
        level: "mid",
        resumeToken: first.resumeToken,
      }),
    }),
  );
  expect(resumed.status).toBe(200);
  expect((await resumed.json()).timing).toEqual(first.timing);
  expect((await mockAccess(user)).freeBossSessionId).toBe(originalId);
  expect(
    await db.operator`select * from practice_game.boss_attempts`,
  ).toHaveLength(1);
  const denied = await post({ ...boss, requestId: crypto.randomUUID() });
  expect(denied.status).toBe(403);
  expect((await denied.json()).code).toBe("free_attempt_used");
});
it("does not recreate an old request after the temporary session cache expires", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(Date.now() + 3 * 3600_000);
  const response = await post({ ...boss, requestId: originalRequestId });
  expect(response.status).toBe(409);
  expect((await response.json()).code).toBe("BOSS_ATTEMPT_EXISTS");
  expect(
    await db.operator`select * from practice_game.boss_attempts`,
  ).toHaveLength(1);
});
it("returns an unfinished attempt once for a trusted server failure and preserves prior attempt history", async () => {
  expect(
    refundableBossFailure({
      operation: "ai_response",
      category: "provider_unavailable",
      terminal: true,
    }),
  ).toBe(true);
  expect(
    refundableBossFailure({
      operation: "ai_response",
      category: "provider_unavailable",
      terminal: false,
    }),
  ).toBe(false);
  for (const input of [
    { operation: "feedback", category: "provider_unavailable" },
    { operation: "ai_response", category: "cancelled" },
    { operation: "ai_response", category: "provider_limit" },
    { operation: "ai_response", category: "timeout", source: "browser_report" },
  ] as const)
    expect(refundableBossFailure(input)).toBe(false);
  expect(
    await withPlayer(other, (sql) =>
      returnFreeBossAttempt(sql, other, originalId, "timeout"),
    ),
  ).toBe(false);
  expect(
    await withPlayer(user, (sql) =>
      returnFreeBossAttempt(sql, user, originalId, "timeout"),
    ),
  ).toBe(true);
  expect(
    await withPlayer(user, (sql) =>
      returnFreeBossAttempt(sql, user, originalId, "timeout"),
    ),
  ).toBe(false);
  expect((await mockAccess(user)).freeBossUsedAt).toBeNull();
  expect(
    await db.operator`select * from practice_game.mock_access_changes where action='free_attempt_returned'`,
  ).toHaveLength(1);
  const response = await post({ ...boss, requestId: crypto.randomUUID() });
  expect(response.status).toBe(200);
  const id = (await response.json()).sessionId;
  await db.operator`update practice_game.boss_attempts set ended_at=now() where session_id=${id}`;
  expect(
    await withPlayer(user, (sql) =>
      returnFreeBossAttempt(sql, user, id, "timeout"),
    ),
  ).toBe(false);
  expect(
    await db.operator`select * from practice_game.boss_attempts`,
  ).toHaveLength(2);
});
it("permits Pro/admin starts and reads a changed plan on the very next request", async () => {
  vi.mocked(requireCandidateIdentity).mockResolvedValue(other);
  await db.operator`insert into practice_game.mock_access(user_id,plan) values(${other},'pro')`;
  for (let n = 0; n < 2; n++)
    expect(
      (
        await post({
          problemId: "enterprise-rag-assistant",
          level: "senior",
          requestId: crypto.randomUUID(),
        })
      ).status,
    ).toBe(200);
  await db.operator`update practice_game.mock_access set plan='free' where user_id=${other}`;
  expect(
    (await post({ problemId: "enterprise-rag-assistant", level: "senior" }))
      .status,
  ).toBe(403);
  vi.stubEnv("ADMIN_USER_ID", other);
  expect(
    (await post({ problemId: "enterprise-rag-assistant", level: "staff" }))
      .status,
  ).toBe(200);
});
it("does not use the free attempt if session publication fails", async () => {
  await db.operator`insert into practice_game.level_progress(user_id,topic,level,status,passed_at) values(${other},'rag-course',9,'passed',now()) on conflict do nothing`;
  await db.operator`update practice_game.mock_access set plan='free' where user_id=${other}`;
  await expect(
    withCandidateIdentity(other, () =>
      withMockStartAccess(
        {
          ...boss,
          level: "mid",
          durationMinutes: 45,
          launch: "rag_boss",
          requestId: crypto.randomUUID(),
        },
        async () => {
          throw Error("Publication failed");
        },
      ),
    ),
  ).rejects.toThrow("Publication failed");
  expect((await mockAccess(other)).freeBossUsedAt).toBeNull();
});

it("keeps all other questions locked for Free, Pro and admin, without creating sessions", async () => {
  vi.mocked(requireCandidateIdentity).mockResolvedValue(other);
  const locked = problemBriefs().filter(
    (problem) => problem.problemId !== "enterprise-rag-assistant",
  );
  const before =
    await db.operator`select count(*)::int as count from practice_game.boss_attempts`;
  for (const plan of ["free", "pro", "admin"] as const) {
    vi.stubEnv("ADMIN_USER_ID", plan === "admin" ? other : "");
    const storedPlan = plan === "admin" ? "free" : plan;
    await db.operator`update practice_game.mock_access set plan=${storedPlan} where user_id=${other}`;
    for (const { problemId } of locked) {
      const response = await post({ problemId, level: "mid" });
      expect(response.status).toBe(403);
      expect((await response.json()).code).toBe("mock_unavailable");
    }
  }
  expect(
    await db.operator`select count(*)::int as count from practice_game.boss_attempts`,
  ).toEqual(before);
});
