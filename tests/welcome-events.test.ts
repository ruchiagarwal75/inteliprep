import { beforeAll, afterAll, expect, it, vi } from "vitest";
import type postgres from "postgres";
import {
  startPlayPostgres,
  PLAY_TEST_USER as user,
  PLAY_OTHER_USER as other,
} from "./fixtures/play-postgres";
import {
  openWelcome,
  finishWelcome,
  firstTopicFromIntro,
} from "@/lib/play/welcome-store";
import { adminWelcomeFunnel } from "@/lib/admin-welcome-funnel";
import { betaFunnelQuery } from "@/lib/beta-funnel-query";
let db: Awaited<ReturnType<typeof startPlayPostgres>>,
  runtime: ReturnType<typeof postgres>;
const verify = vi.hoisted(() => vi.fn());
vi.mock("@/lib/reporting-db", () => ({ reportingDb: () => runtime }));
vi.mock("@/lib/admin-auth", () => ({ requireAdminIdentity: verify }));
beforeAll(async () => {
  db = await startPlayPostgres();
  runtime = db.runtime;
  await db.operator.unsafe(
    "create schema interview_admin; create view interview_admin.registered_users as select id,id::text||'@example.invalid' as email from auth.users;grant usage on schema interview_admin to mockmeai_reporting;grant select on interview_admin.registered_users to mockmeai_reporting;",
  );
  verify.mockResolvedValue(other);
}, 30000);
afterAll(async () => db?.close());
it("records one shown and one ending per run, including retried replay commands", async () => {
  const requestId = crypto.randomUUID();
  const first = await openWelcome(user, false, requestId);
  expect(await openWelcome(user, false, requestId)).toBe(first);
  if (!first) throw Error("Missing run");
  await finishWelcome(user, { runId: first, action: "skip", panel: 3 });
  await finishWelcome(user, { runId: first, action: "complete", panel: 4 });
  const replay = crypto.randomUUID();
  expect(await openWelcome(user, true, replay)).toBe(replay);
  expect(await openWelcome(user, true, replay)).toBe(replay);
  await finishWelcome(user, { runId: replay, action: "complete", panel: 4 });
  await finishWelcome(user, { runId: replay, action: "complete", panel: 4 });
  await firstTopicFromIntro(other, replay);
  await firstTopicFromIntro(user, first);
  await firstTopicFromIntro(user, replay);
  await firstTopicFromIntro(user, replay);
  const rows =
    await db.operator`select event,panel from practice_game.play_events order by created_at,id`;
  expect(rows.filter((row) => row.event === "intro_shown")).toHaveLength(2);
  expect(rows.filter((row) => row.event === "intro_skipped")).toEqual([
    { event: "intro_skipped", panel: 3 },
  ]);
  expect(rows.filter((row) => row.event === "intro_completed")).toHaveLength(1);
  expect(
    rows.filter((row) => row.event === "first_topic_started_from_intro"),
  ).toHaveLength(1);
  expect(
    await db.operator`select * from practice_game.points_ledger`,
  ).toHaveLength(0);
});
it("shows filtered admin counts without leaving pooled admin access enabled", async () => {
  const query = betaFunnelQuery(new URLSearchParams({ includeExcluded: "1" }));
  expect(await adminWelcomeFunnel(query)).toEqual({
    shown: 2,
    skipped: 1,
    completed: 1,
    topicStarted: 1,
  });
  expect(await runtime`select * from practice_game.play_events`).toHaveLength(
    0,
  );
  expect(
    await adminWelcomeFunnel({ ...query, search: "no-such-account" }),
  ).toEqual({ shown: 0, skipped: 0, completed: 0, topicStarted: 0 });
});
it("checks admin authorization inside the counter data function", async () => {
  verify.mockRejectedValueOnce(Error("denied"));
  await expect(
    adminWelcomeFunnel(betaFunnelQuery(new URLSearchParams())),
  ).rejects.toThrow("denied");
});
