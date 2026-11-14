import { beforeAll, afterAll, beforeEach, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import {
  startPlayPostgres,
  PLAY_TEST_USER,
} from "../../tests/fixtures/play-postgres";
import { onboardAccount } from "./account-onboarding";
import { deliverNotification } from "./notifications";
import { ApprovalEmailError } from "./approval-email";
const h = vi.hoisted(() => ({ db: vi.fn(), send: vi.fn() }));
vi.mock("@/lib/reporting-db", () => ({
  reportingDb: h.db,
  reportingConfigured: () => true,
}));
vi.mock("@/lib/approval-email", async (original) => ({
  ...(await original<typeof import("./approval-email")>()),
  sendApprovalEmail: h.send,
}));
let pg: Awaited<ReturnType<typeof startPlayPostgres>>;
beforeAll(async () => {
  pg = await startPlayPostgres({ baseOnly: true });
  await pg.operator
    .unsafe(`alter table auth.users add column email text; create schema interview_admin;
    create table interview_admin.reporting_state(singleton boolean primary key default true,started_at timestamptz default now()); insert into interview_admin.reporting_state default values;
    create view interview_admin.registered_users as select id,email from auth.users;
    create table interview_admin.beta_invites(email text primary key,approved boolean);
    grant usage on schema interview_admin to mockmeai_reporting;`);
  await pg.operator.unsafe(
    await readFile(
      "supabase/migrations/20261114014037_beta_notifications.sql",
      "utf8",
    ),
  );
  h.db.mockReturnValue(pg.runtime);
}, 60000);
afterAll(async () => {
  await pg?.close();
  vi.unstubAllEnvs();
});
beforeEach(async () => {
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("ADMIN_USER_ID", "");
  vi.stubEnv("ADMIN_TEST_USER_IDS", "");
  await pg.operator`truncate interview_admin.notifications,interview_admin.account_onboarding`;
  h.send.mockReset().mockResolvedValue("provider-id");
});
it("queues exactly one welcome and one owner alert under concurrent logins", async () => {
  await Promise.all([
    onboardAccount(PLAY_TEST_USER, "person@example.test"),
    onboardAccount(PLAY_TEST_USER, "person@example.test"),
  ]);
  const rows =
    await pg.operator`select * from interview_admin.notifications order by kind`;
  expect(rows).toHaveLength(2);
  expect(rows.find((r) => r.kind === "new_user")?.recipient).toBe(
    "ruchiii75@gmail.com",
  );
  expect(rows.find((r) => r.kind === "welcome")?.recipient).toBe(
    "person@example.test",
  );
  expect(h.send).not.toHaveBeenCalled();
});
it("does not send in Preview or for excluded accounts", async () => {
  vi.stubEnv("VERCEL_ENV", "preview");
  await onboardAccount(PLAY_TEST_USER, "person@example.test");
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("ADMIN_USER_ID", PLAY_TEST_USER);
  await onboardAccount(PLAY_TEST_USER, "person@example.test");
  expect(
    await pg.operator`select * from interview_admin.notifications`,
  ).toHaveLength(0);
});
it("fences delivery, retries with the same stable key, and never resends success", async () => {
  await onboardAccount(PLAY_TEST_USER, "person@example.test");
  const [row] =
    await pg.operator`select id from interview_admin.notifications where kind='welcome'`;
  h.send.mockRejectedValueOnce(new ApprovalEmailError("network_or_timeout"));
  await deliverNotification(row.id);
  expect(
    (
      await pg.operator`select status from interview_admin.notifications where id=${row.id}`
    )[0].status,
  ).toBe("failed");
  await Promise.all([deliverNotification(row.id), deliverNotification(row.id)]);
  await deliverNotification(row.id);
  expect(h.send).toHaveBeenCalledTimes(2);
  expect(h.send.mock.calls.every((c) => c[0] === row.id)).toBe(true);
});
it("stops retrying after the provider idempotency window", async () => {
  await onboardAccount(PLAY_TEST_USER, "person@example.test");
  const [row] =
    await pg.operator`update interview_admin.notifications set status='failed',first_attempt_at=now()-interval '24 hours' returning id`;
  await deliverNotification(row.id);
  expect(h.send).not.toHaveBeenCalled();
});
it("keeps the outbox private from browser roles", async () => {
  await expect(
    pg.operator.begin(async (tx) => {
      await tx`set local role authenticated`;
      return tx`select * from interview_admin.notifications`;
    }),
  ).rejects.toThrow();
});
