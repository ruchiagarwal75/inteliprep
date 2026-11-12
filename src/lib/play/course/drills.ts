import "server-only";
import { drillDefinitionSchema } from "../definition";
import { ragCourse } from "./content";
import { RAG_COURSE_ID } from "./metadata";
/** Course choices use the existing server-owned option shuffle and grade path. */
export const courseDrills = ragCourse.flatMap((topic) =>
  topic.questions.map((question) =>
    drillDefinitionSchema.parse({
      id: `rag-course-${question.id.toLowerCase()}`,
      topic: RAG_COURSE_ID,
      level: topic.level,
      title: question.title,
      prompt: question.prompt,
      why: question.why,
      sample: false,
      type: "spot_flaw",
      options: question.options,
      correctIndex: question.correctIndex,
      course: {
        kind: question.type,
        keyIdea: question.keyIdea,
        ifWrong: question.ifWrong,
      },
    }),
  ),
);
