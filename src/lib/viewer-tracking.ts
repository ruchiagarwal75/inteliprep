import "server-only";
import { createHash } from "node:crypto";
import { reportingDb } from "@/lib/reporting-db";
import { excludedUserIds, reportingEnvironment } from "@/lib/admin-config";

export function viewerHash(id: string) {
  return createHash("sha256")
    .update(`mockmeai-app-viewer-v1:${id.toLowerCase()}`)
    .digest("hex");
}

/** Called through the existing best-effort reporting adapter. No page paths or IPs are persisted. */
export async function trackAppViewer(
  visitorId: string,
  userId: string | undefined,
  local: boolean,
) {
  const environment = reportingEnvironment();
  const isTest =
    local ||
    environment === "development" ||
    environment === "test" ||
    Boolean(userId && excludedUserIds().includes(userId));
  const sql = reportingDb();
  await sql`insert into interview_admin.app_viewers as existing (environment,visitor_hash,user_id,is_test)
 values (${environment},${viewerHash(visitorId)},${userId ?? null},${isTest})
 on conflict (environment,visitor_hash) do update set
 user_id=coalesce(existing.user_id,excluded.user_id),is_test=existing.is_test or excluded.is_test
 where (existing.user_id is null and excluded.user_id is not null) or (not existing.is_test and excluded.is_test)`;
  // A separate account key handles multiple browsers and shared-browser account changes.
  if (userId)
    await sql`insert into interview_admin.app_visitor_accounts as existing (environment,user_id,is_test)
      values (${environment},${userId},${isTest})
      on conflict (environment,user_id) do update set is_test=existing.is_test or excluded.is_test
      where not existing.is_test and excluded.is_test`;
}
