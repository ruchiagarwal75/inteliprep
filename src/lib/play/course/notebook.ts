import "server-only";
import { z } from "zod";
import { readPlayer } from "../database";
import { drillDefinitionSchema } from "../definition";
import { drillResultSchema } from "../public";
import { courseTopic } from "./content";
import { RAG_COURSE_ID, courseTopicHref } from "./metadata";
import { PlayError } from "../errors";

/** Load only the selected topic and the owner's submitted answers for it. */
export async function courseNotebook(userId: string, level: number) {
  const content = courseTopic(level);
  if (!content) throw new PlayError("This notebook topic is unavailable.", 404);
  return readPlayer(userId, async (sql) => {
    const rows =
      await sql`select distinct on(drill_id) drill_id,private_variant->'definition' as definition,result_json as result from practice_game.drill_attempts where user_id=${userId} and topic=${RAG_COURSE_ID} and level=${level} and submitted_at is not null order by drill_id,submitted_at desc,id desc`;
    const answered = new Map(
      z
        .array(
          z.object({
            drill_id: z.string(),
            definition: drillDefinitionSchema,
            result: drillResultSchema,
          }),
        )
        .parse(rows)
        .map((row) => [row.drill_id, row]),
    );
    return {
      level: content.level,
      title: content.title,
      slides: content.slides,
      questions: content.questions.map((question) => {
        const row = answered.get(`rag-course-${question.id.toLowerCase()}`);
        const title = question.title,
          href = courseTopicHref(level);
        if (
          !row ||
          row.definition.type !== "spot_flaw" ||
          !row.definition.course
        )
          return { id: question.id, title, href, answered: false as const };
        return {
          id: question.id,
          title,
          href,
          answered: true as const,
          prompt: row.definition.prompt,
          correct: row.result.correct,
          keyIdea: row.definition.course.keyIdea,
          expected: row.result.expected,
          why: row.result.why,
          ifWrong: row.result.ifWrong,
        };
      }),
    };
  });
}
