import "server-only";
import { randomUUID } from "node:crypto";
import { excludedUserIds, reportingEnvironment } from "@/lib/admin-config";
import {
  readPlayer,
  withPlayer,
  type PlayTransaction,
} from "@/lib/play/database";
import { mockTrialsSchema } from "@/lib/mock-trial-public";

export async function storedMockTrials(sql: PlayTransaction, userId: string) {
  const rows = await sql`select r.problem_id as "problemId",
    case when r.status='revoked' then 'revoked'
      when exists(select 1 from interview_admin.mock_beta_grants g where g.request_id=r.id and g.revoked_at is null and g.consumed_session_id is null) then 'approved'
      when used.consumed_session_id is not null then 'used'
      when r.requested_at is not null then 'requested' else 'not_requested' end as state,
    used.consumed_session_id as "sessionId"
    from interview_admin.mock_beta_requests r
    left join lateral (select consumed_session_id from interview_admin.mock_beta_grants where request_id=r.id and consumed_session_id is not null order by started_at desc,id limit 1) used on true
    where r.user_id=${userId} and r.environment=${reportingEnvironment()}`;
  return mockTrialsSchema.parse(rows);
}
export function mockTrials(userId: string) {
  return readPlayer(userId, (sql) => storedMockTrials(sql, userId));
}
export function recordMockViews(userId: string, problemIds: string[]) {
  return withPlayer(userId, async (sql) => {
    for (const problemId of new Set(problemIds))
      await sql`insert into interview_admin.mock_beta_requests(id,user_id,problem_id,environment,is_test)
        values(${randomUUID()},${userId},${problemId},${reportingEnvironment()},${excludedUserIds().includes(userId)})
        on conflict(environment,user_id,problem_id) do update set last_viewed_at=now()`;
    return { saved: true };
  });
}
/** Requests are immutable for candidates. Repeated clicks never undo a decision. */
export function requestMockTrial(userId: string, problemId: string) {
  return withPlayer(userId, async (sql) => {
    await sql`insert into interview_admin.mock_beta_requests(id,user_id,problem_id,environment,is_test,requested_at,status,version)
      values(${randomUUID()},${userId},${problemId},${reportingEnvironment()},${excludedUserIds().includes(userId)},now(),'requested',1)
      on conflict(environment,user_id,problem_id) do update set requested_at=coalesce(mock_beta_requests.requested_at,excluded.requested_at),
        status=case when mock_beta_requests.requested_at is null then 'requested' else mock_beta_requests.status end,
        version=mock_beta_requests.version+case when mock_beta_requests.requested_at is null then 1 else 0 end`;
    return storedMockTrials(sql, userId);
  });
}
