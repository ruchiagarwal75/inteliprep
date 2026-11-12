import "server-only";
import { withPlayer, type PlayTransaction } from "../database";
import { PlayError } from "../errors";
import { levelUnlocked } from "../round-rules";
import { courseTopic } from "./content";
import { RAG_COURSE_ID, RAG_COURSE_NODES } from "./metadata";

async function lessonAccess(
  sql: PlayTransaction,
  userId: string,
  level: number,
) {
  const topic = courseTopic(level);
  if (!topic) throw new PlayError("This topic is coming soon.", 404);
  const rows =
    await sql`select level from practice_game.level_progress where user_id=${userId} and topic=${RAG_COURSE_ID} and status='passed'`;
  if (
    !levelUnlocked(
      level,
      RAG_COURSE_NODES,
      rows.map((row) => Number(row.level)),
    )
  )
    throw new PlayError("Pass the previous topic first.", 403);
  return topic;
}
export async function courseLesson(userId: string, level: number) {
  return withPlayer(userId, async (sql) => {
    const topic = await lessonAccess(sql, userId, level);
    const [visit] =
      await sql`select seen_through,completed_at from practice_game.course_visits where user_id=${userId} and course_id=${RAG_COURSE_ID} and level=${level}`;
    return {
      level,
      title: topic.title,
      slides: topic.slides,
      seenThrough: Number(visit?.seen_through ?? -1),
      complete: Boolean(visit?.completed_at),
    };
  });
}
export async function seeCourseSlide(
  userId: string,
  level: number,
  index: number,
) {
  return withPlayer(userId, async (sql) => {
    const topic = await lessonAccess(sql, userId, level);
    const [visit] =
      await sql`select seen_through from practice_game.course_visits where user_id=${userId} and course_id=${RAG_COURSE_ID} and level=${level}`;
    const seen = Number(visit?.seen_through ?? -1);
    if (index < 0 || index >= topic.slides.length || index > seen + 1)
      throw new PlayError(
        "Read the slides in order before starting the quiz.",
        409,
      );
    await sql`insert into practice_game.course_visits(user_id,course_id,level,seen_through,completed_at) values(${userId},${RAG_COURSE_ID},${level},${index},${index === topic.slides.length - 1 ? new Date() : null}) on conflict(user_id,course_id,level) do update set seen_through=greatest(course_visits.seen_through,excluded.seen_through),completed_at=coalesce(course_visits.completed_at,excluded.completed_at)`;
    return {
      seenThrough: Math.max(seen, index),
      complete: Math.max(seen, index) === topic.slides.length - 1,
    };
  });
}
export async function requireCourseSlides(
  sql: PlayTransaction,
  userId: string,
  level: number,
) {
  await lessonAccess(sql, userId, level);
  const [visit] =
    await sql`select completed_at from practice_game.course_visits where user_id=${userId} and course_id=${RAG_COURSE_ID} and level=${level}`;
  if (!visit?.completed_at)
    throw new PlayError(
      "Read this topic's slides before your first quiz.",
      403,
    );
}
