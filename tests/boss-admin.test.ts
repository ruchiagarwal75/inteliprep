vi.unmock("@/lib/mock-start-access");
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import type postgres from "postgres";
import {
  startPlayPostgres,
  PLAY_TEST_USER as user,
  PLAY_OTHER_USER as admin,
} from "./fixtures/play-postgres";
import { POST as plan } from "@/app/api/admin/users/[id]/plan/route";
import { POST as start } from "@/app/api/interview/start/route";
import { POST as resume } from "@/app/api/interview/resume/route";
import { AdminAccessError } from "@/lib/admin-auth";
import { ragBossState } from "@/lib/rag-boss-state";
const verify = vi.hoisted(() => vi.fn());
vi.mock("@/lib/admin-auth", async (original) => ({
  ...(await original<typeof import("@/lib/admin-auth")>()),
  requireAdminIdentity: verify,
}));
let db: Awaited<ReturnType<typeof startPlayPostgres>>,
  runtime: ReturnType<typeof postgres>;
vi.mock("@/lib/reporting-db", () => ({
  reportingDb: () => runtime,
  reportingConfigured: () => false,
}));
const request = (path: string, body: unknown, origin = "http://localhost") =>
  new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const change = (body: unknown, origin = "http://localhost") =>
  plan(request(`/api/admin/users/${user}/plan`, body, origin));
beforeAll(async () => {
  db = await startPlayPostgres();
  runtime = db.runtime;
}, 30000);
beforeEach(() => {
  verify.mockReset().mockResolvedValue(admin);
});
afterAll(async () => db?.close());
it("denies signed-out, non-admin, cross-origin and invalid plan writes", async () => {
  verify.mockRejectedValueOnce(new AdminAccessError(401));
  expect((await change({ action: "plan", plan: "pro" })).status).toBe(401);
  verify.mockRejectedValueOnce(new AdminAccessError(403));
  expect((await change({ action: "plan", plan: "pro" })).status).toBe(403);
  expect(
    (await change({ action: "plan", plan: "pro" }, "https://unrelated.invalid"))
      .status,
  ).toBe(403);
  expect((await change({ action: "plan", plan: "owner" })).status).toBe(400);
  expect(
    await db.operator`select * from practice_game.mock_access_changes`,
  ).toHaveLength(0);
});
it("applies an admin plan change on the next real start request", async () => {
  expect((await change({ action: "plan", plan: "pro" })).status).toBe(200);
  const selection = {
    problemId: "url-shortener",
    level: "mid",
    requestId: crypto.randomUUID(),
  };
  expect((await start(request("/api/interview/start", selection))).status).toBe(
    200,
  );
  expect((await change({ action: "plan", plan: "free" })).status).toBe(200);
  const denied = await start(
    request("/api/interview/start", {
      ...selection,
      requestId: crypto.randomUUID(),
      plan: "pro",
    }),
  );
  expect(denied.status).toBe(403);
  expect((await denied.json()).code).toBe("pro_required");
});
it("resetting an active free attempt makes the boss ready but keeps the old session resumable", async () => {
  await db.operator`insert into practice_game.level_progress(user_id,topic,level,status,passed_at) values(${user},'rag-course',9,'passed',now())`;
  const response = await start(
    request("/api/interview/start", {
      problemId: "enterprise-rag-assistant",
      level: "mid",
      durationMinutes: 45,
      launch: "rag_boss",
      requestId: crypto.randomUUID(),
    }),
  );
  expect(response.status).toBe(200);
  const opened = await response.json();
  expect((await ragBossState(user)).state).toBe("in_progress");
  expect((await change({ action: "reset_free_attempt" })).status).toBe(200);
  expect((await ragBossState(user)).state).toBe("ready");
  expect(
    await db.operator`select * from practice_game.boss_attempts where session_id=${opened.sessionId}`,
  ).toHaveLength(1);
  expect(
    (
      await resume(
        request("/api/interview/resume", {
          sessionId: opened.sessionId,
          problemId: opened.problemId,
          level: opened.level,
          resumeToken: opened.resumeToken,
        }),
      )
    ).status,
  ).toBe(200);
  const audit =
    await db.operator`select actor_id from practice_game.mock_access_changes where action='free_attempt_reset'`;
  expect(audit).toEqual([{ actor_id: admin }]);
});
