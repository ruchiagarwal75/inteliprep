import "server-only";
import { requireAdminIdentity } from "@/lib/admin-auth";
import { reportingDb } from "@/lib/reporting-db";
import { reportingEnvironment } from "@/lib/admin-config";
import { recordScope, userScope } from "@/lib/admin-scope";
import type {
  AdminFailure,
  AdminOverview,
  CostSummary,
} from "@/lib/admin-records";

export async function adminOverview(
  includeExcluded = false,
): Promise<AdminOverview> {
  await requireAdminIdentity();
  const sql = reportingDb(),
    scope = recordScope(includeExcluded);
  const [
    state,
    users,
    interviews,
    active,
    failedStarts,
    cost,
    activity,
    failures,
  ] = await Promise.all([
    sql<
      { startedAt: Date; now: Date; since: Date }[]
    >`select started_at as "startedAt",now(),now()-interval '7 days' as since from interview_admin.reporting_state`,
    sql<
      { total: number; newSignups: number }[]
    >`select count(*)::int as total,count(*) filter(where u.created_at>=now()-interval '7 days')::int as "newSignups" from interview_admin.registered_users u where ${userScope(includeExcluded)}`,
    sql<
      AdminOverview["interviews"][]
    >`select count(*) filter(where status<>'failed')::int as started,
      count(*) filter(where status='completed')::int as completed,count(*) filter(where status='failed')::int as failed,
      count(*) filter(where not_scored_reason='too_short')::int as "tooShort",
      count(*) filter(where status='unfinished')::int as unfinished,count(*) filter(where status='exited')::int as exited,
      avg(extract(epoch from ended_at-started_at)) filter(where status='completed' and ended_at>=started_at)::float as "averageSeconds",
      count(*) filter(where status='completed' and ended_at>=started_at)::int as "timedCompleted"
      from interview_admin.interviews where ${scope}`,
    sql<{ count: number }[]>`select count(distinct user_id)::int as count from (
      select user_id,last_activity_at as at from interview_admin.interviews where ${scope}
      union all select user_id,occurred_at as at from interview_admin.failures where ${scope} and operation='start'
      ) actions where at>=now()-interval '7 days'`,
    sql<
      { count: number }[]
    >`select count(distinct request_id)::int as count from interview_admin.failures f
        where ${scope} and operation='start' and user_id is not null
        and not exists(select 1 from interview_admin.interviews i where i.id=f.interview_id and i.status='failed')`,
    sql<
      CostSummary[]
    >`select count(*)::int as "totalCalls",count(estimated_cost_usd)::int as "pricedCalls",sum(estimated_cost_usd)::float as "knownUsd",count(*) filter(where estimated_cost_usd is null)::int as "unknownCalls" from interview_admin.ai_calls where ${scope}`,
    sql<
      AdminOverview["activity"]
    >`select i.id as "interviewId",i.user_id as "userId",u.email,i.problem_id as "problemId",event.name as event,event.at::text
      from (select * from interview_admin.interviews where ${scope}) i left join interview_admin.registered_users u on u.id=i.user_id
      cross join lateral (values ('Interview started',case when i.coverage='full' then i.started_at end),('First candidate response',i.first_response_at),('Design presented',i.design_presented_at),
        ('Interview '||i.status,case when i.status in ('completed','exited') then i.ended_at end),('Feedback generated',i.feedback_generated_at),('Feedback failed',i.feedback_failed_at)) event(name,at)
      where event.at is not null order by event.at desc,i.id limit 20`,
    sql<
      AdminFailure[]
    >`select f.id,f.interview_id as "interviewId",f.user_id as "userId",u.email,f.request_id as "requestId",f.reference_id as "referenceId",f.operation,f.category,f.occurred_at::text as "occurredAt",f.source
      from (select * from interview_admin.failures where ${scope} order by occurred_at desc limit 20) f left join interview_admin.registered_users u on u.id=f.user_id order by f.occurred_at desc`,
  ]);
  const startedAt = state[0]?.startedAt;
  if (!startedAt || !users[0] || !interviews[0] || !cost[0])
    throw new Error("Reporting unavailable");
  return {
    environment: reportingEnvironment(),
    trackingSince: startedAt.toISOString(),
    generatedAt: state[0].now.toISOString(),
    sevenDaysAgo: state[0].since.toISOString(),
    users: { ...users[0], active: active[0]?.count ?? 0 },
    interviews: {
      ...interviews[0],
      failed: interviews[0].failed + (failedStarts[0]?.count ?? 0),
    },
    cost: cost[0],
    activity,
    failures,
  };
}
