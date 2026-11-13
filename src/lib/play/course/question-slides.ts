import "server-only";
import { ragCourse } from "./content";
/** References follow the latest teaching content, including for saved question IDs. */
const slides = new Map([
  ...[1, 2, 3, 5, 7, 6, 8, 8].map((slide, index): [string, number] => [
    `rag-course-p-q${index + 1}`,
    slide,
  ]),
  ...ragCourse.flatMap((topic) =>
    topic.questions.flatMap((q) =>
      q.slide
        ? [
            [`rag-course-${q.id.toLowerCase()}`, q.slide] satisfies [
              string,
              number,
            ],
          ]
        : [],
    ),
  ),
]);
export const courseQuestionSlide = (drillId: string) =>
  slides.get(drillId) ?? 1;
