import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import {
  startPlayPostgres,
  PLAY_TEST_USER as user,
  PLAY_OTHER_USER as other,
} from "./fixtures/play-postgres";
import {
  courseLesson,
  seeCourseSlide,
  startedCourseLevels,
} from "@/lib/play/course/visits";
import { startRound } from "@/lib/play/rounds";
import {
  courseLevelOpen,
  nextCourseLevel,
} from "@/lib/play/course/path-access";
let fixture: Awaited<ReturnType<typeof startPlayPostgres>>;
vi.mock("@/lib/reporting-db", () => ({ reportingDb: () => fixture.runtime }));
beforeAll(async () => {
  fixture = await startPlayPostgres();
}, 30000);
afterAll(async () => fixture?.close());
it("new players start at zero, and locked future rows cannot open Topic 1", async () => {
  expect(nextCourseLevel([])?.level).toBe(0);
  expect(courseLevelOpen(0, [])).toBe(true);
  await expect(courseLesson(user, 1)).rejects.toMatchObject({ status: 403 });
  for (let index = 0; index < 10; index++) await seeCourseSlide(user, 0, index);
  const round = await startRound(user, {
    topic: "rag-course",
    mode: "level",
    level: 0,
    timeZone: "UTC",
    requestId: crypto.randomUUID(),
  });
  expect(round.view.question).toMatchObject({
    level: 0,
    total: 8,
    title: "Why RAG",
  });
  expect(await startedCourseLevels(user)).toEqual([0]);
  await expect(courseLesson(user, 1)).rejects.toMatchObject({ status: 403 });
  expect((await courseLesson(other, 0)).seenThrough).toBe(-1);
});
it("preserves existing visits, open progress and past quizzes without rewriting them", async () => {
  for (const kind of ["visit", "progress", "session"]) {
    const id = crypto.randomUUID();
    await fixture.operator`insert into auth.users(id) values(${id})`;
    if (kind === "visit")
      await fixture.operator`insert into practice_game.course_visits(user_id,course_id,level,seen_through) values(${id},'rag-course',1,2)`;
    if (kind === "progress")
      await fixture.operator`insert into practice_game.level_progress(user_id,topic,level,status) values(${id},'rag-course',1,'open')`;
    if (kind === "session")
      await fixture.operator`insert into practice_game.play_sessions(id,user_id,request_id,topic,mode,level) values(${crypto.randomUUID()},${id},${crypto.randomUUID()},'rag-course','level',1)`;
    const before =
      await fixture.operator`select to_jsonb(p) as row from practice_game.level_progress p where user_id=${id}`;
    expect((await courseLesson(id, 1)).level).toBe(1);
    expect((await courseLesson(id, 0)).level).toBe(0);
    expect(await startedCourseLevels(id)).toEqual(
      kind === "progress" ? [] : [1],
    );
    expect(nextCourseLevel([], [1])?.level).toBe(1);
    expect(
      await fixture.operator`select to_jsonb(p) as row from practice_game.level_progress p where user_id=${id}`,
    ).toEqual(before);
  }
  expect(nextCourseLevel([1], [1])?.level).toBe(2);
});
it("expands only course-zero constraints idempotently and preserves data and RLS", async () => {
  const before =
    await fixture.operator`select to_jsonb(p) as row from practice_game.level_progress p order by user_id,topic,level`;
  const source = readFileSync(
    "supabase/migrations/20261112233202_play_course_primer.sql",
    "utf8",
  );
  for (let i = 0; i < 2; i++) await fixture.operator.unsafe(source);
  expect(
    await fixture.operator`select to_jsonb(p) as row from practice_game.level_progress p order by user_id,topic,level`,
  ).toEqual(before);
  await expect(
    fixture.operator`insert into practice_game.level_progress(user_id,topic,level,status) values(${other},'rag',0,'open')`,
  ).rejects.toMatchObject({ code: "23514" });
  const [policy] =
    await fixture.operator`select relrowsecurity as rls,has_table_privilege('authenticated','practice_game.course_visits','INSERT') as browser_write from pg_class where oid='practice_game.course_visits'::regclass`;
  expect(policy).toEqual({ rls: true, browser_write: false });
});
