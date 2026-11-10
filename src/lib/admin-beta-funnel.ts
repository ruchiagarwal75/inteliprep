import "server-only";
import { requireAdminIdentity } from "@/lib/admin-auth";
import { reportingDb } from "@/lib/reporting-db";
import { recordScope } from "@/lib/admin-scope";
import { reportingEnvironment } from "@/lib/admin-config";
import { ADMIN_PAGE_SIZE } from "@/lib/admin-query";
import type { betaFunnelQuery, FunnelCounts } from "@/lib/beta-funnel-query";
export type FunnelUser = FunnelCounts & {
  userId: string;
  email: string | null;
};
export async function adminBetaFunnel(
  query: ReturnType<typeof betaFunnelQuery>,
) {
  await requireAdminIdentity();
  const sql = reportingDb(),
    scope = recordScope(query.includeExcluded);
  const cte = sql`with milestones as (
   select user_id,environment,is_test,event,occurred_at as at from interview_admin.beta_funnel_events
   union all select user_id,environment,is_test,'started',started_at from interview_admin.interviews where status<>'failed'
   union all select user_id,environment,is_test,'finished',ended_at from interview_admin.interviews where status='completed'
   union all select user_id,environment,is_test,'sent_feedback',updated_at from interview_admin.feedback where not skipped
   union all select user_id,environment,is_test,'second_started',started_at from
     (select user_id,environment,is_test,started_at,row_number() over(partition by user_id order by started_at,id) as n from interview_admin.interviews where ${scope} and status<>'failed' and started_at is not null) ordered where n=2
 ),filtered as (
   select m.* from milestones m where ${scope} and user_id is not null and at>=${query.from}::date and at<${query.until}::timestamptz
 ), searched as (
   select f.*,u.email from filtered f left join interview_admin.registered_users u on u.id=f.user_id
   where position(lower(${query.search}) in lower(coalesce(u.email,'')))>0
 )`;
  const [totals, users, count, state] = await Promise.all([
    sql<FunnelCounts[]>`${cte} select
   count(distinct user_id) filter(where event='signed_in')::int as signed_in,
   count(distinct user_id) filter(where event='started')::int as started,
   count(distinct user_id) filter(where event='score_threshold_passed')::int as score_threshold_passed,
   count(distinct user_id) filter(where event='finished')::int as finished,
   count(distinct user_id) filter(where event='scorecard_opened')::int as scorecard_opened,
   count(distinct user_id) filter(where event='sent_feedback')::int as sent_feedback,
   count(distinct user_id) filter(where event='second_started')::int as second_started from searched`,
    sql<FunnelUser[]>`${cte} select user_id as "userId",email,
   count(*) filter(where event='signed_in')::int as signed_in,count(*) filter(where event='started')::int as started,
   count(*) filter(where event='score_threshold_passed')::int as score_threshold_passed,count(*) filter(where event='finished')::int as finished,
   count(*) filter(where event='scorecard_opened')::int as scorecard_opened,count(*) filter(where event='sent_feedback')::int as sent_feedback,
   count(*) filter(where event='second_started')::int as second_started
   from searched group by user_id,email order by max(at) desc,user_id limit ${ADMIN_PAGE_SIZE} offset ${(query.page - 1) * ADMIN_PAGE_SIZE}`,
    sql<
      { total: number }[]
    >`${cte} select count(distinct user_id)::int as total from searched`,
    sql<
      { since: string }[]
    >`select beta_funnel_since::text as since from interview_admin.reporting_state`,
  ]);
  if (!totals[0] || !state[0]) throw Error("Funnel unavailable");
  return {
    counts: totals[0],
    users,
    total: count[0]?.total ?? 0,
    page: query.page,
    pageSize: ADMIN_PAGE_SIZE,
    environment: reportingEnvironment(),
    trackingSince: state[0].since,
  };
}
