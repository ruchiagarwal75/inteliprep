import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { expect, it, vi } from "vitest";
import type { SharedSessionRecord } from "@/lib/shared-session-record";
import { trackInterview } from "@/lib/interview-tracking";
import { recordFailure } from "@/lib/reporting-failures";
import { recordAiCall } from "@/lib/reporting-ai";
import { explicitlyExitInterview } from "@/lib/interview-exit";
import { adminOverview } from "@/lib/admin-overview";
import { adminUsers } from "@/lib/admin-users";
import { adminUserDetail } from "@/lib/admin-user-detail";
import {
  adminInvites,
  adminInviteQuery,
  setBetaInvite,
} from "@/lib/admin-invites";
import { elapsedInterviewTime } from "@/lib/reporting-duration";
import { withReportingContext } from "@/lib/reporting-context";
import { deliverApprovalEmail } from "@/lib/approval-email-delivery";
import { ApprovalEmailError } from "@/lib/approval-email";
import { trackAppViewer } from "@/lib/viewer-tracking";
import { adminVisitors } from "@/lib/admin-visitors";
const harness = vi.hoisted(() => ({
  sql: undefined as ReturnType<typeof postgres> | undefined,
  send: vi.fn(),
}));
vi.mock("@/lib/approval-email", async (original) => ({
  ...(await original<typeof import("@/lib/approval-email")>()),
  sendApprovalEmail: harness.send,
}));
vi.mock("@/lib/reporting-db", () => ({
  reportingConfigured: () => true,
  reportingDb: () => {
    if (!harness.sql) throw Error("Missing live test transaction");
    return harness.sql;
  },
}));
vi.mock("@/lib/admin-auth", () => ({
  requireAdminIdentity: async () => process.env.ADMIN_USER_ID,
}));

