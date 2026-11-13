import "server-only";
import { withPlayer, type PlayTransaction } from "../database";
import { PlayError } from "../errors";
import { courseLevelOpen } from "./path-access";
import { courseTopic } from "./content";
import { RAG_COURSE_ID } from "./metadata";

async function lessonAccess(
  sql: PlayTransaction,
  userId: string,
  level: number,
) {
  const topic = courseTopic(level);
  if (!topic) throw new PlayError("This topic is coming soon.", 404);
  const rows =
    await sql`select level from practice_game.level_progress where user_id=${userId} and topic=${RAG_COURSE_ID} and status='passed'`;
  const unlocked = courseLevelOpen(
    level,
    rows.map((row) => Number(row.level)),
  );
  const [started] = unlocked
    ? []
    : await sql`select exists(select 1 from practice_game.play_sessions where user_id=${userId} and topic=${RAG_COURSE_ID} and level=${level}) or exists(select 1 from practice_game.course_visits where user_id=${userId} and course_id=${RAG_COURSE_ID} and level=${level}) as started`;
  if (!unlocked && !started?.started)
    throw new PlayError("Pass the previous topic first.", 403);
  return topic;
}
export async function courseLesson(userId: string, level: number) {
  return withPlayer(userId, async (sql) => {
    const topic = await lessonAccess(sql, userId, level);
    const [visit] =
      await sql`select seen_through,completed_at,last_viewed_index from practice_game.course_visits where user_id=${userId} and course_id=${RAG_COURSE_ID} and level=${level}`;
    return {
      level,
      title: topic.title,
      slides: topic.slides,
      seenThrough: Number(visit?.seen_through ?? -1),
      lastViewedIndex: Math.max(
        0,
        Math.min(
          topic.slides.length - 1,
          Number(visit?.last_viewed_index ?? visit?.seen_through ?? 0),
        ),
      ),
      complete: Boolean(visit?.completed_at),
    };
  });
}
export async function startedCourseLevels(userId: string) {
  return withPlayer(userId, async (sql) => {
    const rows =
      await sql`select level from practice_game.course_visits where user_id=${userId} and course_id=${RAG_COURSE_ID} union select level from practice_game.play_sessions where user_id=${userId} and topic=${RAG_COURSE_ID} and level is not null order by level`;
    return rows.map((row) => Number(row.level));
  });
}
export async function seeCourseSlide(
  userId: string,
  level: number,
  index: number,
  lastViewedIndex = index,
) {
  return withPlayer(userId, async (sql) => {
    const topic = await lessonAccess(sql, userId, level);
    const [visit] =
      await sql`select seen_through from practice_game.course_visits where user_id=${userId} and course_id=${RAG_COURSE_ID} and level=${level}`;
    const seen = Number(visit?.seen_through ?? -1);
    if (
      index < 0 ||
      index >= topic.slides.length ||
      index > seen + 1 ||
      lastViewedIndex < 0 ||
      lastViewedIndex >= topic.slides.length
    )
      throw new PlayError(
        "Read the slides in order before starting the quiz.",
        409,
      );
    await sql`insert into practice_game.course_visits(user_id,course_id,level,seen_through,completed_at,last_viewed_index) values(${userId},${RAG_COURSE_ID},${level},${index},${index === topic.slides.length - 1 ? new Date() : null},${lastViewedIndex}) on conflict(user_id,course_id,level) do update set seen_through=greatest(course_visits.seen_through,excluded.seen_through),completed_at=coalesce(course_visits.completed_at,excluded.completed_at),last_viewed_index=excluded.last_viewed_index`;
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
