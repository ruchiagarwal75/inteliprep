import "server-only";
import { requireAdminIdentity } from "@/lib/admin-auth";
import { reportingDb } from "@/lib/reporting-db";
import { recordScope } from "@/lib/admin-scope";
import { reportingEnvironment } from "@/lib/admin-config";
import {
  ipVisitorMetrics,
  type IpVisitorMetrics,
} from "@/lib/ip-visitor-tracking";
export type AdminVisitors = {
  total: number;
  newLast7Days: number;
  anonymousBrowsers: number;
  identifiedAccounts: number;
  identifiedAccountsLast7Days: number;
  trackingSince: string;
  generatedAt: string;
  environment: string;
  ipComparison: IpVisitorMetrics;
};
export async function adminVisitors(
  includeExcluded = false,
): Promise<AdminVisitors> {
  await requireAdminIdentity();
  const sql = reportingDb();
  const [state, counts, accounts, ipComparison] = await Promise.all([
    sql<
      { since: Date; now: Date }[]
    >`select viewer_tracking_started_at as since,now() from interview_admin.reporting_state`,
    sql<
      { total: number; newLast7Days: number; anonymousBrowsers: number }[]
    >`select count(*)::int as total,count(*) filter(where first_seen_at>=now()-interval '7 days')::int as "newLast7Days",
      count(*) filter(where user_id is null)::int as "anonymousBrowsers"
      from interview_admin.app_viewers where ${recordScope(includeExcluded)}`,
    sql<{ identifiedAccounts: number; identifiedAccountsLast7Days: number }[]>`
      select count(*)::int as "identifiedAccounts",count(*) filter(where first_seen_at>=now()-interval '7 days')::int as "identifiedAccountsLast7Days"
      from interview_admin.app_visitor_accounts where ${recordScope(includeExcluded)}`,
    ipVisitorMetrics(includeExcluded),
  ]);
  if (!state[0]?.since || !counts[0] || !accounts[0])
    throw Error("Visitor reporting unavailable");
  return {
    ...counts[0],
    ...accounts[0],
    trackingSince: state[0].since.toISOString(),
    generatedAt: state[0].now.toISOString(),
    environment: reportingEnvironment(),
    ipComparison,
  };
}
