import { afterAll, beforeAll, expect, it, vi } from "vitest";
import {
  startPlayPostgres,
  PLAY_TEST_USER as user,
  PLAY_OTHER_USER as other,
} from "./fixtures/play-postgres";
import { completeCourseQuiz } from "./fixtures/course-round";
import { seeCourseSlide, courseLesson } from "@/lib/play/course/visits";
import { courseLevelOpen } from "@/lib/play/course/path-access";
import { courseProgress } from "@/lib/play/course/progress";
import { courseNotebook } from "@/lib/play/course/notebook";
import { playerSnapshot } from "@/lib/play/player";
import { openChest } from "@/lib/play/chests";
let db: Awaited<ReturnType<typeof startPlayPostgres>>;
vi.mock("@/lib/reporting-db", () => ({ reportingDb: () => db.runtime }));
vi.mock("@/lib/play/written-grader", () => ({
  gradeWrittenAnswer: () => {
    throw Error("Static course must not call a model");
  },
}));
beforeAll(async () => {
  db = await startPlayPostgres();
}, 30000);
afterAll(async () => db?.close());
it("opens the last three topics in order, preserves rewards and persists the final chest exactly once", async () => {
  for (const level of [0, 1, 2, 3, 4, 5, 6])
    await db.operator`insert into practice_game.level_progress(user_id,topic,level,status,best_stars,passed_at) values(${user},'rag-course',${level},'passed',3,now())`;
  await expect(openChest(user, "rag-course", 9)).rejects.toMatchObject({
    status: 403,
  });
  for (const level of [7, 8, 9]) {
    await expect(courseLesson(other, level)).rejects.toMatchObject({
      status: 403,
    });
    expect(
      courseLevelOpen(
        level,
        Array.from({ length: level - 1 }, (_, i) => i),
      ),
    ).toBe(false);
    expect((await courseLesson(user, level)).slides).toHaveLength(12);
    for (let index = 0; index < 12; index++)
      await seeCourseSlide(user, level, index);
    const { summary, results } = await completeCourseQuiz(
      db.operator,
      user,
      level,
      (index) => index > 0 && index < 9,
    );
    expect(summary).toMatchObject({
      level,
      total: 10,
      correct: 8,
      passed: true,
      stars: 1,
      bonusPoints: 25,
    });
    expect(results.filter((r) => r.correct)).toHaveLength(8);
    expect(
      results.filter((r) => !r.correct).every((r) => Boolean(r.ifWrong)),
    ).toBe(true);
  }
  expect(courseProgress((await playerSnapshot(user)).levels)).toEqual({
    stars: 24,
    levelsPassed: 10,
    totalLevels: 10,
  });
  const [reviews] =
    await db.operator`select count(*)::integer as count from practice_game.review_queue where user_id=${user} and topic='rag-course' and level between 7 and 9 and step=2`;
  expect(reviews.count).toBe(6);
  const prize = await openChest(user, "rag-course", 9);
  expect(prize.opened).toBe(true);
  expect((await playerSnapshot(user)).chests).toContainEqual({
    topic: "rag-course",
    after_level: 9,
    xp: prize.xp,
  });
  expect((await openChest(user, "rag-course", 9)).totals.points).toBe(
    prize.totals.points,
  );
  const [awards] =
    await db.operator`select count(*)::integer as count from practice_game.points_ledger where user_id=${user} and reason='chest' and ref_id='rag-course:9'`;
  expect(awards.count).toBe(1);
});
it("makes slides for all ten topics available in the notebook without leaking unanswered solutions", async () => {
  const notebook = await courseNotebook(other);
  expect(notebook).toHaveLength(10);
  expect(notebook.every((t) => t.slides.length > 0)).toBe(true);
  for (const topic of notebook.filter((t) => t.level >= 7)) {
    expect(topic.slides).toHaveLength(12);
    expect(topic.questions).toHaveLength(10);
    for (const question of topic.questions)
      expect(Object.keys(question).sort()).toEqual([
        "answered",
        "href",
        "id",
        "title",
      ]);
  }
});
