import { afterAll, beforeAll, expect, it, vi } from "vitest";
import type postgres from "postgres";
import { APIError } from "openai";
import {
  startPlayPostgres,
  PLAY_TEST_USER as user,
} from "./fixtures/play-postgres";
import { withReportingContext } from "@/lib/reporting-context";
import { upstreamChatError } from "@/lib/chat-api-error";
import { logServerEvent } from "@/lib/server-events";
import { mockAccess } from "@/lib/mock-access-store";
let db: Awaited<ReturnType<typeof startPlayPostgres>>,
  runtime: ReturnType<typeof postgres>;
const work = vi.hoisted(() => {
  const callbacks: (() => Promise<unknown>)[] = [];
  return callbacks;
});
vi.mock("@/lib/reporting-db", () => ({
  reportingDb: () => runtime,
  reportingConfigured: () => true,
}));
vi.mock("@/lib/reporting-write", () => ({
  deferReporting: (callback: () => Promise<unknown>) => {
    work.push(callback);
  },
  safeReporting: async (callback: () => Promise<unknown>) => {
    try {
      await callback();
    } catch {
      /* Fixture has no reporting schema; refund still runs. */
    }
  },
}));
beforeAll(async () => {
  db = await startPlayPostgres();
  runtime = db.runtime;
}, 30000);
afterAll(async () => db?.close());
it("returns the attempt from a final stubbed provider failure, not a recovered diagnostic", async () => {
  const id = crypto.randomUUID();
  await db.operator`insert into practice_game.mock_access(user_id,free_boss_used_at,free_boss_session_id) values(${user},now(),${id})`;
  await db.operator`insert into practice_game.boss_attempts(session_id,user_id,request_id,access_plan,started_at,deadline_at) values(${id},${user},${crypto.randomUUID()},'free',now(),now()+interval '45 minutes')`;
  const cause = new APIError(
    503,
    { message: "stubbed outage" },
    "stubbed outage",
    new Headers(),
  );
  const context = {
    requestId: crypto.randomUUID(),
    route: "/api/chat",
    userId: user,
    interviewId: id,
  };
  withReportingContext(context, () =>
    logServerEvent(
      { event: "stage_assessment_failure", route: "/api/chat" },
      cause,
    ),
  );
  for (const callback of work.splice(0)) await callback();
  expect((await mockAccess(user)).freeBossSessionId).toBe(id);
  const response = withReportingContext(context, () =>
    upstreamChatError(cause, context.requestId),
  );
  expect(response.status).toBe(502);
  expect(await response.json()).toMatchObject({
    code: "INTERVIEWER_UNAVAILABLE",
  });
  for (const callback of work.splice(0)) await callback();
  expect((await mockAccess(user)).freeBossUsedAt).toBeNull();
  const changes =
    await db.operator`select action,actor_id,session_id from practice_game.mock_access_changes`;
  expect(changes).toEqual([
    { action: "free_attempt_returned", actor_id: null, session_id: id },
  ]);
});
