import { beforeAll, afterAll, expect, it, vi } from "vitest";
import {
  startPlayPostgres,
  PLAY_TEST_USER as user,
} from "./fixtures/play-postgres";
import { openChest, chestXp } from "@/lib/play/chests";
import { withPlayer } from "@/lib/play/database";
import { startRound, advanceRound } from "@/lib/play/rounds";
import { submitRoundAnswer } from "@/lib/play/submit";
import {
  drillDefinitionSchema,
  drillVariantSchema,
} from "@/lib/play/definition";
import { mathFixture } from "@/lib/play/fixtures/drills";
import { calculateMath } from "@/lib/play/math";
import type { RoundView } from "@/lib/play/public";
let fixture: Awaited<ReturnType<typeof startPlayPostgres>>;
vi.mock("@/lib/reporting-db", () => ({ reportingDb: () => fixture.runtime }));
vi.mock("@/lib/play/content", () => ({
  drillsForTopic: () =>
    Array.from({ length: 8 }, (_, i) =>
      drillDefinitionSchema.parse({
        ...mathFixture,
        id: `stars-${i}`,
        level: 1,
      }),
    ),
}));
beforeAll(async () => {
  fixture = await startPlayPostgres();
}, 30000);
afterAll(async () => {
  await fixture?.close();
});
async function finish(view: RoundView, replay: boolean) {
  for (let i = 0; i < 5; i++) {
    const [row] =
      await fixture.operator`select private_variant from practice_game.drill_attempts where id=${view.question.attemptId}`;
    const drill = drillDefinitionSchema.parse(row.private_variant.definition);
    if (drill.type !== "math") throw Error("Expected math fixture");
    const variant = drillVariantSchema.parse(row.private_variant.variant);
    const answer = {
      type: "math" as const,
      value:
        calculateMath(drill.math, variant.parameters) *
        (replay && i === 0 ? 100 : 1),
      unit: "GB",
    };
    const saved = await submitRoundAnswer(
      user,
      view.question.attemptId,
      answer,
    );
    expect(
      await submitRoundAnswer(user, view.question.attemptId, answer),
    ).toEqual(saved);
    expect(saved.result.combo).toBe(replay ? i : i + 1);
    expect(saved.result.comboBonus).toBe(
      (replay ? i : i + 1) === 3 ? 5 : (replay ? i : i + 1) === 5 ? 10 : 0,
    );
    if (replay && i > 0) expect(saved.result.points).toBe(5);
    if (i === 4) {
      expect(saved.summary?.levelTitle).toBe("Retrieval basics");
      return saved;
    }
    view = await advanceRound(user, view.sessionId, view.question.attemptId);
  }
  throw Error("No result");
}
it("persists the best stars, snapshots replay status and never duplicates XP on retry", async () => {
  const input = {
    requestId: crypto.randomUUID(),
    topic: "rag",
    mode: "level" as const,
    level: 1,
    timeZone: "UTC",
  };
  const first = await startRound(user, input);
  if (!first.view) throw Error("No view");
  expect((await finish(first.view, false)).summary).toMatchObject({
    stars: 3,
    bestStars: 3,
    replay: false,
    bestCombo: 5,
  });
  const second = await startRound(user, {
    ...input,
    requestId: crypto.randomUUID(),
  });
  if (!second.view) throw Error("No view");
  expect((await finish(second.view, true)).summary).toMatchObject({
    stars: 1,
    bestStars: 3,
    replay: true,
  });
  const [row] =
    await fixture.operator`select best_stars from practice_game.level_progress where user_id=${user} and topic='rag' and level=1`;
  expect(row.best_stars).toBe(3);
  const ledger =
    await fixture.operator`select delta from practice_game.points_ledger where user_id=${user} and reason='drill' and ref_id in (select id::text from practice_game.drill_attempts where session_id=${second.sessionId})`;
  expect(ledger.map((r) => r.delta)).toEqual([5, 5, 5, 5]);
});

it("opens a seeded chest once under concurrent retries and rejects locked or unknown chests", async () => {
  await expect(openChest(user, "rag", 3)).rejects.toMatchObject({
    status: 403,
  });
  await expect(openChest(user, "rag", 4)).rejects.toMatchObject({
    status: 404,
  });
  const prizes = await Promise.all(
    Array.from({ length: 6 }, () => openChest(user, "rag", 1)),
  );
  expect(prizes.every((p) => p.xp === chestXp(user, "rag", 1))).toBe(true);
  const rows =
    await fixture.operator`select xp from practice_game.chest_opens where user_id=${user}`;
  expect(rows).toHaveLength(1);
  const ledger =
    await fixture.operator`select delta from practice_game.points_ledger where user_id=${user} and reason='chest'`;
  expect(ledger.map((r) => r.delta)).toEqual([rows[0].xp]);
  const other = "22222222-2222-4222-8222-222222222222";
  expect(
    await withPlayer(
      other,
      (sql) =>
        sql`select * from practice_game.chest_opens where user_id=${user}`,
    ),
  ).toHaveLength(0);
  await expect(
    fixture.operator.begin(async (sql) => {
      await sql.unsafe("set local role authenticated");
      await sql`select set_config('request.jwt.claims',${JSON.stringify({ sub: user })},true)`;
      return sql`insert into practice_game.chest_opens(user_id,topic,after_level,xp) values(${user},'rag',2,50)`;
    }),
  ).rejects.toMatchObject({ code: "42501" });
});
