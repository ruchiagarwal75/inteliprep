vi.unmock("@/lib/mock-start-access");
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import type postgres from "postgres";
import { readFile } from "node:fs/promises";
import {
  startPlayPostgres,
  PLAY_TEST_USER as user,
  PLAY_OTHER_USER as admin,
} from "./fixtures/play-postgres";
import {
  mockTrials,
  recordMockViews,
  requestMockTrial,
} from "@/lib/mock-trial-store";
import { changeMockTrial } from "@/lib/admin-mock-trial-write";
import { requireAdminIdentity } from "@/lib/admin-auth";
import { AdminAccessError } from "@/lib/admin-auth";
import { withMockStartAccess } from "@/lib/mock-start-access";
import { withCandidateIdentity } from "@/lib/candidate-context";
import { createInterviewStart, getProblem } from "@/lib/problems";
import { mockAccess } from "@/lib/mock-access-store";
import { reserveMockBudget } from "@/lib/mock-budget";
import { adminMockTrials } from "@/lib/admin-mock-trials";
import { adminQuery } from "@/lib/admin-query";
let db: Awaited<ReturnType<typeof startPlayPostgres>>,
  runtime: ReturnType<typeof postgres>;
vi.mock("@/lib/reporting-db", () => ({
  reportingDb: () => runtime,
  reportingConfigured: () => false,
}));
vi.mock("@/lib/admin-auth", async (original) => ({
  ...(await original<typeof import("@/lib/admin-auth")>()),
  requireAdminIdentity: vi.fn(),
}));
vi.mock("@/lib/mock-budget", () => ({
  reserveMockBudget: vi.fn(),
  bindMockBudget: vi.fn(),
}));
beforeAll(async () => {
  db = await startPlayPostgres();
  runtime = db.runtime;
  await db.operator
    .unsafe(`create table interview_admin.registered_users(id uuid primary key,email text);
    create table interview_admin.interviews(id uuid primary key,user_id uuid,problem_id text,environment text,status text,started_at timestamptz);
    grant select on interview_admin.registered_users,interview_admin.interviews to mockmeai_reporting;`);
  await db.operator`insert into interview_admin.registered_users(id,email) values(${user},'trial@example.invalid'),(${admin},'admin@example.invalid')`;
}, 30000);
afterAll(async () => db?.close());
beforeEach(async () => {
  vi.stubEnv("VERCEL_ENV", "development");
  vi.stubEnv("ADMIN_USER_ID", admin);
  vi.mocked(requireAdminIdentity).mockResolvedValue(admin);
  vi.mocked(reserveMockBudget).mockResolvedValue(undefined);
  await db.operator`delete from interview_admin.mock_beta_grants`;
  await db.operator`delete from interview_admin.mock_beta_requests`;
  await db.operator`delete from interview_admin.interviews`;
});
async function request(problemId = "url-shortener", owner = user) {
  await requestMockTrial(owner, problemId);
  const [row] = await db.operator<
    { id: string; version: number }[]
  >`select id,version from interview_admin.mock_beta_requests where user_id=${owner} and problem_id=${problemId}`;
  if (!row) throw Error("Missing test request");
  return row;
}
async function approve(problemId = "url-shortener", owner = user) {
  const row = await request(problemId, owner);
  await changeMockTrial({
    requestId: row.id,
    expectedVersion: row.version,
    action: "approve",
    commandId: crypto.randomUUID(),
  });
  return row;
}
const selection = () => ({
  problemId: "url-shortener",
  level: "senior" as const,
  durationMinutes: 45 as const,
  requestId: crypto.randomUUID(),
});
function create() {
  const problem = getProblem("url-shortener");
  if (!problem) throw Error("Missing problem");
  return Promise.resolve({
    interview: createInterviewStart(problem, "senior"),
  });
}
it("deduplicates views and requests, preserving the original request date and version", async () => {
  await recordMockViews(user, ["url-shortener", "url-shortener"]);
  const row = await request();
  await recordMockViews(user, ["url-shortener"]);
  await request();
  const rows =
    await db.operator`select * from interview_admin.mock_beta_requests`;
  expect(rows).toHaveLength(1);
  expect(rows[0].version).toBe(row.version);
  expect((await mockTrials(user))[0]).toEqual({
    problemId: "url-shortener",
    state: "requested",
  });
  expect(await mockTrials(admin)).toEqual([]);
});
it("requires admin authority, rejects stale decisions and retries approvals without adding credits", async () => {
  const row = await request();
  const command = {
    requestId: row.id,
    expectedVersion: row.version,
    action: "approve",
    commandId: crypto.randomUUID(),
  };
  vi.mocked(requireAdminIdentity).mockRejectedValueOnce(
    new AdminAccessError(403),
  );
  await expect(changeMockTrial(command)).rejects.toMatchObject({ status: 403 });
  await changeMockTrial(command);
  await changeMockTrial(command);
  expect(
    await db.operator`select * from interview_admin.mock_beta_grants`,
  ).toHaveLength(1);
  await expect(
    changeMockTrial({ ...command, commandId: crypto.randomUUID() }),
  ).rejects.toMatchObject({ status: 409 });
  expect((await mockTrials(user))[0]?.state).toBe("approved");
});
it("serializes simultaneous starts to one trial and replays the original start after revocation", async () => {
  const row = await approve();
  const input = selection();
  const secondInput = selection();
  const responses = await withCandidateIdentity(user, () =>
    Promise.allSettled([
      withMockStartAccess(input, create),
      withMockStartAccess(secondInput, create),
    ]),
  );
  expect(responses.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const winner = responses.findIndex((r) => r.status === "fulfilled");
  const first = responses[winner];
  if (first?.status !== "fulfilled") throw Error("No start won");
  const sessionId = first.value.interview.sessionId;
  expect((await mockTrials(user))[0]).toEqual({
    problemId: "url-shortener",
    state: "used",
    sessionId,
  });
  await changeMockTrial({
    requestId: row.id,
    expectedVersion: row.version + 2,
    action: "revoke",
    commandId: crypto.randomUUID(),
  });
  const replay = vi.fn(async () => first.value);
  await withCandidateIdentity(user, () =>
    withMockStartAccess(winner === 0 ? input : secondInput, replay),
  );
  expect(replay).toHaveBeenCalledExactlyOnceWith(sessionId);
  await expect(
    withCandidateIdentity(user, () => withMockStartAccess(selection(), create)),
  ).rejects.toMatchObject({ status: 403 });
  // Approving the same old command never refills a consumed credit.
  expect((await mockAccess(user)).freeBossUsedAt).toBeNull();
});
it("does not consume a trial on budget or publication failure", async () => {
  await approve();
  vi.mocked(reserveMockBudget).mockRejectedValueOnce(Error("Budget cap"));
  await expect(
    withCandidateIdentity(user, () => withMockStartAccess(selection(), create)),
  ).rejects.toThrow("Budget cap");
  await expect(
    withCandidateIdentity(user, () =>
      withMockStartAccess(selection(), async () => {
        throw Error("Publication failed");
      }),
    ),
  ).rejects.toThrow("Publication failed");
  expect((await mockTrials(user))[0]?.state).toBe("approved");
  expect(
    await db.operator`select * from interview_admin.mock_beta_grants where consumed_session_id is not null`,
  ).toHaveLength(0);
});
it("scopes a trial to its user, environment and problem, while revocation survives candidate retries", async () => {
  const row = await approve();
  await expect(
    withCandidateIdentity(admin, () =>
      withMockStartAccess(selection(), create),
    ),
  ).rejects.toMatchObject({ status: 403 });
  await expect(
    withCandidateIdentity(user, () =>
      withMockStartAccess(
        { ...selection(), problemId: "file-storage" },
        create,
      ),
    ),
  ).rejects.toMatchObject({ status: 403 });
  vi.stubEnv("VERCEL_ENV", "preview");
  await expect(
    withCandidateIdentity(user, () => withMockStartAccess(selection(), create)),
  ).rejects.toMatchObject({ status: 403 });
  vi.stubEnv("VERCEL_ENV", "development");
  await changeMockTrial({
    requestId: row.id,
    expectedVersion: row.version + 1,
    action: "revoke",
    commandId: crypto.randomUUID(),
  });
  await request();
  expect((await mockTrials(user))[0]?.state).toBe("revoked");
  await expect(
    withCandidateIdentity(user, () => withMockStartAccess(selection(), create)),
  ).rejects.toMatchObject({ status: 403 });
});
it("can explicitly grant another trial after use, and cannot reuse a command for another question", async () => {
  const row = await approve();
  await withCandidateIdentity(user, () =>
    withMockStartAccess(selection(), create),
  );
  const commandId = crypto.randomUUID();
  await changeMockTrial({
    requestId: row.id,
    expectedVersion: row.version + 2,
    action: "approve",
    commandId,
  });
  expect((await mockTrials(user))[0]?.state).toBe("approved");
  const other = await request("file-storage");
  await expect(
    changeMockTrial({
      requestId: other.id,
      expectedVersion: other.version,
      action: "approve",
      commandId,
    }),
  ).rejects.toMatchObject({ status: 400 });
});
it("reapplies the migration without data loss and denies direct browser roles", async () => {
  await approve();
  await db.operator.unsafe(
    await readFile(
      "supabase/migrations/20261115081547_play_mock_beta_access.sql",
      "utf8",
    ),
  );
  expect((await mockTrials(user))[0]?.state).toBe("approved");
  for (const role of ["anon", "authenticated"]) {
    await expect(
      db.operator.begin(async (sql) => {
        await sql.unsafe(`set local role ${role}`);
        await sql`select * from interview_admin.mock_beta_requests`;
      }),
    ).rejects.toThrow();
  }
  await expect(
    runtime`delete from interview_admin.mock_beta_requests`,
  ).rejects.toThrow();
});
it("reports unique interest and persisted trial outcomes, excluding admin activity by default", async () => {
  await approve();
  const created = await withCandidateIdentity(user, () =>
    withMockStartAccess(selection(), create),
  );
  await db.operator`insert into interview_admin.interviews(id,user_id,problem_id,environment,status,started_at) values(${created.interview.sessionId},${user},'url-shortener','development','completed',now()),(${crypto.randomUUID()},${user},'url-shortener','development','unfinished',now())`;
  await approve("file-storage", admin);
  const data = await adminMockTrials(
    adminQuery(new URLSearchParams("search=trial%40example.invalid")),
  );
  expect(data.total).toBe(1);
  expect(data.rows[0]?.email).toBe("trial@example.invalid");
  expect(data.demand).toEqual([
    {
      problemId: "url-shortener",
      seen: 1,
      requested: 1,
      approved: 1,
      started: 1,
      completed: 1,
      repeat: 1,
    },
  ]);
  const all = await adminMockTrials(
    adminQuery(new URLSearchParams("includeExcluded=1")),
  );
  expect(all.total).toBe(2);
  vi.mocked(requireAdminIdentity).mockRejectedValueOnce(
    new AdminAccessError(403),
  );
  await expect(
    adminMockTrials(adminQuery(new URLSearchParams())),
  ).rejects.toMatchObject({ status: 403 });
});
