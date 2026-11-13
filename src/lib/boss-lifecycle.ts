import "server-only";
import { randomUUID } from "node:crypto";
import type { SharedSessionRecord } from "@/lib/shared-session-record";
import type { ReportingContext } from "@/lib/reporting-context";
import type { FailureInput } from "@/lib/reporting-failures";
import { reportingConfigured } from "@/lib/reporting-db";
import { withPlayer, type PlayTransaction } from "@/lib/play/database";
import { mockOutcome } from "@/lib/play/mock-outcome";
import { logPlayFailure } from "@/lib/play/log";

export async function markBossFinished(
  sql: PlayTransaction,
  userId: string,
  record: SharedSessionRecord,
) {
  const end = record.checkpoint.ending;
  if (!end) return;
  const outcome = record.scorecard ? mockOutcome(record.scorecard) : null;
  await sql`update practice_game.boss_attempts set ended_at=coalesce(ended_at,${end.endedAt}),
    graded_at=coalesce(graded_at,${record.scorecard ? new Date() : null}),
    score=case when graded_at is null then ${outcome ? outcome.points / 100 : null} else score end,
    signal=case when graded_at is null then ${record.scorecard?.signal ?? null} else signal end,
    passed=case when graded_at is null then ${outcome?.meetsBar ?? false} else passed end
    where user_id=${userId} and session_id=${record.checkpoint.id}`;
}
export async function observeBossFinish(record: SharedSessionRecord) {
  const userId = record.checkpoint.ownerUserId;
  if (!record.checkpoint.ending || !userId || !reportingConfigured()) return;
  try {
    await withPlayer(userId, (sql) => markBossFinished(sql, userId, record));
  } catch (cause) {
    logPlayFailure("boss_finish", cause);
  }
}
export async function observeBossExit(
  userId: string,
  id: string,
  endedAt: string,
) {
  if (!reportingConfigured()) return;
  try {
    await withPlayer(
      userId,
      (sql) =>
        sql`update practice_game.boss_attempts set ended_at=coalesce(ended_at,${endedAt}) where user_id=${userId} and session_id=${id}`,
    );
  } catch (cause) {
    logPlayFailure("boss_exit", cause);
  }
}

/** Only a trusted, exhausted server failure can return an unfinished attempt.
 * Bad input, cancellation, quota limits, inactivity and grading failures do not.
 */
export function refundableBossFailure(input: FailureInput) {
  return (
    input.operation === "ai_response" &&
    input.terminal === true &&
    input.source !== "browser_report" &&
    [
      "provider_authentication",
      "provider_unavailable",
      "network",
      "timeout",
      "shared_store",
      "shared_store_or_configuration",
      "unknown",
    ].includes(input.category)
  );
}
export async function returnFreeBossAttempt(
  sql: PlayTransaction,
  userId: string,
  sessionId: string,
  category: string,
) {
  const rows =
    await sql`update practice_game.boss_attempts set refunded_at=now(),refund_category=${category}
    where user_id=${userId} and session_id=${sessionId} and access_plan='free' and ended_at is null and refunded_at is null returning session_id`;
  if (!rows.length) return false;
  await sql`update practice_game.mock_access set free_boss_used_at=null,free_boss_session_id=null,updated_at=now() where user_id=${userId} and free_boss_session_id=${sessionId}`;
  await sql`insert into practice_game.mock_access_changes(id,user_id,action,session_id,category) values(${randomUUID()},${userId},'free_attempt_returned',${sessionId},${category})`;
  return true;
}
export async function refundBossForFailure(
  input: FailureInput,
  context: ReportingContext,
) {
  const { userId, interviewId } = context;
  if (
    !userId ||
    !interviewId ||
    !reportingConfigured() ||
    !refundableBossFailure(input)
  )
    return;
  try {
    await withPlayer(userId, (sql) =>
      returnFreeBossAttempt(sql, userId, interviewId, input.category),
    );
  } catch (cause) {
    logPlayFailure("boss_refund", cause);
  }
}
