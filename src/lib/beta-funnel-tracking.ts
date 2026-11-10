import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { reportingDb } from "@/lib/reporting-db";
import { deferReporting } from "@/lib/reporting-write";
import { excludedUserIds, reportingEnvironment } from "@/lib/admin-config";
import {
  scoringElapsedSeconds,
  scoringEligibility,
} from "@/lib/scoring-eligibility";
import type { SharedSessionRecord } from "@/lib/shared-session-record";

type Milestone = {
  userId: string;
  interviewId?: string;
  event: "signed_in" | "score_threshold_passed" | "scorecard_opened";
  subject: string;
  isTest?: boolean;
  at?: string;
};
export async function recordFunnelMilestone(event: Milestone) {
  const sql = reportingDb();
  const subject = createHash("sha256")
    .update(event.event + ":" + event.subject)
    .digest("hex");
  await sql`insert into interview_admin.beta_funnel_events(id,user_id,interview_id,environment,is_test,event,subject_key,occurred_at)
 values(${randomUUID()},${event.userId},${event.interviewId ?? null},${reportingEnvironment()},${Boolean(event.isTest) || excludedUserIds().includes(event.userId)},${event.event},${subject},${event.at ?? new Date().toISOString()})
 on conflict(environment,user_id,event,subject_key) do nothing`;
}
export function observeSignedIn(userId: string, sessionId: unknown) {
  if (!z.uuid().safeParse(sessionId).success || typeof sessionId !== "string")
    return;
  deferReporting(() =>
    recordFunnelMilestone({ userId, event: "signed_in", subject: sessionId }),
  );
}
export async function recordScoringThreshold(
  record: SharedSessionRecord,
  activityAt: string | null,
) {
  const saved = record.checkpoint,
    at = saved.ending?.endedAt ?? activityAt;
  if (!saved.ownerUserId || !saved.timing || !at) return;
  if (
    !scoringEligibility(
      saved.timing.durationMinutes,
      scoringElapsedSeconds(saved.timing, at),
      saved.answeredStages?.length ?? 0,
    ).eligible
  )
    return;
  await recordFunnelMilestone({
    userId: saved.ownerUserId,
    interviewId: saved.id,
    event: "score_threshold_passed",
    subject: saved.id,
    isTest: saved.timing.durationMinutes === 1,
    at,
  });
}
export async function recordScorecardOpened(
  userId: string,
  interviewId: string,
) {
  const sql = reportingDb();
  const rows = await sql<
    { isTest: boolean }[]
  >`select is_test as "isTest" from interview_admin.interviews where id=${interviewId} and user_id=${userId} and environment=${reportingEnvironment()} and status='completed' and feedback_status='generated' and not_scored_reason is null`;
  if (!rows[0]) return false;
  await recordFunnelMilestone({
    userId,
    interviewId,
    event: "scorecard_opened",
    subject: interviewId,
    isTest: rows[0].isTest,
  });
  return true;
}
