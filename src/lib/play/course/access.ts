import "server-only";
import { withPlayer } from "../database";
import { storedAttempt, storedRound } from "../round-store";
import { PlayError } from "../errors";
import { RAG_COURSE_ID } from "./metadata";
export function requireCourseTopic(topic: string) {
  if (topic !== RAG_COURSE_ID)
    throw new PlayError(
      "Those practice rounds are retired. Your progress is saved. Start a RAG course topic instead.",
      410,
    );
}
/** Public Play commands cannot reach a retired written-answer grading path. */
export async function requireCourseAttempt(userId: string, id: string) {
  return withPlayer(userId, async (sql) => {
    const attempt = await storedAttempt(sql, userId, id);
    requireCourseTopic(attempt.topic);
    if (
      attempt.private_variant.definition.type !== "spot_flaw" ||
      !attempt.private_variant.definition.course
    )
      throw new PlayError("Choose a course question to continue.", 410);
  });
}
export async function requireCourseRound(userId: string, id: string) {
  return withPlayer(userId, async (sql) =>
    requireCourseTopic((await storedRound(sql, userId, id)).topic),
  );
}
