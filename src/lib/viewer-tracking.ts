import { reserveViewerRow } from "@/lib/viewer-row-budget";
import "server-only";
import { createHash } from "node:crypto";
import { reportingDb } from "@/lib/reporting-db";
import { excludedUserIds, reportingEnvironment } from "@/lib/admin-config";
import { recordIpVisitor } from "@/lib/ip-visitor-tracking";
import { logServerEvent } from "@/lib/server-events";
import type { CandidateSession } from "@/lib/candidate-auth";
import type { VisitorConnection } from "@/lib/visitor-ip";

export function viewerHash(id: string) {
  return createHash("sha256")
    .update(`mockmeai-app-viewer-v1:${id.toLowerCase()}`)
    .digest("hex");
}

/** Best-effort reporting. Raw addresses stay in the private connection table. */
export async function trackAppViewer({
  visitorId,
  session,
  local,
  connection,
}: {
  visitorId: string;
  session?: CandidateSession;
  local: boolean;
  connection?: VisitorConnection;
}) {
  // Anonymous Auth UUIDs must never inflate the registered-account counter.
  const userId = session?.kind === "account" ? session.id : undefined;
  const environment = reportingEnvironment();
  const isTest =
    local ||
    environment === "development" ||
    environment === "test" ||
    Boolean(session && excludedUserIds().includes(session.id));
  const sql = reportingDb();
  const hash = viewerHash(visitorId);
  const [known] = await sql<
    { isTest: boolean }[]
  >`select is_test as "isTest" from interview_admin.app_viewers where environment=${environment} and visitor_hash=${hash}`;
  const allowed = Boolean(known) || (await reserveViewerRow("browser", hash));
  const [written] = allowed
    ? await sql<
        { isTest: boolean }[]
      >`insert into interview_admin.app_viewers as existing (environment,visitor_hash,user_id,is_test)
 values (${environment},${hash},${userId ?? null},${isTest})
 on conflict (environment,visitor_hash) do update set
 user_id=coalesce(existing.user_id,excluded.user_id),is_test=existing.is_test or excluded.is_test
 where (existing.user_id is null and excluded.user_id is not null) or (not existing.is_test and excluded.is_test)
 returning is_test as "isTest"`
    : [];
  // A separate account key handles multiple browsers and shared-browser account changes.
  if (userId)
    await sql`insert into interview_admin.app_visitor_accounts as existing (environment,user_id,is_test)
      values (${environment},${userId},${isTest})
      on conflict (environment,user_id) do update set is_test=existing.is_test or excluded.is_test
      where not existing.is_test and excluded.is_test`;
  const stored = written ?? known;
  const excluded = isTest || Boolean(stored?.isTest);
  // First known country describes where an account was first observed. A later
  // upgrade changes its kind, without adding a second account or changing origin.
  if (session) {
    try {
      await sql`insert into interview_admin.app_account_countries as existing
        (environment,user_id,account_kind,country_code,is_test)
        values (${environment},${session.id},${session.kind},${connection?.countryCode ?? null},${excluded})
        on conflict (environment,user_id) do update set
          country_code=coalesce(existing.country_code,excluded.country_code),
          account_kind=case when existing.account_kind='account' then 'account' else excluded.account_kind end,
          is_test=existing.is_test or excluded.is_test,
          last_seen_at=greatest(existing.last_seen_at,now())`;
    } catch (cause) {
      logServerEvent(
        {
          event: "framework_failure",
          route: "/api/monitoring/viewer",
          kind: "visitor_country_write",
        },
        cause,
      );
    }
  }
  if (connection) {
    // Retain a known QA/admin-browser exclusion after sign-out, without hiding
    // another browser/person merely because they share the same public IP.
    try {
      await recordIpVisitor(connection, excluded);
    } catch (cause) {
      // An optional comparison failure must not disable account/interview reporting.
      logServerEvent(
        {
          event: "framework_failure",
          route: "/api/monitoring/viewer",
          kind: "ip_comparison_write",
        },
        cause,
      );
    }
  }
}
