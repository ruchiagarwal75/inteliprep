import { beforeAll, afterAll, expect, it, vi } from "vitest";
import type postgres from "postgres";
import {
  startPlayPostgres,
  PLAY_TEST_USER as user,
  PLAY_OTHER_USER as other,
} from "./fixtures/play-postgres";
import {
  welcomeRequired,
  openWelcome,
  finishWelcome,
} from "@/lib/play/welcome-store";
import { welcomeFinishSchema } from "@/lib/play/welcome-public";
let db: Awaited<ReturnType<typeof startPlayPostgres>>,
  runtime: ReturnType<typeof postgres>;
vi.mock("@/lib/reporting-db", () => ({ reportingDb: () => runtime }));
beforeAll(async () => {
  db = await startPlayPostgres();
  runtime = db.runtime;
}, 30000);
afterAll(async () => db?.close());
it("shows a new account once and reuses its automatic run across refreshes", async () => {
  expect(await welcomeRequired(user)).toBe(true);
  const id = await openWelcome(user, false);
  expect(id).toEqual(expect.any(String));
  expect(await openWelcome(user, false)).toBe(id);
});
it("records skip once and keeps it seen in another request or browser", async () => {
  const runId = await openWelcome(user, false);
  if (!runId) throw Error("Missing run");
  await finishWelcome(user, { runId, action: "skip", panel: 2 });
  await finishWelcome(user, { runId, action: "complete", panel: 4 });
  expect(await welcomeRequired(user)).toBe(false);
  expect(await openWelcome(user, false)).toBeNull();
  const [row] =
    await db.operator`select outcome,panel from practice_game.welcome_runs where id=${runId}`;
  expect(row).toEqual({ outcome: "skipped", panel: 2 });
});
it("allows explicit replay without resetting the saved seen time", async () => {
  const [before] =
    await db.operator`select welcome_seen_at from practice_game.welcome_state where user_id=${user}`;
  const runId = await openWelcome(user, true);
  if (!runId) throw Error("Missing run");
  await finishWelcome(user, { runId, action: "complete", panel: 4 });
  expect(await welcomeRequired(user)).toBe(false);
  const [after] =
    await db.operator`select welcome_seen_at from practice_game.welcome_state where user_id=${user}`;
  expect(after).toEqual(before);
});
it("does not automatically interrupt existing course progress", async () => {
  await db.operator`insert into practice_game.level_progress(user_id,topic,level,status,passed_at) values(${other},'rag-course',0,'passed',now())`;
  expect(await welcomeRequired(other)).toBe(false);
  expect(await openWelcome(other, false)).toBeNull();
  expect(await openWelcome(other, true)).toEqual(expect.any(String));
});
it("denies another account's run and invalid finish payloads", async () => {
  const runId = await openWelcome(user, true);
  if (!runId) throw Error("Missing run");
  await expect(
    finishWelcome(other, { runId, action: "skip", panel: 1 }),
  ).rejects.toMatchObject({ status: 404 });
  expect(
    welcomeFinishSchema.safeParse({ runId, action: "complete", panel: 2 })
      .success,
  ).toBe(false);
  expect(
    welcomeFinishSchema.safeParse({
      runId,
      action: "skip",
      panel: 1,
      userId: other,
    }).success,
  ).toBe(false);
});
it("keeps onboarding rows private and read-only to browsers", async () => {
  const rows =
    await db.operator`select c.relname,c.relrowsecurity,has_table_privilege('authenticated',c.oid,'INSERT') as write from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='practice_game' and c.relname in ('welcome_state','welcome_runs')`;
  expect(rows).toHaveLength(2);
  expect(rows.every((row) => row.relrowsecurity && !row.write)).toBe(true);
  await db.operator.begin(async (sql) => {
    await sql.unsafe("set local role authenticated");
    await sql`select set_config('request.jwt.claims',${JSON.stringify({ sub: other })},true)`;
    expect(
      await sql`select * from practice_game.welcome_runs where user_id=${user}`,
    ).toHaveLength(0);
  });
});
