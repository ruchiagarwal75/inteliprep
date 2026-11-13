import { courseNotebook } from "@/lib/play/course/notebook";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import {
  startPlayPostgres,
  PLAY_TEST_USER as user,
  PLAY_OTHER_USER as other,
} from "./fixtures/play-postgres";
import { courseLesson, seeCourseSlide } from "@/lib/play/course/visits";
import { startRound, advanceRound } from "@/lib/play/rounds";
import { submitRoundAnswer } from "@/lib/play/submit";
import {
  drillDefinitionSchema,
  drillVariantSchema,
} from "@/lib/play/definition";
import { RAG_COURSE_ID as topic } from "@/lib/play/course/metadata";
import { gradeWrittenAnswer } from "@/lib/play/written-grader";
vi.mock("@/lib/play/written-grader", () => ({
  gradeWrittenAnswer: vi.fn(() => {
    throw Error("Play must not call a model");
  }),
}));
let fixture: Awaited<ReturnType<typeof startPlayPostgres>>;
vi.mock("@/lib/reporting-db", () => ({ reportingDb: () => fixture.runtime }));
beforeAll(async () => {
  fixture = await startPlayPostgres({ legacyCourse: true });
}, 30000);
afterAll(async () => {
  await fixture?.close();
});
const input = () => ({
  topic,
  mode: "level" as const,
  level: 1,
  requestId: crypto.randomUUID(),
  timeZone: "UTC",
});
it("requires ordered slides and a course pass, independent of old levels", async () => {
  await fixture.operator`insert into practice_game.level_progress(user_id,topic,level,status,passed_at) values(${user},'rag',1,'passed',now())`;
  await fixture.operator`insert into practice_game.points_ledger(id,user_id,delta,reason,ref_id) values(${crypto.randomUUID()},${user},123,'legacy-test','kept')`;
  const before = await courseLesson(user, 1);
  expect(before.complete).toBe(false);
  expect(before.slides).toHaveLength(13);
  expect(JSON.stringify(before)).not.toMatch(
    /"(?:correctIndex|keyIdea|ifWrong|questions)":/,
  );
  await expect(courseLesson(user, 2)).rejects.toMatchObject({ status: 403 });
  await expect(courseLesson(user, 10)).rejects.toMatchObject({ status: 404 });
  await expect(startRound(user, input())).rejects.toMatchObject({
    status: 403,
  });
  await expect(seeCourseSlide(user, 1, 4)).rejects.toMatchObject({
    status: 409,
  });
  for (let index = 0; index < before.slides.length; index++)
    await seeCourseSlide(user, 1, index);
  await seeCourseSlide(user, 1, before.slides.length - 1);
  expect((await courseLesson(user, 1)).complete).toBe(true);
  expect((await courseLesson(other, 1)).complete).toBe(false);
  await expect(
    startRound(user, { ...input(), mode: "placement" }),
  ).rejects.toMatchObject({ status: 400 });
});
it("grades seven shuffled choices without AI, preserves legacy rewards, queues mistakes, and fences retries", async () => {
  const request = input(),
    started = await startRound(user, request);
  expect((await startRound(user, request)).sessionId).toBe(started.sessionId);
  let view = started.view;
  expect(view.question.total).toBe(7);
  expect(JSON.stringify(view)).not.toMatch(/correctIndex|keyIdea|ifWrong|why/);
  const ids = new Set<string>();
  let summary;
  for (let i = 0; i < 7; i++) {
    const [row] =
      await fixture.operator`select private_variant from practice_game.drill_attempts where id=${view.question.attemptId}`;
    const drill = drillDefinitionSchema.parse(row.private_variant.definition),
      variant = drillVariantSchema.parse(row.private_variant.variant);
    if (drill.type !== "spot_flaw" || !drill.course)
      throw Error("Expected course choice");
    ids.add(drill.id);
    const sourceIndex =
      i === 4 ? drill.options.indexOf("16M") : drill.correctIndex;
    const answer = {
      type: "spot_flaw" as const,
      option: String(variant.order.indexOf(sourceIndex)),
    };
    // Answer input is parsed at the API boundary; reconstruct its four-value type here.
    const parsed = (await import("@/lib/play/public")).drillAnswerSchema.parse(
      answer,
    );
    await expect(
      submitRoundAnswer(other, view.question.attemptId, parsed),
    ).rejects.toMatchObject({ status: 404 });
    const result = await submitRoundAnswer(
      user,
      view.question.attemptId,
      parsed,
    );
    expect(result.result.keyIdea).toBe(drill.course.keyIdea);
    expect(result.result.expected).toBe(drill.options[drill.correctIndex]);
    expect(result.result.points).toBe(
      i === 4 ? 0 : drill.course.kind === "math" ? 15 : 10,
    );
    if (i === 4)
      expect(result.result.ifWrong).toBe(
        "That forgets the overlap: 4,000 / 500 = 8.",
      );
    expect(
      (await submitRoundAnswer(user, view.question.attemptId, parsed)).result,
    ).toEqual(result.result);
    if (i < 6)
      view = await advanceRound(
        user,
        started.sessionId,
        view.question.attemptId,
      );
    summary = result.summary;
  }
  expect(ids.size).toBe(7);
  expect(summary).toMatchObject({
    passed: true,
    correct: 6,
    total: 7,
    stars: 1,
    bonusPoints: 25,
  });
  expect((await courseLesson(user, 2)).complete).toBe(false);
  const [queue] =
    await fixture.operator`select step from practice_game.review_queue where user_id=${user} and topic=${topic}`;
  expect(queue.step).toBe(2);
  const [old] =
    await fixture.operator`select delta from practice_game.points_ledger where user_id=${user} and reason='legacy-test'`;
  expect(old.delta).toBe(123);
  expect(gradeWrittenAnswer).not.toHaveBeenCalled();
});
it("allows the quiz immediately on a revisit and halves replay XP", async () => {
  expect((await courseLesson(user, 1)).complete).toBe(true);
  const started = await startRound(user, input()),
    view = started.view;
  const [row] =
    await fixture.operator`select private_variant from practice_game.drill_attempts where id=${view.question.attemptId}`;
  const d = drillDefinitionSchema.parse(row.private_variant.definition),
    v = drillVariantSchema.parse(row.private_variant.variant);
  if (d.type !== "spot_flaw") throw Error("Expected choice");
  const answer = (await import("@/lib/play/public")).drillAnswerSchema.parse({
    type: "spot_flaw",
    option: String(v.order.indexOf(d.correctIndex)),
  });
  const result = await submitRoundAnswer(user, view.question.attemptId, answer);
  expect(result.result.points).toBe(5);
  expect(gradeWrittenAnswer).not.toHaveBeenCalled();
});

