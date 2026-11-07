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
import { elapsedInterviewTime } from "@/lib/reporting-duration";
import { withReportingContext } from "@/lib/reporting-context";
const harness = vi.hoisted(() => ({
  sql: undefined as ReturnType<typeof postgres> | undefined,
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
        harness.sql = tx as unknown as ReturnType<typeof postgres>;
        const baseline = await adminOverview();
        const userId = randomUUID();
        await tx`insert into auth.users (id,aud,role,email,created_at,updated_at,is_anonymous) values (${userId},'authenticated','authenticated',${"admin-test-" + userId + "@example.invalid"},now(),now(),false)`;
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
  30_000,
);
