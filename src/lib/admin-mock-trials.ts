import "server-only";
import { requireAdminIdentity } from "@/lib/admin-auth";
import { reportingDb } from "@/lib/reporting-db";
import { recordScope } from "@/lib/admin-scope";
import { reportingEnvironment } from "@/lib/admin-config";
import { ADMIN_PAGE_SIZE, type adminQuery } from "@/lib/admin-query";
export type AdminMockTrial = {
  id: string;
  userId: string;
  email: string | null;
  problemId: string;
  requestedAt: string;
  version: number;
  state: "requested" | "approved" | "revoked" | "used";
};
export type MockDemand = {
  problemId: string;
  seen: number;
  requested: number;
  approved: number;
  started: number;
  completed: number;
  repeat: number;
};
export async function adminMockTrials(query: ReturnType<typeof adminQuery>) {
  await requireAdminIdentity();
  const sql = reportingDb();
  const scope = sql`with requests as (select * from interview_admin.mock_beta_requests where ${recordScope(query.includeExcluded)})`;
  const from = sql`from requests r left join interview_admin.registered_users u on u.id=r.user_id
    where r.requested_at is not null and position(lower(${query.search}) in lower(coalesce(u.email,'')||' '||r.problem_id||' '||r.user_id::text))>0`;
  const [rows, total, demand] = await Promise.all([
    sql<
      AdminMockTrial[]
    >`${scope} select r.id,r.user_id as "userId",u.email,r.problem_id as "problemId",r.requested_at::text as "requestedAt",r.version,
      case when r.status='revoked' then 'revoked'
        when exists(select 1 from interview_admin.mock_beta_grants g where g.request_id=r.id and g.consumed_session_id is null and g.revoked_at is null) then 'approved'
        when exists(select 1 from interview_admin.mock_beta_grants g where g.request_id=r.id and g.consumed_session_id is not null) then 'used'
        else 'requested' end as state ${from}
      order by r.requested_at desc,r.id limit ${ADMIN_PAGE_SIZE} offset ${(query.page - 1) * ADMIN_PAGE_SIZE}`,
    sql<{ count: number }[]>`${scope} select count(*)::int as count ${from}`,
    sql<
      MockDemand[]
    >`${scope} select r.problem_id as "problemId",count(*)::int as seen,
      count(*) filter(where r.requested_at is not null)::int as requested,
      count(*) filter(where exists(select 1 from interview_admin.mock_beta_grants g where g.request_id=r.id))::int as approved,
      count(*) filter(where exists(select 1 from interview_admin.mock_beta_grants g where g.request_id=r.id and g.consumed_session_id is not null))::int as started,
      count(*) filter(where exists(select 1 from interview_admin.mock_beta_grants g join interview_admin.interviews i on i.id=g.consumed_session_id and i.user_id=r.user_id and i.environment=r.environment where g.request_id=r.id and i.status='completed'))::int as completed,
      count(*) filter(where (select count(*) from interview_admin.interviews i where i.user_id=r.user_id and i.problem_id=r.problem_id and i.environment=r.environment and i.started_at>=r.requested_at)>=2)::int as repeat
      from requests r group by r.problem_id order by requested desc,r.problem_id`,
  ]);
  return {
    rows: Array.from(rows),
    demand: Array.from(demand),
    total: total[0]?.count ?? 0,
    pageSize: ADMIN_PAGE_SIZE,
    environment: reportingEnvironment(),
  };
}