it("the notebook shows all slides but only the owner's answered questions and solutions", async () => {
  const mine = (await courseNotebook(user)).filter((row) => row.level > 0),
    theirs = (await courseNotebook(other)).filter((row) => row.level > 0);
  expect(mine.map((row) => row.level)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  expect(mine[0].slides).toHaveLength(13);
  expect(theirs[0].slides).toHaveLength(13);
  expect(mine[0].questions.every((q) => q.answered)).toBe(true);
  const answered = mine[0].questions[4];
  if (!answered.answered) throw Error("Expected saved answer");
  expect(answered.correct).toBe(false);
  expect(answered.expected).toBe("20M");
  expect(answered.why).toContain("4,000 / 400 = 10");
  for (const group of [mine[1], ...theirs])
    for (const question of group.questions) {
      expect(question.answered).toBe(false);
      expect(Object.keys(question).sort()).toEqual([
        "answered",
        "href",
        "id",
        "title",
      ]);
    }
});

it("schedules course reviews at 2, 5 and 12 days, then clears a successful final review", async () => {
  for (const step of [5, 12, null]) {
    await fixture.operator`update practice_game.review_queue set due_at=now()-interval '1 minute' where user_id=${user} and topic=${topic}`;
    const started = await startRound(user, {
      topic,
      mode: "review",
      requestId: crypto.randomUUID(),
      timeZone: "UTC",
    });
    const q = started.view.question;
    const [row] =
      await fixture.operator`select private_variant from practice_game.drill_attempts where id=${q.attemptId}`;
    const d = drillDefinitionSchema.parse(row.private_variant.definition),
      v = drillVariantSchema.parse(row.private_variant.variant);
    if (d.type !== "spot_flaw") throw Error("Expected review choice");
    const answer = (await import("@/lib/play/public")).drillAnswerSchema.parse({
      type: "spot_flaw",
      option: String(v.order.indexOf(d.correctIndex)),
    });
    await submitRoundAnswer(user, q.attemptId, answer);
    const queued =
      await fixture.operator`select step from practice_game.review_queue where user_id=${user} and topic=${topic}`;
    if (step === null) expect(queued).toHaveLength(0);
    else expect(queued[0].step).toBe(step);
  }
  expect(gradeWrittenAnswer).not.toHaveBeenCalled();
});
it("keeps the additive visit migration idempotent and browser writes forbidden", async () => {
  const { readFileSync } = await import("node:fs");
  const before =
    await fixture.operator`select * from practice_game.points_ledger order by id`;
  await fixture.operator.unsafe(
    readFileSync(
      "supabase/migrations/20261112184249_play_rag_course_visits.sql",
      "utf8",
    ),
  );
  expect(
    await fixture.operator`select * from practice_game.points_ledger order by id`,
  ).toEqual(before);
  const [permissions] =
    await fixture.operator`select has_table_privilege('authenticated','practice_game.course_visits','INSERT') as insert,has_table_privilege('authenticated','practice_game.course_visits','UPDATE') as update`;
  expect(permissions).toEqual({ insert: false, update: false });
  await fixture.operator.begin(async (tx) => {
    await tx.unsafe("set local role authenticated");
    await tx`select set_config('request.jwt.claims',${JSON.stringify({ sub: other })},true)`;
    expect(await tx`select * from practice_game.course_visits`).toHaveLength(0);
  });
});
