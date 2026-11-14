import { beforeAll, afterAll, beforeEach, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import {
  startPlayPostgres,
  PLAY_TEST_USER,
} from "../../tests/fixtures/play-postgres";
import { reserveModelBudget, settleModelBudget } from "./ai-budget";
import {
  reserveMockBudget,
  bindMockBudget,
  releaseMockBudget,
} from "./mock-budget";
import { withReportingContext } from "./reporting-context";
import { modelCostReservation } from "./ai-budget-estimate";
import { AiBudgetError } from "./ai-budget-config";
const h = vi.hoisted(() => ({ db: vi.fn(), day: vi.fn(() => "2026-11-14") }));
vi.mock("@/lib/reporting-db", () => ({
  reportingDb: h.db,
  reportingConfigured: () => true,
}));
vi.mock("@/lib/reporting-write", () => ({ deferReporting: vi.fn() }));
vi.mock("@/lib/ai-budget-store", async (original) => ({
  ...(await original<typeof import("./ai-budget-store")>()),
  budgetDay: h.day,
}));
let pg: Awaited<ReturnType<typeof startPlayPostgres>>;
beforeAll(async () => {
  pg = await startPlayPostgres({ baseOnly: true });
  await pg.operator
    .unsafe(`create schema interview_admin; grant usage on schema interview_admin to mockmeai_reporting;
    create table interview_admin.ai_calls(id uuid primary key,environment text,started_at timestamptz,estimated_cost_usd numeric);
    grant select on interview_admin.ai_calls to mockmeai_reporting;
    create table interview_admin.reporting_state(singleton boolean primary key default true);insert into interview_admin.reporting_state default values;
    create view interview_admin.registered_users as select id,null::text as email from auth.users;
    create table interview_admin.beta_invites(email text primary key,approved boolean);`);
  for (const file of [
    "20261114014037_beta_notifications.sql",
    "20261114014509_shared_ai_budget.sql",
  ])
    await pg.operator.unsafe(
      await readFile("supabase/migrations/" + file, "utf8"),
    );
  h.db.mockReturnValue(pg.runtime);
}, 60000);
afterAll(async () => {
  await pg?.close();
  vi.unstubAllEnvs();
});
beforeEach(async () => {
  vi.stubEnv("VERCEL_ENV", "production");
  h.day.mockReturnValue("2026-11-14");
  await pg.operator`truncate interview_admin.ai_budget_reservations,interview_admin.ai_budget_days,interview_admin.notifications,interview_admin.ai_calls`;
});
it("atomically refuses concurrent calls over the shared cap and queues one alert", async () => {
  const results = await Promise.allSettled(
    Array.from({ length: 20 }, () =>
      reserveModelBudget(randomUUID(), 2, false),
    ),
  );
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(12);
  expect(results.filter((r) => r.status === "rejected")).toHaveLength(8);
  const [total] =
    await pg.operator`select sum(held_usd)::float8 as held from interview_admin.ai_budget_reservations`;
  expect(total.held).toBe(24);
  expect(
    await pg.operator`select * from interview_admin.notifications where kind='spend_cap'`,
  ).toHaveLength(1);
});
it("settles once, counts retries, and sends one warning per UTC day", async () => {
  for (let n = 0; n < 3; n++) {
    const call = await reserveModelBudget(randomUUID(), 3, false);
    await settleModelBudget(call, 2.5);
    await settleModelBudget(call, 2.5);
  }
  const [day] =
    await pg.operator`select spent_usd::float8 as spent from interview_admin.ai_budget_days`;
  expect(day.spent).toBe(7.5);
  expect(
    await pg.operator`select * from interview_admin.notifications where kind='spend_warning'`,
  ).toHaveLength(1);
  h.day.mockReturnValue("2026-11-15");
  const call = await reserveModelBudget(randomUUID(), 6, false);
  await settleModelBudget(call, 5.5);
  expect(
    await pg.operator`select * from interview_admin.notifications where kind='spend_warning'`,
  ).toHaveLength(2);
});
it("holds unknown usage instead of treating failed or cancelled calls as free", async () => {
  const call = await reserveModelBudget(randomUUID(), 1, false);
  await settleModelBudget(call, null);
  const [day] =
    await pg.operator`select spent_usd::float8 as spent,uncertain_usd::float8 as uncertain from interview_admin.ai_budget_days`;
  expect(day).toEqual({ spent: 0, uncertain: 1 });
});
it("includes existing Production spend on rollout, including admin and test calls", async () => {
  await pg.operator`insert into interview_admin.ai_calls values(${randomUUID()},'production','2026-11-14T00:01:00Z',24.5)`;
  await expect(
    reserveModelBudget(randomUUID(), 1, false),
  ).rejects.toBeInstanceOf(AiBudgetError);
});
it("reserves one mock hold per request, protects grading, returns unused funds on end", async () => {
  const requestId = randomUUID(),
    interviewId = randomUUID();
  const hold = await pg.runtime.begin(async (tx) => {
    const id = await reserveMockBudget(tx, PLAY_TEST_USER, requestId);
    await bindMockBudget(
      tx,
      id,
      interviewId,
      new Date(Date.now() + 60_000).toISOString(),
    );
    expect(await reserveMockBudget(tx, PLAY_TEST_USER, requestId)).toBe(id);
    return id;
  });
  expect(hold).toBeTruthy();
  // Allocate the rest of the global budget, leaving only this mock's reserved $2.
  await reserveModelBudget(randomUUID(), 23, false);
  const context = {
    requestId: randomUUID(),
    route: "/api/chat",
    userId: PLAY_TEST_USER,
    interviewId,
  };
  await withReportingContext(context, async () => {
    await expect(
      reserveModelBudget(randomUUID(), 1.5, false),
    ).rejects.toBeInstanceOf(AiBudgetError);
    const call = await reserveModelBudget(randomUUID(), 0.5, false);
    await settleModelBudget(call, 0.1);
    // Feedback may use protected headroom when chat cannot.
    const grade = await reserveModelBudget(randomUUID(), 1.5, true);
    await settleModelBudget(grade, 0.2);
  });
  await releaseMockBudget(interviewId);
  const [row] =
    await pg.operator`select settled,held_usd::float8 as held from interview_admin.ai_budget_reservations where id=${hold ?? null}`;
  expect(row).toEqual({ settled: true, held: 0 });
});
it("leaves non-Production isolated and fails closed if its ledger is unavailable", async () => {
  vi.stubEnv("VERCEL_ENV", "preview");
  expect(await reserveModelBudget(randomUUID(), 100, false)).toBeUndefined();
  vi.stubEnv("VERCEL_ENV", "production");
  h.db.mockImplementationOnce(() => {
    throw Error("private");
  });
  await expect(
    reserveModelBudget(randomUUID(), 1, false),
  ).rejects.toMatchObject({ status: 503, retryAfter: 30 });
});
it("prices images conservatively without billing their base64 as text", () => {
  const base = {
    model: "gpt-6.1-sol",
    max_output_tokens: 4096,
    input: [
      {
        role: "user" as const,
        content: [
          {
            type: "input_image" as const,
            detail: "high" as const,
            image_url: "data:image/png;base64," + "A".repeat(100_000),
          },
        ],
      },
    ],
  };
  expect(modelCostReservation(base)).toBeGreaterThan(0.2);
  expect(modelCostReservation({ ...base, input: [] })).toBeLessThan(0.05);
  expect(() =>
    modelCostReservation({ model: "unpriced", input: "test" }),
  ).toThrow(AiBudgetError);
});
