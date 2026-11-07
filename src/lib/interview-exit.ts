import "server-only";
import { reportingDb } from "@/lib/reporting-db";
/** This affects only the caller's recorded interview and never requests grading. */
export async function explicitlyExitInterview(id: string, userId: string) {
  const sql = reportingDb();
  const rows = await sql<
    { endedAt: Date | null; status: string }[]
  >`update interview_admin.interviews
    set status=case when status='unfinished' then 'exited' else status end,
        ended_at=coalesce(ended_at,now()),last_activity_at=case when status='unfinished' then now() else last_activity_at end
    where id=${id} and user_id=${userId} returning ended_at as "endedAt",status`;
  return rows[0]
    ? { endedAt: rows[0].endedAt?.toISOString(), status: rows[0].status }
    : undefined;
}
