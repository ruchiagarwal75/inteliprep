import "server-only";
import { reportingEnvironment } from "@/lib/admin-config";
import type { PlayTransaction } from "@/lib/play/database";
import type { InterviewStart } from "@/lib/interview-selection";

/** Called only under withPlayer's owner lock, before checking unused credits. */
export async function replayMockTrial(
  sql: PlayTransaction,
  userId: string,
  requestId: string,
) {
  const [row] = await sql<
    { session_id: string }[]
  >`select g.consumed_session_id as session_id from interview_admin.mock_beta_grants g
    join interview_admin.mock_beta_requests r on r.id=g.request_id
    where r.user_id=${userId} and r.environment=${reportingEnvironment()} and g.consumed_request_id=${requestId}`;
  return row?.session_id;
}
export async function availableMockTrial(
  sql: PlayTransaction,
  userId: string,
  problemId: string,
) {
  const [grant] = await sql<
    { id: string; request_id: string }[]
  >`select g.id,g.request_id from interview_admin.mock_beta_grants g
    join interview_admin.mock_beta_requests r on r.id=g.request_id
    where r.user_id=${userId} and r.problem_id=${problemId} and r.environment=${reportingEnvironment()}
      and r.status='approved' and g.revoked_at is null and g.consumed_session_id is null`;
  return grant;
}
export async function consumeMockTrial(
  sql: PlayTransaction,
  grant: { id: string; request_id: string },
  requestId: string,
  interview: InterviewStart,
) {
  if (!interview.timing) throw new Error("Missing trial timing");
  await sql`update interview_admin.mock_beta_grants set consumed_request_id=${requestId},consumed_session_id=${interview.sessionId},
    started_at=${interview.timing.startedAt},deadline_at=${interview.timing.deadlineAt} where id=${grant.id}`;
  await sql`update interview_admin.mock_beta_requests set version=version+1 where id=${grant.request_id}`;
}
