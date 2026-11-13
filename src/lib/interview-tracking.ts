import "server-only";
import { observeBossFinish } from "@/lib/boss-lifecycle";
import { setInterviewReference } from "@/lib/reporting-context";
import type { SharedSessionRecord } from "@/lib/shared-session-record";
import { reportingDb } from "@/lib/reporting-db";
import { reportingEnvironment } from "@/lib/admin-config";
import { safeReporting } from "@/lib/reporting-write";
import { recordScoringThreshold } from "@/lib/beta-funnel-tracking";

export type InterviewActivity = {
  firstResponse?: boolean;
  designPresented?: boolean;
};
/** One shared adapter for the small set of interview milestones; IDs deduplicate retries. */
export async function trackInterview(
  record: SharedSessionRecord,
  options: {
    started?: boolean;
    activity?: InterviewActivity;
    grading?: boolean;
  } = {},
) {
  const saved = record.checkpoint;
  if (!saved.ownerUserId) return;
  const now = new Date().toISOString();
  const card = record.scorecard;
  const activityAt =
    options.activity || (options.grading && !card)
      ? now
      : (saved.ending?.endedAt ??
        (options.started ? saved.timing?.startedAt : null));
  const firstAt = options.activity?.firstResponse ? now : null;
  const designAt = options.activity?.designPresented ? now : null;
  // Reuse validated feedback without copying candidate quotes or the transcript into reporting.
  const feedback = card
    ? {
        summary: card.summary,
        signal: card.signal,
        areas: card.areas.map(({ area, score, rationale }) => ({
          area,
          score,
          rationale,
        })),
        strengths: card.strengths.map((item) => item.text),
        gaps: card.gaps.map((item) => item.text),
      }
    : null;
  await safeReporting(async () => {
    const sql = reportingDb();
    await sql`insert into interview_admin.interviews as existing
      (id,user_id,environment,is_test,coverage,problem_id,level,status,started_at,deadline_at,last_activity_at,ended_at,first_response_at,design_presented_at,feedback_status,feedback_generated_at,feedback,not_scored_reason)
      values (${saved.id},${saved.ownerUserId ?? null},${reportingEnvironment()},${saved.timing?.durationMinutes === 1},${options.started ? "full" : "partial"},${saved.problemId},${saved.level},${saved.ending ? "completed" : "unfinished"},${saved.timing?.startedAt ?? null},${saved.timing?.deadlineAt ?? null},${activityAt ?? null},${saved.ending?.endedAt ?? null},${firstAt},${designAt},${card ? "generated" : options.grading ? "pending" : "none"},${card ? now : null},${feedback ? sql.json(feedback) : null},${card?.notScoredReason ?? null})
      on conflict (id) do update set
        not_scored_reason=coalesce(existing.not_scored_reason,excluded.not_scored_reason),
        started_at=coalesce(existing.started_at,excluded.started_at),
        deadline_at=coalesce(existing.deadline_at,excluded.deadline_at),
        last_activity_at=greatest(existing.last_activity_at,excluded.last_activity_at),
        ended_at=coalesce(existing.ended_at,excluded.ended_at),
        status=case when existing.status='unfinished' then excluded.status else existing.status end,
        first_response_at=coalesce(existing.first_response_at,excluded.first_response_at),
        design_presented_at=coalesce(existing.design_presented_at,excluded.design_presented_at),
        feedback_status=case when existing.feedback_status='generated' then 'generated' when excluded.feedback_status='none' then existing.feedback_status else excluded.feedback_status end,
        feedback_generated_at=coalesce(existing.feedback_generated_at,excluded.feedback_generated_at),
        feedback=coalesce(existing.feedback,excluded.feedback)
      where existing.user_id=excluded.user_id`;
    await recordScoringThreshold(record, activityAt ?? null);
  });
  await observeBossFinish(record);
}

export async function trackCurrentInterview(
  id: string,
  options: Parameters<typeof trackInterview>[1] = {},
) {
  await safeReporting(async () => {
    const { exportSessionRecord } =
      await import("@/lib/interview-session-record");
    const record = exportSessionRecord(id);
    setInterviewReference(id, record.checkpoint.timing?.durationMinutes === 1);
    await trackInterview(record, options);
  });
}
