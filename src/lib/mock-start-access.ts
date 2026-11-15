import "server-only";
import { reserveMockBudget, bindMockBudget } from "@/lib/mock-budget";
import { z } from "zod";
import { currentCandidateId } from "@/lib/candidate-context";
import { ApiRequestError } from "@/lib/api-request";
import { storedMockAccess } from "@/lib/mock-access-store";
import { isMockAvailable, RAG_BOSS } from "@/lib/mock-access-public";
import { withPlayer } from "@/lib/play/database";
import { RAG_COURSE_ID } from "@/lib/play/course/metadata";
import {
  availableMockTrial,
  consumeMockTrial,
  replayMockTrial,
} from "@/lib/mock-trial-start";
import type {
  InterviewStart,
  interviewStartRequestSchema,
} from "@/lib/interview-selection";

type Selection = z.infer<typeof interviewStartRequestSchema> & {
  requestId: string;
};
export class MockStartAccessError extends Error {
  readonly status = 403;
  constructor(
    public readonly code:
      "pro_required" | "boss_locked" | "free_attempt_used" | "mock_unavailable",
  ) {
    super(
      {
        mock_unavailable:
          "Request beta access to this mock on the Mock page. An approved trial unlocks one attempt.",
        pro_required:
          "Mock interviews are part of Pro. Your free RAG boss attempt is available on the RAG path.",
        boss_locked: "Pass Topic 9 to unlock the RAG boss.",
        free_attempt_used:
          "Your free boss attempt has been used. Retries need Pro.",
      }[code],
    );
  }
}
/** One owner lock covers the entitlement check, Redis publication and durable charge.
 * If Postgres fails after publication, the same request reuses Redis's original session.
 */
export async function withMockStartAccess<
  T extends { interview: InterviewStart },
>(
  input: Selection,
  create: (expectedSessionId?: string) => Promise<T>,
): Promise<T> {
  const userId = currentCandidateId();
  if (!userId) throw new ApiRequestError("Sign in to start an interview.", 401);
  return withPlayer(userId, async (sql) => {
    const access = await storedMockAccess(sql, userId);
    const [previous] = await sql<
      { session_id: string }[]
    >`select session_id from practice_game.boss_attempts where user_id=${userId} and request_id=${input.requestId}`;
    if (previous) return create(previous.session_id);
    const replay = await replayMockTrial(sql, userId, input.requestId);
    if (replay) return create(replay);
    const boss = input.launch === "rag_boss";
    const fixedSelection =
      input.problemId === RAG_BOSS.problemId &&
      input.level === RAG_BOSS.level &&
      input.durationMinutes === RAG_BOSS.durationMinutes;
    if (boss && !isMockAvailable(input.problemId))
      throw new MockStartAccessError("mock_unavailable");
    if (boss && access.plan === "free" && !fixedSelection)
      throw new MockStartAccessError("pro_required");
    if (boss && !fixedSelection)
      throw new ApiRequestError(
        "The RAG boss uses Mid level and 45 minutes.",
        400,
      );
    const needsTrial =
      !boss && (access.plan === "free" || !isMockAvailable(input.problemId));
    const trial = needsTrial
      ? await availableMockTrial(sql, userId, input.problemId)
      : undefined;
    if (needsTrial && !trial)
      throw new MockStartAccessError(
        isMockAvailable(input.problemId) ? "pro_required" : "mock_unavailable",
      );
    if (boss && access.plan === "free") {
      const [passed] =
        await sql`select 1 from practice_game.level_progress where user_id=${userId} and topic=${RAG_COURSE_ID} and level=9 and status='passed'`;
      if (!passed) throw new MockStartAccessError("boss_locked");
      if (access.freeBossUsedAt)
        throw new MockStartAccessError("free_attempt_used");
    }
    const budget = await reserveMockBudget(sql, userId, input.requestId);
    const result = await create();
    await bindMockBudget(
      sql,
      budget,
      result.interview.sessionId,
      result.interview.timing?.deadlineAt,
    );
    if (trial)
      await consumeMockTrial(sql, trial, input.requestId, result.interview);
    if (boss) {
      const timing = result.interview.timing;
      if (!timing) throw new Error("Missing boss timing");
      await sql`insert into practice_game.boss_attempts(session_id,user_id,request_id,access_plan,started_at,deadline_at) values(${result.interview.sessionId},${userId},${input.requestId},${access.plan},${timing.startedAt},${timing.deadlineAt}) on conflict(user_id,request_id) do nothing`;
      if (access.plan === "free")
        await sql`insert into practice_game.mock_access(user_id,free_boss_used_at,free_boss_session_id) values(${userId},${timing.startedAt},${result.interview.sessionId}) on conflict(user_id) do update set free_boss_used_at=excluded.free_boss_used_at,free_boss_session_id=excluded.free_boss_session_id,updated_at=now()`;
    }
    return result;
  });
}
