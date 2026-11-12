import "server-only";
import { z } from "zod";
import { withPlayer } from "../database";
import { drillDefinitionSchema } from "../definition";
import { drillResultSchema } from "../public";
import { ragCourse } from "./content";
import { RAG_COURSE_ID, RAG_COURSE_NODES, courseTopicHref } from "./metadata";

export async function courseNotebook(userId: string) {
  return withPlayer(userId, async (sql) => {
    const rows =
      await sql`select distinct on(drill_id) drill_id,private_variant->'definition' as definition,result_json as result from practice_game.drill_attempts where user_id=${userId} and topic=${RAG_COURSE_ID} and submitted_at is not null order by drill_id,submitted_at desc,id desc`;
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
    return RAG_COURSE_NODES.map((node) => {
      const content = ragCourse.find((topic) => topic.level === node.level);
      return {
        level: node.level,
        title: node.title,
        slides: content?.slides ?? [],
        questions: (content?.questions ?? []).map((question) => {
          const row = answered.get(`rag-course-${question.id.toLowerCase()}`);
          const title = question.id,
            href = courseTopicHref(node.level);
          if (
            !row ||
            row.definition.type !== "spot_flaw" ||
            !row.definition.course
          )
            return { title, href, answered: false as const };
          return {
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
  });
}
