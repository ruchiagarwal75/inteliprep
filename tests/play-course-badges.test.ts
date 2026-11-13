import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { ensurePlayer, withPlayer } from "@/lib/play/database";
import { rewardRound } from "@/lib/play/rewards";
import { summaryDisplay } from "@/lib/play/summary-store";
import { roundSummarySchema } from "@/lib/play/public";
import {
  startPlayPostgres,
  PLAY_TEST_USER as user,
} from "./fixtures/play-postgres";

let fixture: Awaited<ReturnType<typeof startPlayPostgres>>;
vi.mock("@/lib/reporting-db", () => ({ reportingDb: () => fixture.runtime }));
beforeAll(async () => {
  fixture = await startPlayPostgres({ legacyCourse: true });
  await withPlayer(user, (sql) => ensurePlayer(sql, user));
}, 30000);
afterAll(async () => fixture?.close());

const passed = roundSummarySchema.parse({
  mode: "level",
  topic: "rag-course",
  level: 1,
  correct: 6,
  total: 7,
  passed: true,
  passedLevels: [1],
  retryDrills: [],
  bonusPoints: 0,
  earnedBadges: [],
  practiceReadyNow: false,
  pointsEarned: 70,
});
it("awards the new course badge once while keeping the existing level badge", async () => {
  await fixture.operator`insert into practice_game.badges(user_id,badge_id,earned_at) values(${user},'first-level','2026-11-11T01:00:00Z')`;
  const before =
    await fixture.operator`select * from practice_game.badges where user_id=${user} and badge_id='first-level'`;
  for (const level of [1, 2, 2]) {
    const id = crypto.randomUUID();
    await fixture.operator`insert into practice_game.play_sessions(id,user_id,request_id,topic,level,mode,completed_at) values(${id},${user},${crypto.randomUUID()},'rag-course',${level},'level',now())`;
    const result = await withPlayer(user, (sql) =>
      rewardRound(
        sql,
        user,
        id,
        { ...passed, level, passedLevels: [level] },
        [],
      ),
    );
    expect(result.earnedBadges).toEqual(level === 1 ? ["first-topic"] : []);
  }
  expect(
    await fixture.operator`select * from practice_game.badges where user_id=${user} and badge_id='first-level'`,
  ).toEqual(before);
  expect(
    await fixture.operator`select badge_id from practice_game.badges where user_id=${user} and badge_id='first-topic'`,
  ).toHaveLength(1);
  expect(
    await fixture.operator`select id from practice_game.play_events where user_id=${user} and event='badge_earned' and ref_id='first-topic'`,
  ).toHaveLength(1);
});
it("hides an old level-badge celebration in saved course results without rewriting history", () => {
  const saved = { ...passed, earnedBadges: ["first-level", "math-five"] };
  expect(summaryDisplay(saved).earnedBadges).toEqual(["math-five"]);
  expect(saved.earnedBadges).toEqual(["first-level", "math-five"]);
  expect(summaryDisplay({ ...saved, topic: "rag" }).earnedBadges).toEqual(
    saved.earnedBadges,
  );
});
