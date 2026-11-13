import { afterAll, beforeAll, expect, it, vi } from "vitest";
import {
  startPlayPostgres,
  PLAY_TEST_USER as user,
  PLAY_OTHER_USER as other,
} from "./fixtures/play-postgres";
import { completeCourseQuiz } from "./fixtures/course-round";
import { seeCourseSlide, courseLesson } from "@/lib/play/course/visits";
import { coursePassed, courseStars } from "@/lib/play/course/rules";
import { gradeWrittenAnswer } from "@/lib/play/written-grader";
import { getRound } from "@/lib/play/rounds";
vi.mock("@/lib/play/written-grader", () => ({
  gradeWrittenAnswer: vi.fn(() => {
    throw Error("Course quizzes must not use a model");
  }),
}));
let fixture: Awaited<ReturnType<typeof startPlayPostgres>>;
vi.mock("@/lib/reporting-db", () => ({ reportingDb: () => fixture.runtime }));
beforeAll(async () => {
  fixture = await startPlayPostgres();
}, 30000);
afterAll(async () => fixture?.close());
it("uses the existing 75 percent rule and star bands for eight questions", () => {
  const result = (n: number) => Array.from({ length: 8 }, (_, i) => i < n);
  expect(coursePassed(result(5))).toBe(false);
  expect(coursePassed(result(6))).toBe(true);
  expect(
    courseStars(result(6).map((correct) => ({ correct, timeMs: 1000 }))),
  ).toBe(1);
  expect(
    courseStars(result(8).map((correct) => ({ correct, timeMs: 1000 }))),
  ).toBe(3);
  expect(
    courseStars(result(8).map((correct) => ({ correct, timeMs: 50000 }))),
  ).toBe(2);
});
it("six of eight passes with shuffled static choices, XP, combo, review and idempotent awards", async () => {
  for (let i = 0; i < 10; i++) await seeCourseSlide(user, 0, i);
  const { summary, results, sessionId } = await completeCourseQuiz(
    fixture.operator,
    user,
    0,
    (i) => i !== 5 && i !== 7,
  );
  expect(summary).toMatchObject({
    level: 0,
    correct: 6,
    total: 8,
    passed: true,
    stars: 1,
    bonusPoints: 25,
    nextLevel: { level: 1, title: "Ingestion and chunking" },
  });
  expect(results.map((r) => r.points)).toEqual([10, 10, 10, 10, 10, 0, 15, 0]);
  expect(summary.bestCombo).toBe(5);
  expect(summary.pointsEarned).toBe(105);
  expect(await getRound(user, sessionId)).toMatchObject({
    status: "graded",
    summary: { passed: true, total: 8 },
  });
  expect((await courseLesson(user, 1)).complete).toBe(false);
  const queued =
    await fixture.operator`select drill_id,step from practice_game.review_queue where user_id=${user} order by drill_id`;
  expect(queued).toEqual([
    { drill_id: "rag-course-p-q6", step: 2 },
    { drill_id: "rag-course-p-q8", step: 2 },
  ]);
  const replay = await completeCourseQuiz(
    fixture.operator,
    user,
    0,
    () => true,
  );
  expect(replay.summary).toMatchObject({
    replay: true,
    stars: 3,
    bonusPoints: 0,
  });
  expect(replay.results.map((r) => r.points)).toEqual([5, 5, 5, 5, 5, 5, 7, 5]);
  expect(gradeWrittenAnswer).not.toHaveBeenCalled();
});
it("a failed first attempt does not earn a first-try bonus on a later pass", async () => {
  for (let i = 0; i < 10; i++) await seeCourseSlide(other, 0, i);
  const failed = await completeCourseQuiz(
    fixture.operator,
    other,
    0,
    (i) => i < 5,
  );
  expect(failed.summary).toMatchObject({
    passed: false,
    stars: 0,
    bonusPoints: 0,
  });
  await expect(courseLesson(other, 1)).rejects.toMatchObject({ status: 403 });
  const passed = await completeCourseQuiz(
    fixture.operator,
    other,
    0,
    (i) => i < 6,
  );
  expect(passed.summary).toMatchObject({
    passed: true,
    stars: 1,
    bonusPoints: 0,
  });
  expect((await courseLesson(other, 1)).level).toBe(1);
  expect(gradeWrittenAnswer).not.toHaveBeenCalled();
});
