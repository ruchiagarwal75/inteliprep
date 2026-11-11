import "server-only";
import { randomUUID } from "node:crypto";
import { ApiRequestError } from "@/lib/api-request";
import { currentCandidateId } from "@/lib/candidate-context";
import { excludedUserIds, reportingEnvironment } from "@/lib/admin-config";
import { reportingDb } from "@/lib/reporting-db";
import type { PracticeFeedbackInput } from "@/lib/practice-feedback";

function owner() {
  const userId = currentCandidateId();
  if (!userId) throw new ApiRequestError("Sign in to send feedback.", 401);
  return userId;
}

export async function feedbackHandled(interviewId: string) {
  const userId = owner(),
    sql = reportingDb();
  const rows = await sql`select id from interview_admin.feedback
    where user_id=${userId} and interview_id=${interviewId} and environment=${reportingEnvironment()} limit 1`;
  return rows.length > 0;
}

export async function savePracticeFeedback(input: PracticeFeedbackInput) {
  const userId = owner(),
    sql = reportingDb();
  let isTest = excludedUserIds().includes(userId);
  if (input.interviewId) {
    const rows = await sql<
      { isTest: boolean }[]
    >`select is_test as "isTest" from interview_admin.interviews
      where id=${input.interviewId} and user_id=${userId} and environment=${reportingEnvironment()}`;
    if (!rows[0]) throw new ApiRequestError("Interview not found.", 404);
    isTest ||= rows[0].isTest;
  }
  // Skips carry no answers. The comment is deliberately never passed to logging or models.
  const rows = await sql<
    { id: string }[]
  >`insert into interview_admin.feedback as existing
    (id,user_id,interview_id,environment,is_test,source,skipped,liked,would_return,input_preference,comment)
    values (${randomUUID()},${userId},${input.interviewId ?? null},${reportingEnvironment()},${isTest},${input.source},${input.skipped},
      ${input.skipped ? null : (input.liked ?? null)},${input.skipped ? null : (input.wouldReturn ?? null)},${input.skipped ? null : (input.inputPreference ?? null)},${input.skipped ? null : input.comment || null})
    on conflict (user_id,interview_id) do update set
      skipped=excluded.skipped,liked=excluded.liked,would_return=excluded.would_return,input_preference=excluded.input_preference,comment=excluded.comment,
      is_test=existing.is_test or excluded.is_test,updated_at=now()
    returning id`;
  return { id: rows[0]?.id };
}
