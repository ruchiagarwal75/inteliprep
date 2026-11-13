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
it("unlocks Topics 4 to 6 in order and preserves the existing ten-question rewards, reviews and chest", async () => {
  for (const level of [0, 1, 2, 3])
    await db.operator`insert into practice_game.level_progress(user_id,topic,level,status,best_stars,passed_at) values(${user},'rag-course',${level},'passed',3,now())`;
  await expect(openChest(user, "rag-course", 6)).rejects.toMatchObject({
    status: 403,
  });
  for (const level of [4, 5, 6]) {
    await expect(courseLesson(other, level)).rejects.toMatchObject({
      status: 403,
    });
    expect(
      courseLevelOpen(
        level,
        [0, 1, 2, 3].filter((n) => n < level - 1),
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
  const snapshot = await playerSnapshot(user);
  expect(courseProgress(snapshot.levels)).toEqual({
    stars: 15,
    levelsPassed: 7,
    totalLevels: 10,
  });
  expect(courseLevelOpen(7, [0, 1, 2, 3, 4, 5, 6])).toBe(false);
  const [reviews] =
    await db.operator`select count(*)::integer as count from practice_game.review_queue where user_id=${user} and topic='rag-course' and level between 4 and 6 and step=2`;
  expect(reviews.count).toBe(6);
  const prize = await openChest(user, "rag-course", 6);
  expect(prize.opened).toBe(true);
  expect((await playerSnapshot(user)).chests).toContainEqual({
    topic: "rag-course",
    after_level: 6,
    xp: prize.xp,
  });
  expect((await openChest(user, "rag-course", 6)).totals.points).toBe(
    prize.totals.points,
  );
  const [awards] =
    await db.operator`select count(*)::integer as count from practice_game.points_ledger where user_id=${user} and reason='chest' and ref_id='rag-course:6'`;
  expect(awards.count).toBe(1);
  const notebook = (await courseNotebook(other)).filter(
    (t) => t.level >= 4 && t.level <= 6,
  );
  expect(notebook.map((t) => [t.slides.length, t.questions.length])).toEqual([
    [12, 10],
    [12, 10],
    [12, 10],
  ]);
  for (const question of notebook.flatMap((t) => t.questions))
    expect(Object.keys(question).sort()).toEqual([
      "answered",
      "href",
      "id",
      "title",
    ]);
});
