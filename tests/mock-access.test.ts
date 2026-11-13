import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import type postgres from "postgres";
import {
  startPlayPostgres,
  PLAY_TEST_USER as user,
  PLAY_OTHER_USER as other,
} from "./fixtures/play-postgres";
import { mockAccess, recordProInterest } from "@/lib/mock-access-store";
import { changeMockAccess, adminMockAccess } from "@/lib/admin-mock-access";
import { withPlayer } from "@/lib/play/database";
const adminId = "99999999-9999-4999-8999-999999999999";
let db: Awaited<ReturnType<typeof startPlayPostgres>>,
  runtime: ReturnType<typeof postgres>;
const requireAdmin = vi.hoisted(() => vi.fn());
vi.mock("@/lib/reporting-db", () => ({ reportingDb: () => runtime }));
vi.mock("@/lib/admin-auth", () => ({ requireAdminIdentity: requireAdmin }));
beforeAll(async () => {
  db = await startPlayPostgres();
  runtime = db.runtime;
  await db.operator`insert into auth.users(id) values(${adminId})`;
}, 30000);
afterAll(async () => db?.close());
afterEach(() => {
  vi.unstubAllEnvs();
  requireAdmin.mockReset();
});
it("defaults missing plans to Free and treats only the configured admin as Pro", async () => {
  vi.stubEnv("ADMIN_USER_ID", adminId);
  expect((await mockAccess(user)).plan).toBe("free");
  expect(await mockAccess(adminId)).toMatchObject({ plan: "pro", admin: true });
  expect(await mockAccess(other)).toMatchObject({ plan: "free", admin: false });
});
it("records fresh admin changes, with one audit per change and no implicit attempt deletion", async () => {
  requireAdmin.mockResolvedValue(adminId);
  await changeMockAccess(user, { action: "plan", plan: "pro" });
  expect((await mockAccess(user)).plan).toBe("pro");
  await changeMockAccess(user, { action: "plan", plan: "pro" });
  await changeMockAccess(user, { action: "plan", plan: "free" });
  expect((await mockAccess(user)).plan).toBe("free");
  const id = crypto.randomUUID();
  await db.operator`update practice_game.mock_access set free_boss_used_at=now(),free_boss_session_id=${id} where user_id=${user}`;
  await changeMockAccess(user, { action: "reset_free_attempt" });
  await changeMockAccess(user, { action: "reset_free_attempt" });
  expect((await mockAccess(user)).freeBossUsedAt).toBeNull();
  const data = await adminMockAccess(user);
  expect(data.changes).toHaveLength(3);
  expect(
    data.changes.every(
      (row) => row.actor_id === adminId && row.created_at instanceof Date,
    ),
  ).toBe(true);
  requireAdmin.mockRejectedValue(Error("Denied"));
  await expect(
    changeMockAccess(user, { action: "plan", plan: "pro" }),
  ).rejects.toThrow("Denied");
  await expect(adminMockAccess(user)).rejects.toThrow("Denied");
});
it("records Pro interest once without sending mail", async () => {
  await recordProInterest(user);
  const first = (await mockAccess(user)).proInterestAt;
  await recordProInterest(user);
  expect((await mockAccess(user)).proInterestAt).toBe(first);
  expect(first).not.toBeNull();
});
it("enforces row ownership and denies every browser entitlement write", async () => {
  await recordProInterest(other);
  expect(
    await withPlayer(
      user,
      (sql) =>
        sql`select * from practice_game.mock_access where user_id=${other}`,
    ),
  ).toHaveLength(0);
  await expect(
    withPlayer(
      user,
      (sql) =>
        sql`insert into practice_game.mock_access(user_id,plan) values(${other},'pro')`,
    ),
  ).rejects.toMatchObject({ code: "42501" });
  const own = await db.operator.begin(async (sql) => {
    await sql.unsafe("set local role authenticated");
    await sql`select set_config('request.jwt.claims',${JSON.stringify({ sub: user })},true)`;
    return sql`select user_id from practice_game.mock_access`;
  });
  expect(own.map((row) => row.user_id)).toEqual([user]);
  for (const statement of [
    "update practice_game.mock_access set plan='pro'",
    "delete from practice_game.boss_attempts",
    "insert into practice_game.mock_access_changes(id,user_id,action) values(gen_random_uuid(),auth.uid(),'free_attempt_reset')",
  ])
    await expect(
      db.operator.begin(async (sql) => {
        await sql.unsafe("set local role authenticated");
        return sql.unsafe(statement);
      }),
    ).rejects.toMatchObject({ code: "42501" });
  await expect(
    withPlayer(
      user,
      (sql) =>
        sql`update practice_game.mock_access_changes set action='plan_changed'`,
    ),
  ).rejects.toMatchObject({ code: "42501" });
});
