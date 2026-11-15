import "server-only";
import { randomUUID } from "node:crypto";
import { ApiRequestError } from "@/lib/api-request";
import { excludedUserIds, reportingEnvironment } from "@/lib/admin-config";
import { readPlayer, withPlayer, type PlayTransaction } from "./database";
import type { TopicRatingInput } from "./topic-rating-public";

async function firstQuiz(
  sql: PlayTransaction,
  userId: string,
  sessionId: string,
) {
  const [round] = await sql<
    {
      id: string;
      topic: string;
      level: number | null;
      eligible: boolean;
    }[]
  >`select s.id,s.topic,s.level,
    (s.completed_at is not null and s.mode='level' and s.id=(
      select id from practice_game.play_sessions where user_id=${userId}
        and mode='level' and completed_at is not null
      order by completed_at,created_at,id limit 1)) as eligible
    from practice_game.play_sessions s where s.id=${sessionId} and s.user_id=${userId}`;
  if (!round) throw new ApiRequestError("Quiz not found.", 404);
  return round;
}

export function topicRatingStatus(userId: string, sessionId: string) {
  return readPlayer(userId, async (sql) => {
    const round = await firstQuiz(sql, userId, sessionId);
    if (!round.eligible) return { eligible: false };
    const rows = await sql`select id from interview_admin.topic_ratings
      where user_id=${userId} and environment=${reportingEnvironment()}`;
    return { eligible: rows.length === 0 };
  });
}

/** Display and response records are each counted once per account/environment. */
export function saveTopicRating(userId: string, input: TopicRatingInput) {
  return withPlayer(userId, async (sql) => {
    const round = await firstQuiz(sql, userId, input.sessionId);
    if (!round.eligible || round.level === null)
      throw new ApiRequestError(
        "Finish your first topic quiz before rating it.",
        409,
      );
    if (input.action === "shown") {
      await sql`insert into interview_admin.topic_rating_views
        (id,user_id,session_id,topic,level,environment,is_test)
        values(${randomUUID()},${userId},${round.id},${round.topic},${round.level},
          ${reportingEnvironment()},${excludedUserIds().includes(userId)})
        on conflict(environment,user_id) do nothing`;
      return { handled: true };
    }
    await sql`insert into interview_admin.topic_ratings
      (id,user_id,session_id,topic,level,environment,is_test,stars,skipped,dismissal_reason)
      values(${randomUUID()},${userId},${round.id},${round.topic},${round.level},
        ${reportingEnvironment()},${excludedUserIds().includes(userId)},
        ${input.action === "rate" ? input.stars : null},${input.action !== "rate"},
        ${input.action === "rate" ? null : input.action})
      on conflict(environment,user_id) do nothing`;
    return { handled: true };
  });
}
