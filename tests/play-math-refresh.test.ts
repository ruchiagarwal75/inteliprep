import { afterAll, beforeAll, expect, it, vi } from "vitest";
import {
  startPlayPostgres,
  PLAY_TEST_USER as user,
} from "./fixtures/play-postgres";
import { startRound, getRound, advanceRound } from "@/lib/play/rounds";
import { submitRoundAnswer } from "@/lib/play/submit";
import { mathDrills } from "@/lib/play/rag/scale-math";
import {
  drillDefinitionSchema,
  drillVariantSchema,
} from "@/lib/play/definition";
import { calculateMath } from "@/lib/play/math";
let fixture: Awaited<ReturnType<typeof startPlayPostgres>>;
const peak = mathDrills.find((d) => d.id === "rag-l2-03");
if (!peak) throw Error("Missing template");
const bank = Array.from({ length: 6 }, (_, i) =>
  drillDefinitionSchema.parse({ ...peak, id: `rounding-${i}` }),
);
vi.mock("@/lib/reporting-db", () => ({ reportingDb: () => fixture.runtime }));
vi.mock("@/lib/play/content", () => ({ drillsForTopic: () => bank }));
beforeAll(async () => {
  fixture = await startPlayPostgres();
  await fixture.operator`insert into practice_game.level_progress(user_id,topic,level,status,best_score,passed_at) values(${user},'rag',1,'passed',1,now())`;
}, 30000);
afterAll(async () => {
  await fixture?.close();
});
it("repairs a recent saved step-1 template once, keeping answered data and rewards byte for byte", async () => {
  const start = await startRound(user, {
    requestId: crypto.randomUUID(),
    topic: "rag",
    mode: "level",
    level: 2,
    timeZone: "UTC",
  });
  let view = await getRound(user, start.sessionId);
  expect(view.question.revision).toBe(0);
  const [first] =
    await fixture.operator`select * from practice_game.drill_attempts where id=${view.question.attemptId}`;
  const definition = drillDefinitionSchema.parse(
      first.private_variant.definition,
    ),
    variant = drillVariantSchema.parse(first.private_variant.variant);
  if (definition.type !== "math") throw Error("Expected math");
  await submitRoundAnswer(user, first.id, {
    type: "math",
    value: calculateMath(definition.math, variant.parameters),
    unit: "questions per second",
  });
  view = await advanceRound(user, start.sessionId, first.id);
  const [answered] =
    await fixture.operator`select * from practice_game.drill_attempts where id=${first.id}`;
  const [old] =
    await fixture.operator`select private_variant from practice_game.drill_attempts where id=${view.question.attemptId}`;
  old.private_variant.definition.math.parameters.q.step = 1;
  old.private_variant.variant.parameters.q = 841167;
  await fixture.operator`update practice_game.drill_attempts set private_variant=${fixture.operator.json(old.private_variant)} where id=${view.question.attemptId}`;
  const ledger =
    await fixture.operator`select * from practice_game.points_ledger where user_id=${user} order by id`;
  const refreshed = await getRound(user, start.sessionId);
  expect(refreshed.refreshed).toBe(true);
  expect(refreshed.question.revision).toBe(1);
  expect(refreshed.question.prompt).not.toContain("841,167");
  const [saved] =
    await fixture.operator`select private_variant from practice_game.drill_attempts where id=${view.question.attemptId}`;
  expect(saved.private_variant.variant.parameters.q % 10000).toBe(0);
  expect(saved.private_variant.definition.math.parameters.q.step).toBe(10000);
  expect((await getRound(user, start.sessionId)).question.revision).toBe(1);
  expect(
    await fixture.operator`select * from practice_game.drill_attempts where id=${first.id}`,
  ).toEqual([answered]);
  expect(
    await fixture.operator`select * from practice_game.points_ledger where user_id=${user} order by id`,
  ).toEqual(ledger);
});
