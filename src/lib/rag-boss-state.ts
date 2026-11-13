import "server-only";
import { z } from "zod";
import { withPlayer } from "@/lib/play/database";
import { storedMockAccess } from "@/lib/mock-access-store";
import { RAG_COURSE_ID } from "@/lib/play/course/metadata";
import type { MockAccess } from "@/lib/mock-access-public";
import type { RagBossState } from "@/lib/rag-boss-public";

export const bossAttemptSchema = z.object({
  session_id: z.uuid(),
  started_at: z.coerce.date(),
  deadline_at: z.coerce.date(),
  ended_at: z.coerce.date().nullable(),
  graded_at: z.coerce.date().nullable(),
  score: z.coerce.number().min(0).max(1).nullable(),
  signal: z.string().nullable(),
  passed: z.boolean(),
  refunded_at: z.coerce.date().nullable(),
});
type Attempt = z.infer<typeof bossAttemptSchema>;
export function projectBossState(
  access: MockAccess,
  topicNinePassed: boolean,
  attempts: Attempt[],
  now = new Date(),
): RagBossState {
  const common = {
    plan: access.plan,
    worldClearedSeenAt: access.worldClearedSeenAt,
  };
  const result = (row: Attempt) => ({
    sessionId: row.session_id,
    score: row.score,
    signal: row.signal,
  });
  const defeated = attempts.find((row) => row.passed && row.ended_at);
  if (defeated?.ended_at)
    return {
      ...common,
      state: "defeated",
      result: result(defeated),
      defeatedAt: defeated.ended_at.toISOString(),
    };
  const running = attempts.find(
    (row) => !row.ended_at && !row.refunded_at && row.deadline_at > now,
  );
  if (running)
    return { ...common, state: "in_progress", sessionId: running.session_id };
  if (!topicNinePassed) return { ...common, state: "locked" };
  const recent = attempts[0];
  if (access.plan === "free" && access.freeBossUsedAt)
    return { ...common, state: "used", result: recent ? result(recent) : null };
  if (access.plan === "pro" && recent)
    return { ...common, state: "retry", result: result(recent) };
  return { ...common, state: "ready" };
}
export function ragBossState(userId: string) {
  return withPlayer(userId, async (sql) => {
    const access = await storedMockAccess(sql, userId);
    const [passed] =
      await sql`select 1 from practice_game.level_progress where user_id=${userId} and topic=${RAG_COURSE_ID} and level=9 and status='passed'`;
    const rows =
      await sql`select * from practice_game.boss_attempts where user_id=${userId} order by started_at desc,session_id`;
    return projectBossState(
      access,
      Boolean(passed),
      rows.map((row) => bossAttemptSchema.parse(row)),
    );
  });
}
