import "server-only";
import { requireAdminIdentity } from "@/lib/admin-auth";
import { reportingDb } from "@/lib/reporting-db";
import { recordScope, userScope } from "@/lib/admin-scope";
import { ADMIN_PAGE_SIZE, type adminQuery } from "@/lib/admin-query";
import type { AdminUser } from "@/lib/admin-records";

export async function adminUsers(query: ReturnType<typeof adminQuery>) {
  await requireAdminIdentity();
  const sql = reportingDb();
  const filter = sql`${userScope(query.includeExcluded)} and position(lower(${query.search}) in lower(coalesce(u.email,'')))>0`;
  const [rows, count] = await Promise.all([
    sql<
      AdminUser[]
    >`select u.id,u.email,u.created_at::text as "signupAt",activity.last_at::text as "lastActivityAt",activity.count as "interviewCount",
      u.created_at >= (select started_at from interview_admin.reporting_state) as "historyComplete"
      from auth.users u left join lateral (
        select (select max(at) from (
          select last_activity_at as at from interview_admin.interviews where user_id=u.id and ${recordScope(query.includeExcluded)}
          union all select occurred_at as at from interview_admin.failures where user_id=u.id and operation='start' and ${recordScope(query.includeExcluded)}
        ) actions) as last_at,
        (select count(*)::int from interview_admin.interviews where user_id=u.id and ${recordScope(query.includeExcluded)}) as count
      ) activity on true
      where ${filter} order by u.created_at desc,u.id limit ${ADMIN_PAGE_SIZE} offset ${(query.page - 1) * ADMIN_PAGE_SIZE}`,
    sql<
      { count: number }[]
    >`select count(*)::int as count from auth.users u where ${filter}`,
  ]);
  return {
    users: rows,
    total: count[0]?.count ?? 0,
    page: query.page,
    pageSize: ADMIN_PAGE_SIZE,
  };
}
