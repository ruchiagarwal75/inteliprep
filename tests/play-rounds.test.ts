import { beforeAll, afterAll, expect, it, vi } from "vitest";
import type postgres from "postgres";
import {
  startPlayPostgres,
  PLAY_TEST_USER as user,
  PLAY_OTHER_USER as other,
} from "./fixtures/play-postgres";
import { startRound, getRound, advanceRound } from "@/lib/play/rounds";
import { submitRoundAnswer } from "@/lib/play/submit";
import { mathFixture } from "@/lib/play/fixtures/drills";
import { calculateMath } from "@/lib/play/math";
import { drillDefinitionSchema } from "@/lib/play/definition";
import { drillVariantSchema } from "@/lib/play/definition";
import type { RoundView } from "@/lib/play/public";
let fixture: Awaited<ReturnType<typeof startPlayPostgres>>,
  runtime: ReturnType<typeof postgres>,
  sessionId: string;
vi.mock("@/lib/reporting-db", () => ({ reportingDb: () => runtime }));
const bank = [1, 2, 3, 4].flatMap((level) =>
  Array.from({ length: 8 }, (_, i) =>
    drillDefinitionSchema.parse({
      ...mathFixture,
      id: `sample-${level}-${i}`,
      level,
      placement: i < 2,
    }),
  ),
);
vi.mock("@/lib/play/content", () => ({ drillsForTopic: () => bank }));
beforeAll(async () => {
  fixture = await startPlayPostgres();
  runtime = fixture.runtime;
}, 30000);
afterAll(async () => {
  await fixture?.close();
});
async function solve(view: RoundView, correct = true) {
  const [row] =
    await fixture.operator`select private_variant from practice_game.drill_attempts where id=${view.question.attemptId}`;
  const drill = drillDefinitionSchema.parse(row.private_variant.definition),
    variant = drillVariantSchema.parse(row.private_variant.variant);
  if (drill.type !== "math") throw Error("Not a math fixture");
  return {
    type: "math" as const,
    value: calculateMath(drill.math, variant.parameters) * (correct ? 1 : 100),
    unit: "GB",
  };
}
it("starts exactly once, picks five unique drills, preserves timing, and fences owners", async () => {
  const input = {
    requestId: crypto.randomUUID(),
    topic: "rag",
    mode: "level" as const,
    level: 1,
    timeZone: "UTC",
  };
  const a = await startRound(user, input),
    b = await startRound(user, input),
    c = await startRound(user, { ...input, requestId: crypto.randomUUID() });
  sessionId = a.sessionId;
  expect(b.sessionId).toBe(a.sessionId);
  expect(c.sessionId).toBe(a.sessionId);
  const rows =
    await fixture.operator`select drill_id from practice_game.drill_attempts where session_id=${sessionId}`;
  expect(rows).toHaveLength(5);
  expect(new Set(rows.map((r) => r.drill_id)).size).toBe(5);
  const first = await getRound(user, sessionId);
  expect(a.view?.resumed).toBe(false);
  expect(first.resumed).toBe(true);
  expect(first.outcomes).toEqual([null, null, null, null, null]);
  expect(JSON.stringify(a.view)).not.toMatch(
    /private_variant|rubric|correctIndex|seniorAnswer/,
  );
  expect((await getRound(user, sessionId)).resumed).toBe(true);
  expect((await getRound(user, sessionId)).question.startedAt).toBe(
    first.question.startedAt,
  );
  await expect(getRound(other, sessionId)).rejects.toMatchObject({
    status: 404,
  });
  await expect(
    startRound(user, { ...input, requestId: crypto.randomUUID(), level: 4 }),
  ).rejects.toMatchObject({ status: 403 });
});
it("saves the first answer, handles retries and duplicate next, and passes four of five", async () => {
  let view = await getRound(user, sessionId);
  for (let i = 0; i < 5; i++) {
    const answer = await solve(view, i !== 0),
      result = await submitRoundAnswer(user, view.question.attemptId, answer);
    expect(result.result.correct).toBe(i !== 0);
    expect(
      await submitRoundAnswer(user, view.question.attemptId, answer),
    ).toEqual(result);
    if (i === 4) {
      expect(result.summary).toMatchObject({
        passed: true,
        correct: 4,
        total: 5,
        passedLevels: [1],
        pointsEarned: 65,
        nextLevel: { level: 2, title: "Scale math" },
        earnedBadges: expect.arrayContaining(["first-level"]),
      });
      break;
    }
    const old = view.question.attemptId;
    view = await advanceRound(user, sessionId, old);
    expect((await advanceRound(user, sessionId, old)).question.attemptId).toBe(
      view.question.attemptId,
    );
    expect(view.question.ordinal).toBe(i + 1);
  }
  const rows =
    await fixture.operator`select level,status from practice_game.level_progress where user_id=${user} and topic='rag' order by level`;
  expect(rows.map((row) => row.status)).toEqual([
    "passed",
    "open",
    "locked",
    "locked",
  ]);
  expect(
    await fixture.operator`select * from practice_game.review_queue where user_id=${user}`,
  ).toHaveLength(1);
});
it("places independently and keeps prior passes when a later round is weaker", async () => {
  const { sessionId: id } = await startRound(user, {
    requestId: crypto.randomUUID(),
    topic: "rag",
    mode: "placement",
    timeZone: "UTC",
  });
  let view = await getRound(user, id);
  for (let i = 0; i < 6; i++) {
    const result = await submitRoundAnswer(
      user,
      view.question.attemptId,
      await solve(view, i !== 2),
    );
    if (i === 5) {
      expect(result.summary?.passedLevels).toEqual([1, 3]);
      break;
    }
    view = await advanceRound(user, id, view.question.attemptId);
  }
  const [level] =
    await fixture.operator`select status from practice_game.level_progress where user_id=${user} and topic='rag' and level=4`;
  expect(level.status).toBe("open");
});
it("awards points, a first-try bonus and badges once, with one daily streak increment", async () => {
  const [{ playerSnapshot }] = await Promise.all([import("@/lib/play/player")]);
  expect((await playerSnapshot(user)).points).toBe(130);
  const { sessionId: id } = await startRound(user, {
    requestId: crypto.randomUUID(),
    topic: "rag",
    mode: "level",
    level: 1,
    timeZone: "UTC",
  });
  let view = await getRound(user, id);
  for (let i = 0; i < 5; i++) {
    const answer = await solve(view),
      outcome = await submitRoundAnswer(user, view.question.attemptId, answer);
    expect(outcome.result.points).toBe(10);
    expect(
      await submitRoundAnswer(user, view.question.attemptId, answer),
    ).toEqual(outcome);
    if (i === 4) {
      expect(outcome.summary?.bonusPoints).toBe(0);
      break;
    }
    view = await advanceRound(user, id, view.question.attemptId);
  }
  const state = await playerSnapshot(user);
  expect(state).toMatchObject({ points: 180, streak: 1 });
  expect(state.badges.map((b) => b.badge_id)).toEqual(
    expect.arrayContaining(["first-level", "math-five"]),
  );
  const bonus =
    await fixture.operator`select delta from practice_game.points_ledger where user_id=${user} and reason='first-level-pass'`;
  expect(bonus).toHaveLength(1);
  expect(bonus[0].delta).toBe(25);
  expect(
    await fixture.operator`select * from practice_game.play_events where user_id=${user} and event='streak_extended'`,
  ).toHaveLength(1);
});
it("reaches practice ready after all four levels, without granting interview readiness", async () => {
  const { playerSnapshot } = await import("@/lib/play/player");
  const { markMockPromptSeen } = await import("@/lib/play/readiness-store");
  for (const level of [4, 2]) {
    const { sessionId: id } = await startRound(user, {
      requestId: crypto.randomUUID(),
      topic: "rag",
      mode: "level",
      level,
      timeZone: "UTC",
    });
    let view = await getRound(user, id);
    for (let i = 0; i < 5; i++) {
      const outcome = await submitRoundAnswer(
        user,
        view.question.attemptId,
        await solve(view),
      );
      if (i === 4) {
        if (level === 2) {
          expect(outcome.summary?.practiceReadyNow).toBe(true);
          expect(outcome.summary?.mockPrompt).toMatchObject({
            topic: "rag",
            level: "senior",
            problemId: "enterprise-rag-assistant",
          });
        }
        break;
      }
      view = await advanceRound(user, id, view.question.attemptId);
    }
  }
  const state = await playerSnapshot(user);
  expect(state.readiness.find((row) => row.topic === "rag")?.state).toBe(
    "practice_ready",
  );
  expect(state.badges.map((row) => row.badge_id)).toContain("rag-practice");
  await markMockPromptSeen(user, "rag");
  await markMockPromptSeen(user, "rag");
  expect(
    await fixture.operator`select * from practice_game.play_events where user_id=${user} and event='mock_prompt_shown'`,
  ).toHaveLength(1);
});
