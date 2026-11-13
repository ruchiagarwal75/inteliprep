import "server-only";
/** One-based teaching references, never option indices or grading data. */
const groups = [
  { prefix: "p", values: [1, 2, 3, 5, 7, 6, 8, 8] },
  { prefix: "t1", values: [6, 6, 8, 10, 6, 11, 11] },
  { prefix: "t2", values: [2, 1, 3, 3, 4, 5, 4] },
  { prefix: "t3", values: [1, 1, 2, 3, 4, 5, 4] },
];
const slides = new Map(
  groups.flatMap(({ prefix, values }) =>
    values.map((slide, index): [string, number] => [
      `rag-course-${prefix}-q${index + 1}`,
      slide,
    ]),
  ),
);
export const courseQuestionSlide = (drillId: string) =>
  slides.get(drillId) ?? 1;
