import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { expect, it, vi } from "vitest";
import { adminBetaFunnel } from "@/lib/admin-beta-funnel";
import { betaFunnelQuery } from "@/lib/beta-funnel-query";
import {
  recordFunnelMilestone,
  recordScoringThreshold,
  recordScorecardOpened,
} from "@/lib/beta-funnel-tracking";
import { reportingEnvironment } from "@/lib/admin-config";
import { createInterviewStart, getProblem } from "@/lib/problems";
import { exportSessionRecord } from "@/lib/interview-session-record";
import { createInterviewTiming } from "@/lib/interview-timer";
import { withCandidateIdentity } from "@/lib/candidate-context";
import { savePracticeFeedback } from "@/lib/feedback-store";
vi.hoisted(() => vi.resetModules());
const harness = vi.hoisted(() => ({
  sql: undefined as ReturnType<typeof postgres> | undefined,
}));
vi.mock("@/lib/reporting-db", () => ({
  reportingDb: () => {
    if (!harness.sql) throw Error("Missing fixture transaction");
    return harness.sql;
  },
  reportingConfigured: () => false,
}));
vi.mock("@/lib/admin-auth", () => ({
  requireAdminIdentity: async () => "owner",
}));
it.skipIf(process.env.INTELIPREP_ADMIN_DB_TEST !== "1")(
  "verifies all seven persisted funnel steps, duplicates, dates and exclusions, then rolls back its fixtures",
  async () => {
    process.loadEnvFile(".env.local");
    const connection = process.env.SUPABASE_CONNECTION_STRING;
    if (!connection) throw Error("Missing operator connection");
    const sql = postgres(connection, {
        prepare: false,
        max: 1,
        ssl: {
          rejectUnauthorized: true,
          ca: readFileSync("certificates/supabase-root-2021.crt", "utf8"),
        },
        onnotice: () => {},
      }),
      rollback = Symbol("rollback");
    try {
      await sql.begin(async (tx) => {
        harness.sql = tx as unknown as ReturnType<typeof postgres>;
        const userId = randomUUID(),
          email = `funnel-fixture-${userId}@example.invalid`,
          environment = reportingEnvironment();
        await tx`insert into auth.users(id,email,aud,role,is_anonymous) values(${userId},${email},'authenticated','authenticated',false)`;
        const problem = getProblem("url-shortener");
        if (!problem) throw Error("Missing problem");
        const started = createInterviewStart(problem, "mid"),
          record = exportSessionRecord(started.sessionId),
          id = started.sessionId;
        record.checkpoint.ownerUserId = userId;
        record.checkpoint.timing = createInterviewTiming(
          45,
          Date.parse("2026-11-09T11:30:00Z"),
        );
        record.checkpoint.answeredStages = [0, 2];
        await tx`insert into interview_admin.interviews(id,user_id,environment,is_test,coverage,problem_id,level,status,started_at,ended_at,last_activity_at,feedback_status) values
   (${id},${userId},${environment},false,'full','url-shortener','mid','completed','2026-11-09T11:30Z','2026-11-09T12:00Z','2026-11-09T12:00Z','generated'),
   (${randomUUID()},${userId},${environment},false,'full','url-shortener','mid','unfinished','2026-11-09T13:00Z',null,'2026-11-09T13:00Z','none')`;
        for (let i = 0; i < 2; i++) {
          await recordFunnelMilestone({
            userId,
            event: "signed_in",
            subject: "synthetic-session",
            at: "2026-11-09T11:00:00Z",
          });
          await recordScoringThreshold(record, "2026-11-09T12:00:00Z");
          expect(await recordScorecardOpened(userId, id)).toBe(true);
          await withCandidateIdentity(userId, () =>
            savePracticeFeedback({
              source: "interview_end",
              interviewId: id,
              skipped: false,
              liked: "okay",
              comment: "Synthetic feedback verification",
            }),
          );
        }
        // Keep event time deterministic for the date-range check; no production rows are changed.
        await tx`update interview_admin.beta_funnel_events set occurred_at='2026-11-09T12:01Z' where user_id=${userId} and event='scorecard_opened'`;
        await tx`update interview_admin.feedback set updated_at='2026-11-09T12:02Z' where user_id=${userId}`;
        const query = betaFunnelQuery(
          new URLSearchParams({
            from: "2026-11-09",
            to: "2026-11-09",
            search: email,
          }),
        );
        const data = await adminBetaFunnel(query);
        expect(Object.values(data.counts)).toEqual([1, 1, 1, 1, 1, 1, 1]);
        expect(data.users[0]).toMatchObject({
          userId,
          started: 2,
          finished: 1,
          second_started: 1,
          signed_in: 1,
          score_threshold_passed: 1,
          scorecard_opened: 1,
          sent_feedback: 1,
        });
        expect(
          (
            await adminBetaFunnel({
              ...query,
              from: "2026-11-10",
              to: "2026-11-10",
              until: "2026-11-11T00:00:00Z",
            })
          ).total,
        ).toBe(0);
        vi.stubEnv("ADMIN_TEST_USER_IDS", userId);
        expect((await adminBetaFunnel(query)).total).toBe(0);
        expect(
          (await adminBetaFunnel({ ...query, includeExcluded: true })).total,
        ).toBe(1);
        const access =
          await tx`select has_table_privilege('anon','interview_admin.beta_funnel_events','SELECT') as anonymous_read,has_table_privilege('authenticated','interview_admin.beta_funnel_events','SELECT') as candidate_read`;
        expect(access[0]).toMatchObject({
          anonymous_read: false,
          candidate_read: false,
        });
        throw rollback;
      });
    } catch (cause) {
      if (cause !== rollback) throw cause;
    } finally {
      vi.unstubAllEnvs();
      await sql.end({ timeout: 1 });
    }
  },
  60000,
);
