import "server-only";
import { reportingDb } from "@/lib/reporting-db";
import { excludedUserIds, reportingEnvironment } from "@/lib/admin-config";
export function recordScope(includeExcluded: boolean) {
  const sql = reportingDb();
  return sql`environment=${reportingEnvironment()} and (${includeExcluded} or (not is_test and (user_id is null or user_id <> all(string_to_array(${excludedUserIds().join(",")},',')::uuid[]))))`;
}
export function userScope(includeExcluded: boolean) {
  const sql = reportingDb();
  return sql`(${includeExcluded} or u.id <> all(string_to_array(${excludedUserIds().join(",")},',')::uuid[]))`;
}
