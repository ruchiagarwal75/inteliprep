import "server-only";
import { ragCourse } from "./content";
const titles = new Map(
  ragCourse.flatMap((topic) =>
    topic.questions.map((question) => [
      `rag-course-${question.id.toLowerCase()}`,
      question.title,
    ]),
  ),
);
/** Project current labels without modifying saved attempts or their results. */
export function courseQuestionTitle(drillId: string, fallback: string) {
  return (
    titles.get(drillId) ??
    (/^T\d+-Q\d+$/u.test(fallback) ? "Practice question" : fallback)
  );
}
