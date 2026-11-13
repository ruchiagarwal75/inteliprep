import { expect, it } from "vitest";
import { ragCourse } from "./content";
import { courseQuestionSlide } from "./question-slides";
import { courseDrills } from "./drills";
import { createVariant, publicQuestion } from "../question";
it("maps every question to its closest teaching slide, including the supplied primer and ingestion references", () => {
  const expected: Readonly<Record<number, number[]>> = {
    0: [1, 2, 3, 5, 7, 6, 8, 8],
    1: [6, 6, 8, 10, 6, 11, 11],
    2: [3, 2, 5, 6, 8, 12, 9, 11, 12, 6],
    3: [2, 2, 5, 6, 7, 8, 7, 9, 10, 11],
    4: [1, 2, 5, 6, 8, 7, 2, 4, 10, 11],
    5: [2, 3, 4, 5, 6, 9, 10, 2, 8, 7],
    6: [3, 8, 8, 5, 6, 2, 10, 10, 7, 9],
  };
  for (const topic of ragCourse) {
    const refs = topic.questions.map((q) =>
      courseQuestionSlide(`rag-course-${q.id.toLowerCase()}`),
    );
    expect(refs).toEqual(expected[topic.level]);
    expect(refs.every((n) => n >= 1 && n <= topic.slides.length)).toBe(true);
  }
  expect(courseQuestionSlide("unknown-old-question")).toBe(1);
});
it("projects the reference for saved definitions without exposing solutions", () => {
  for (const drill of courseDrills) {
    const question = publicQuestion(
      drill,
      createVariant(drill),
      {
        id: crypto.randomUUID(),
        ordinal: 0,
        startedAt: new Date().toISOString(),
      },
      8,
    );
    expect(question.courseSlide).toBe(courseQuestionSlide(drill.id));
    expect(JSON.stringify(question)).not.toMatch(
      /correctIndex|ifWrong|keyIdea|"why"/u,
    );
  }
});
