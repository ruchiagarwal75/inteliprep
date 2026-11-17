import { reserveViewerRow } from "@/lib/viewer-row-budget";
import "server-only";
import { randomUUID } from "node:crypto";
import { reportingDb } from "@/lib/reporting-db";
import { reportingEnvironment } from "@/lib/admin-config";
import {
  visitorIpConfigured,
  visitorIpRetentionSecret,
  type VisitorConnection,
} from "@/lib/visitor-ip";
import { logServerEvent } from "@/lib/server-events";

export type IpVisitorMetrics =
  | {
      status: "ready";
      total: number;
      last7Days: number;
      firstRecordedAt: string | null;
    }
  | { status: "unavailable" };

export async function recordIpVisitor(
  { hash, rawIp, countryCode }: VisitorConnection,
  isTest: boolean,
) {
  if (!/^[a-f0-9]{64}$/u.test(hash))
    throw new Error("Invalid IP comparison identifier");
  const sql = reportingDb();
  const retainedIp = visitorIpRetentionSecret() ? rawIp : null;
  const [known] =
    await sql`select 1 from interview_admin.app_ip_visitors where environment=${reportingEnvironment()} and ip_hash=${hash} and is_test=${isTest}`;
  if (!known && !(await reserveViewerRow("ip", `${hash}:${isTest}`))) return;
  await sql`insert into interview_admin.app_ip_visitors as existing (environment,ip_hash,is_test,raw_ip,country_code)
    values (${reportingEnvironment()},${hash},${isTest},${retainedIp}::inet,${countryCode})
    on conflict (environment,ip_hash,is_test) do update
      set last_seen_at=greatest(existing.last_seen_at,now()),raw_ip=excluded.raw_ip,
        country_code=coalesce(excluded.country_code,existing.country_code)`;
}

/** The daily cron clears addresses while preserving hashes, dates and country summaries. */
export async function purgeExpiredVisitorIps() {
  const sql = reportingDb();
  const rows = await sql`update interview_admin.app_ip_visitors set raw_ip=null
    where raw_ip is not null and last_seen_at < now()-interval '30 days'
    returning 1`;
  return rows.length;
}

/** Only used behind the existing fresh owner authorization. Failure never hides account counts. */
export async function ipVisitorMetrics(
  includeExcluded: boolean,
): Promise<IpVisitorMetrics> {
  if (!visitorIpConfigured()) return { status: "unavailable" };
  try {
    const sql = reportingDb();
    const [row] = await sql<
      { total: number; last7Days: number; firstRecordedAt: string | null }[]
    >`
      select count(distinct ip_hash)::int as total,
        count(distinct ip_hash) filter(where last_seen_at>=now()-interval '7 days')::int as "last7Days",
        min(first_seen_at)::text as "firstRecordedAt"
      from interview_admin.app_ip_visitors
      where environment=${reportingEnvironment()} and (${includeExcluded} or not is_test)`;
    return row ? { status: "ready", ...row } : { status: "unavailable" };
  } catch (cause) {
    logServerEvent(
      {
        event: "framework_failure",
        requestId: randomUUID(),
        route: "/api/admin/visitors",
        kind: "ip_comparison_unavailable",
      },
      cause,
    );
    return { status: "unavailable" };
  }
}
