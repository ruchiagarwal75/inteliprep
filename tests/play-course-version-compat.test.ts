import { readFileSync } from "node:fs";
import { z } from "zod";
import { courseTopicSchema } from "@/lib/play/course/definition";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import {
  startPlayPostgres,
  PLAY_TEST_USER as user,
} from "./fixtures/play-postgres";
import { parseCourseMarkdown } from "@/lib/play/course/parse.mjs";
import { courseDrills } from "@/lib/play/course/drills";
import { drillDefinitionSchema } from "@/lib/play/definition";
import { createVariant } from "@/lib/play/question";
import { startRound, getRound } from "@/lib/play/rounds";
import { submitRoundAnswer } from "@/lib/play/submit";
import { drillAnswerSchema } from "@/lib/play/public";
let fixture: Awaited<ReturnType<typeof startPlayPostgres>>;
vi.mock("@/lib/reporting-db", () => ({ reportingDb: () => fixture.runtime }));
vi.mock("@/lib/play/written-grader", () => ({
  gradeWrittenAnswer: () => {
    throw Error("Static choices must not use a model");
  },
}));
beforeAll(async () => {
  fixture = await startPlayPostgres();
}, 30000);
afterAll(async () => fixture?.close());
it("keeps an idle seven-question saved round intact while a queued review uses the new definition", async () => {
  const oldTopic = z
    .array(courseTopicSchema)
    .parse(
      parseCourseMarkdown(
        readFileSync("docs/play-content/rag-course/topics-1-3.md", "utf8"),
      ),
    )
    .find((t) => t.level === 2);
  if (!oldTopic) throw Error("Missing legacy source");
  const sessionId = randomUUID();
  await fixture.operator`insert into practice_game.player_profiles(user_id) values(${user})`;
  await fixture.operator`insert into practice_game.streaks(user_id) values(${user})`;
  await fixture.operator`insert into practice_game.level_progress(user_id,topic,level,status,best_score,best_stars,passed_at) values(${user},'rag-course',2,'passed',1,3,'2026-11-01T00:00:00Z')`;
  await fixture.operator`insert into practice_game.points_ledger(id,user_id,delta,reason,ref_id) values(${randomUUID()},${user},123,'legacy-fixture','kept')`;
  await fixture.operator`insert into practice_game.play_sessions(id,user_id,request_id,topic,level,mode,created_at,last_activity_at) values(${sessionId},${user},${randomUUID()},'rag-course',2,'level',now()-interval '2 hours',now()-interval '2 hours')`;
  for (const [ordinal, q] of oldTopic.questions.entries()) {
    const definition = drillDefinitionSchema.parse({
      id: `rag-course-${q.id.toLowerCase()}`,
      topic: "rag-course",
      level: 2,
      title: q.title,
      prompt: q.prompt,
      type: "spot_flaw",
      sample: false,
      options: q.options,
      correctIndex: q.correctIndex,
      why: q.why,
      course: { kind: q.type, keyIdea: q.keyIdea, ifWrong: q.ifWrong },
    });
    await fixture.operator`insert into practice_game.drill_attempts(id,user_id,session_id,drill_id,topic,level,type,ordinal,private_variant,started_at,created_at) values(${randomUUID()},${user},${sessionId},${definition.id},'rag-course',2,'spot_flaw',${ordinal},${fixture.operator.json({ definition, variant: createVariant(definition) })},${ordinal === 0 ? new Date(Date.now() - 7200000) : null},now()-interval '2 hours')`;
  }
  const before =
    await fixture.operator`select id,private_variant from practice_game.drill_attempts where session_id=${sessionId} order by ordinal`;
  const view = await getRound(user, sessionId);
  expect(view.question.total).toBe(7);
  const after =
    await fixture.operator`select id,private_variant from practice_game.drill_attempts where session_id=${sessionId} order by ordinal`;
  expect(after).toEqual(before);
  const old = drillDefinitionSchema.parse(before[0].private_variant.definition);
  if (old.type !== "spot_flaw") throw Error("Expected choice");
  const wrong = before[0].private_variant.variant.order.findIndex(
    (source: number) => source !== old.correctIndex,
  );
  const result = await submitRoundAnswer(
    user,
    view.question.attemptId,
    drillAnswerSchema.parse({ type: "spot_flaw", option: String(wrong) }),
    undefined,
    view.question.revision ?? 0,
  );
  expect(result.result).toMatchObject({
    correct: false,
    expected: old.options[old.correctIndex],
    why: old.why,
  });
  await fixture.operator`update practice_game.review_queue set due_at=now()-interval '1 day' where user_id=${user} and drill_id=${old.id}`;
  const review = await startRound(user, {
    topic: "rag-course",
    mode: "review",
    requestId: randomUUID(),
    timeZone: "UTC",
  });
  const [fresh] =
    await fixture.operator`select private_variant from practice_game.drill_attempts where id=${review.view.question.attemptId}`;
  expect(fresh.private_variant.definition).toEqual(
    courseDrills.find((d) => d.id === old.id),
  );
  expect(fresh.private_variant.definition).not.toEqual(old);
  expect(
    await fixture.operator`select id,private_variant from practice_game.drill_attempts where session_id=${sessionId} order by ordinal`,
  ).toEqual(before);
  const [progress] =
    await fixture.operator`select best_stars,best_score,passed_at from practice_game.level_progress where user_id=${user} and topic='rag-course' and level=2`;
  expect(progress.best_stars).toBe(3);
  expect(Number(progress.best_score)).toBe(1);
  expect(progress.passed_at.toISOString()).toBe("2026-11-01T00:00:00.000Z");
  const [ledger] =
    await fixture.operator`select delta from practice_game.points_ledger where user_id=${user} and reason='legacy-fixture'`;
  expect(ledger.delta).toBe(123);
});