it.skipIf(process.env.INTELIPREP_ADMIN_DB_TEST !== "1")(
  "checks persisted reporting against the real schema, then rolls back only its own fixtures",
  async () => {
    process.loadEnvFile(".env.local");
    const connection = process.env.SUPABASE_CONNECTION_STRING;
    if (!connection) throw new Error("Live database configuration is missing");
    const adminId = process.env.ADMIN_USER_ID;
    if (!adminId)
      throw new Error("Live admin identity configuration is missing");
    const sql = postgres(connection, {
      prepare: false,
      max: 1,
      ssl: {
        ca: readFileSync("certificates/supabase-root-2021.crt", "utf8"),
        rejectUnauthorized: true,
      },
      onnotice: () => {},
    });
    const rollback = Symbol("rollback test fixtures");
    try {
      await sql.begin(async (tx) => {
        harness.send.mockResolvedValue("provider-email-fixture");
        harness.sql = new Proxy(tx, {
          get(target, key) {
            return key === "begin"
              ? target.savepoint.bind(target)
              : Reflect.get(target, key);
          },
        }) as unknown as ReturnType<typeof postgres>;
        const baseline = await adminOverview();
        const userId = randomUUID();
        await tx`insert into auth.users (id,aud,role,email,created_at,updated_at,is_anonymous) values (${userId},'authenticated','authenticated',${"admin-test-" + userId + "@example.invalid"},now(),now(),false)`;
        const email = "admin-test-" + userId + "@example.invalid";
        const search = adminInviteQuery(new URLSearchParams({ search: email }));
        const awaiting = await adminInvites(search);
        expect(awaiting.pendingTotal).toBe(1);
        expect(awaiting.pending[0]).toMatchObject({ id: userId, email });
        expect(awaiting.total).toBe(0);
        const firstApproval = await setBetaInvite({
          email: email.toUpperCase(),
          approved: true,
        });
        expect(firstApproval.notification?.status).toBe("sent");
        const originalNotificationId = firstApproval.notification?.id;
        expect(harness.send).toHaveBeenCalledTimes(1);
        await setBetaInvite({ email, approved: true });
        expect(harness.send).toHaveBeenCalledTimes(1);
        const outbox =
          await tx`select count(*)::int as count from interview_admin.beta_approval_emails where email=${email}`;
        expect(outbox[0].count).toBe(1);
        const approved = await adminInvites(search);
        expect(approved.pendingTotal).toBe(0);
        expect(approved.invites).toHaveLength(1);
        expect(approved.invites[0].approved).toBe(true);
        await setBetaInvite({ email, approved: false });
        const revoked = await adminInvites(search);
        expect(revoked.pendingTotal).toBe(0);
        expect(revoked.invites[0].approved).toBe(false);
        if (!originalNotificationId)
          throw Error("Missing fixture notification");
        expect(await deliverApprovalEmail(originalNotificationId)).toBeNull();
        harness.send.mockRejectedValueOnce(
          new ApprovalEmailError("provider_unavailable", 503),
        );
        const failedEmail = await setBetaInvite({ email, approved: true });
        expect(failedEmail.invite.approved).toBe(true);
        expect(failedEmail.notification?.status).toBe("failed");
        const retryId = failedEmail.notification?.id;
        if (!retryId) throw Error("Missing retry fixture");
        expect(retryId).not.toBe(originalNotificationId);
        expect((await deliverApprovalEmail(retryId))?.status).toBe("sent");
        expect(harness.send).toHaveBeenCalledTimes(3);
        await deliverApprovalEmail(retryId);
        expect(harness.send).toHaveBeenCalledTimes(3);
        const old =
          await tx`select status from interview_admin.beta_approval_emails where id=${originalNotificationId}`;
        expect(old[0].status).toBe("sent");
        const owner =
          await tx`select email from interview_admin.registered_users where id=${adminId}`;
        if (owner[0]?.email) {
          const own = await adminInvites(
            adminInviteQuery(new URLSearchParams({ search: owner[0].email })),
          );
          expect(own.pending.some((account) => account.id === adminId)).toBe(
            false,
          );
        }
        const context = { requestId: randomUUID(), route: "/api/chat", userId };
        const start = Date.now() - 1_200_000;
        const iso = (offset: number) =>
          new Date(start + offset * 1000).toISOString();
        const record = (id: string, endedAt?: string): SharedSessionRecord => ({
          checkpoint: {
            id,
            ownerUserId: userId,
            problemId: "single-server-scaling",
            level: "mid",
            phaseIndex: 0,
            coveredCriteria: [],
            timing: {
              startedAt: iso(0),
              deadlineAt: iso(2700),
              durationMinutes: 45,
            },
            ...(endedAt
              ? { ending: { endedAt, snapshotHash: "f".repeat(64) } }
              : {}),
          },
        });
        const completed = record(randomUUID(), iso(730));
        const abandoned = record(randomUUID());
        const exited = record(randomUUID());
        const incompleteTiming = record(randomUUID(), iso(800));
        incompleteTiming.checkpoint.timing = undefined;
        await withReportingContext(context, async () => {
          await trackInterview(completed, { started: true, grading: true });
          await trackInterview(completed, { started: true, grading: true });
          await trackInterview(abandoned, {
            started: true,
            activity: { firstResponse: true, designPresented: true },
          });
          await tx`update interview_admin.interviews set last_activity_at=${iso(180)} where id=${abandoned.checkpoint.id}`;
          await trackInterview(exited, { started: true });
          const exit = await explicitlyExitInterview(
            exited.checkpoint.id,
            userId,
          );
          const repeatedExit = await explicitlyExitInterview(
            exited.checkpoint.id,
            userId,
          );
          expect(exit?.status).toBe("exited");
          expect(repeatedExit?.endedAt).toBe(exit?.endedAt);
          expect(
            await explicitlyExitInterview(exited.checkpoint.id, randomUUID()),
          ).toBeUndefined();
          await trackInterview(incompleteTiming);
        });
        const failureContext = {
          ...context,
          interviewId: completed.checkpoint.id,
        };
        await recordFailure(
          {
            operation: "feedback",
            category: "provider_unavailable",
            referenceId: "provider-fixture-503",
          },
          failureContext,
        );
        await recordFailure(
          {
            operation: "feedback",
            category: "provider_unavailable",
            referenceId: "provider-fixture-503",
          },
          failureContext,
        );
        let detail = await adminUserDetail(userId);
        const failedFeedback = detail?.interviews.find(
          (row) => row.id === completed.checkpoint.id,
        );
        expect(failedFeedback?.status).toBe("completed");
        expect(failedFeedback?.feedbackStatus).toBe("failed");
        expect(failedFeedback?.failure?.referenceId).toBe(
          "provider-fixture-503",
        );
        expect(
          detail?.interviews.find(
            (row) => row.id === incompleteTiming.checkpoint.id,
          )?.startedAt,
        ).toBeNull();
        const estimated = detail?.interviews.find(
          (row) => row.id === abandoned.checkpoint.id,
        );
        if (!estimated) throw Error("Missing unfinished fixture");
        expect(elapsedInterviewTime(estimated).seconds).toBe(180);
        const now = new Date().toISOString();
        const call = {
          id: randomUUID(),
          context: failureContext,
          operation: "feedback",
          model: "gpt-4o",
          startedAt: now,
          status: "failed" as const,
          finishedAt: now,
          usage: {
            input_tokens: 1000,
            output_tokens: 100,
            input_tokens_details: { cached_tokens: 200 },
          },
        };
        await recordAiCall(call);
        await recordAiCall(call);
        await recordAiCall({
          ...call,
          status: "pending",
          finishedAt: undefined,
          usage: undefined,
        });
        await recordAiCall({ ...call, id: randomUUID(), status: "completed" });
        await recordAiCall({ ...call, id: randomUUID(), usage: undefined });
        const overview = await adminOverview();
        expect(overview.users.total - baseline.users.total).toBe(1);
        expect(overview.users.newSignups - baseline.users.newSignups).toBe(1);
        expect(overview.users.active - baseline.users.active).toBe(1);
        expect(overview.interviews.started - baseline.interviews.started).toBe(
          4,
        );
        expect(
          overview.interviews.completed - baseline.interviews.completed,
        ).toBe(2);
        expect(overview.interviews.exited - baseline.interviews.exited).toBe(1);
        expect(
          overview.interviews.unfinished - baseline.interviews.unfinished,
        ).toBe(1);
        expect(overview.interviews.averageSeconds).toBe(730);
        expect(overview.interviews.timedCompleted).toBe(1);
        expect(overview.cost.totalCalls - baseline.cost.totalCalls).toBe(3);
        expect(overview.cost.unknownCalls - baseline.cost.unknownCalls).toBe(1);
        expect(overview.cost.knownUsd).toBeCloseTo(
          (baseline.cost.knownUsd ?? 0) + 0.0065,
        );
        const users = await adminUsers({
          search: userId,
          page: 1,
          includeExcluded: false,
        });
        expect(users.users).toHaveLength(1);
        expect(users.users[0].interviewCount).toBe(4);
        detail = await adminUserDetail(userId);
        expect(
          detail?.interviews.find((row) => row.id === completed.checkpoint.id)
            ?.cost.totalCalls,
        ).toBe(3);
        expect(
          overview.failures.filter(
            (item) => item.referenceId === "provider-fixture-503",
          ),
        ).toHaveLength(1);
        await recordFailure(
          {
            operation: "start",
            category: "shared_store_or_configuration",
            referenceId: "failed-before-id",
          },
          context,
        );
        expect((await adminOverview()).interviews.failed).toBe(
          baseline.interviews.failed + 1,
        );
        vi.stubEnv("ADMIN_TEST_USER_IDS", userId);
        expect((await adminOverview()).interviews.started).toBe(
          baseline.interviews.started,
        );
        expect(
          (
            await adminUsers({
              search: userId,
              page: 1,
              includeExcluded: false,
            })
          ).total,
        ).toBe(0);
        expect(
          (await adminUsers({ search: userId, page: 1, includeExcluded: true }))
            .total,
        ).toBe(1);
        const visitsBefore = await adminVisitors(true);
        const browserA = randomUUID(),
          browserB = randomUUID(),
          secondUser = randomUUID();
        await tx`insert into auth.users (id,aud,role,email,created_at,updated_at,is_anonymous)
          values (${secondUser},'authenticated','authenticated',${"viewer-test-" + secondUser + "@example.invalid"},now(),now(),false)`;
        await trackAppViewer(browserA, undefined, false);
        expect((await adminVisitors(true)).anonymousBrowsers).toBe(
          visitsBefore.anonymousBrowsers + 1,
        );
        await trackAppViewer(browserA, userId, false);
        await trackAppViewer(browserB, userId, false);
        await trackAppViewer(browserB, userId, false);
        expect((await adminVisitors(true)).identifiedAccounts).toBe(
          visitsBefore.identifiedAccounts + 1,
        );
        await trackAppViewer(browserA, secondUser, false);
        const visitsAfter = await adminVisitors(true);
        expect(visitsAfter.identifiedAccounts).toBe(
          visitsBefore.identifiedAccounts + 2,
        );
        expect(visitsAfter.total).toBe(visitsBefore.total + 2);
        expect(visitsAfter.anonymousBrowsers).toBe(
          visitsBefore.anonymousBrowsers,
        );
        const visitorPrivileges =
          await tx`select has_table_privilege('anon','interview_admin.app_visitor_accounts','select') as anon,
          has_table_privilege('authenticated','interview_admin.app_visitor_accounts','select') as candidate`;
        expect(visitorPrivileges[0]).toEqual({ anon: false, candidate: false });
        const privileges =
          await tx`select has_table_privilege('anon','interview_admin.interviews','select') as anon,has_table_privilege('authenticated','interview_admin.interviews','select') as candidate`;
        expect(privileges[0]).toEqual({ anon: false, candidate: false });
        throw rollback;
      });
    } catch (cause) {
      if (cause !== rollback) {
        if (cause instanceof Error && cause.name === "AssertionError")
          throw cause;
        throw new Error(
          "Live reporting check failed (sanitized): " +
            (cause && typeof cause === "object" && "code" in cause
              ? String(cause.code)
              : "unexpected failure"),
        );
      }
    } finally {
      harness.sql = undefined;
      vi.unstubAllEnvs();
      await sql.end({ timeout: 2 });
    }
  },
  45_000,
);
