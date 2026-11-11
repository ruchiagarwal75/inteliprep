import "server-only";
import { z } from "zod";
import { requireAdminIdentity } from "@/lib/admin-auth";
import { reportingDb } from "@/lib/reporting-db";
import { recordScope, userScope } from "@/lib/admin-scope";
import { ADMIN_PAGE_SIZE } from "@/lib/admin-query";
import { adminFeedbackSchema, type AdminInterview } from "@/lib/admin-records";

export async function adminUserDetail(
  id: string,
  page = 1,
  includeExcluded = false,
) {
  await requireAdminIdentity();
  z.uuid().parse(id);
  const sql = reportingDb(),
    scope = recordScope(includeExcluded);
  const users = await sql<
    { id: string; email: string | null; signupAt: string }[]
  >`select u.id,u.email,u.created_at::text as "signupAt" from interview_admin.registered_users u where u.id=${id} and ${userScope(includeExcluded)}`;
  const user = users[0];
  if (!user) return undefined;
  const [interviews, counts] = await Promise.all([
    sql<
      AdminInterview[]
    >`select i.id,i.problem_id as "problemId",i.level,i.status,i.started_at::text as "startedAt",i.last_activity_at::text as "lastActivityAt",i.ended_at::text as "endedAt",
      i.first_response_at::text as "firstResponseAt",i.design_presented_at::text as "designPresentedAt",i.feedback_status as "feedbackStatus",i.feedback,i.coverage,i.is_test as "isTest",i.not_scored_reason as "notScoredReason",
      (select jsonb_build_object('id',id,'userId',user_id,'interviewId',interview_id,'source',source,'skipped',skipped,'liked',liked,'wouldReturn',would_return,'inputPreference',input_preference,'comment',comment,'createdAt',created_at,'updatedAt',updated_at) from interview_admin.feedback where interview_id=i.id and user_id=i.user_id and ${scope}) as "practiceFeedback",
      (select jsonb_build_object('totalCalls',count(*),'pricedCalls',count(estimated_cost_usd),'knownUsd',sum(estimated_cost_usd),'unknownCalls',count(*) filter(where estimated_cost_usd is null)) from interview_admin.ai_calls where interview_id=i.id and ${scope}) as cost,
      (select jsonb_build_object('operation',operation,'category',category,'referenceId',reference_id,'occurredAt',occurred_at,'source',source) from interview_admin.failures where interview_id=i.id and ${scope} order by occurred_at desc limit 1) as failure
      from interview_admin.interviews i where i.user_id=${id} and ${scope} order by i.started_at desc nulls last,i.id limit ${ADMIN_PAGE_SIZE} offset ${(page - 1) * ADMIN_PAGE_SIZE}`,
    sql<
      { count: number }[]
    >`select count(*)::int as count from interview_admin.interviews where user_id=${id} and ${scope}`,
  ]);
  return {
    user,
    interviews: interviews.map((item) => ({
      ...item,
      feedback: adminFeedbackSchema.safeParse(item.feedback).data ?? null,
    })),
    total: counts[0]?.count ?? 0,
    page,
    pageSize: ADMIN_PAGE_SIZE,
  };
}
