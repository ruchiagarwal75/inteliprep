import { afterAll, beforeAll, expect, it, vi } from "vitest";
import {
  startPlayPostgres,
  PLAY_TEST_USER as user,
} from "./fixtures/play-postgres";
import { courseLesson, seeCourseSlide } from "@/lib/play/course/visits";
import { courseNotebook } from "@/lib/play/course/notebook";
import { startRound } from "@/lib/play/rounds";

let fixture: Awaited<ReturnType<typeof startPlayPostgres>>;
vi.mock("@/lib/reporting-db", () => ({ reportingDb: () => fixture.runtime }));
beforeAll(async () => {
  fixture = await startPlayPostgres({ legacyCourse: true });
}, 30000);
afterAll(async () => fixture?.close());
const start = () =>
  startRound(user, {
    topic: "rag-course",
    mode: "level",
    level: 1,
    requestId: crypto.randomUUID(),
    timeZone: "UTC",
  });
it("page and notebook reads cannot unlock a fresh account's quiz", async () => {
  for (let open = 0; open < 2; open++) {
    expect(await courseLesson(user, 1)).toMatchObject({
      complete: false,
      seenThrough: -1,
    });
    await courseNotebook(user, 1);
    await expect(start()).rejects.toMatchObject({ status: 403 });
  }
  expect(
    await fixture.operator`select * from practice_game.course_visits where user_id=${user}`,
  ).toHaveLength(0);
  const total = (await courseLesson(user, 1)).slides.length;
  for (let index = 0; index < total - 1; index++) {
    await seeCourseSlide(user, 1, index);
    expect((await courseLesson(user, 1)).complete).toBe(false);
    await expect(start()).rejects.toMatchObject({ status: 403 });
  }
  await seeCourseSlide(user, 1, total - 1);
  await seeCourseSlide(user, 1, total - 1);
  expect((await courseLesson(user, 1)).complete).toBe(true);
  expect((await start()).view.question.title).toBe("Big chunks");
  expect(
    await fixture.operator`select * from practice_game.course_visits where user_id=${user}`,
  ).toHaveLength(1);
});
