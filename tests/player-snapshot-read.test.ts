import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import {
  startPlayPostgres,
  PLAY_TEST_USER as user,
  PLAY_OTHER_USER as other,
} from "./fixtures/play-postgres";
import { ensurePlayer, readPlayer, withPlayer } from "@/lib/play/database";
import { readPlayerSnapshot } from "@/lib/play/player";
import { refreshStreak } from "@/lib/play/streak-store";
import { ageReadiness } from "@/lib/play/readiness-store";
let fixture: Awaited<ReturnType<typeof startPlayPostgres>>;
const statements: string[] = [];
vi.mock("@/lib/reporting-db", () => ({ reportingDb: () => fixture.runtime }));
beforeAll(async () => {
  fixture = await startPlayPostgres();
  fixture.runtime.options.debug = (_connection, query) =>
    statements.push(query);
}, 30000);
afterAll(async () => fixture?.close());
beforeEach(async () => {
  await fixture.operator.unsafe(
    "truncate practice_game.player_profiles,practice_game.streaks,practice_game.topic_readiness,practice_game.points_ledger,practice_game.play_sessions,practice_game.play_events cascade",
  );
  statements.length = 0;
});

it("shows fresh defaults without creating profiles, streaks or events", async () => {
  expect(await readPlayerSnapshot(user)).toMatchObject({
    points: 0,
    streak: 0,
    freezes: 0,
    level: "senior",
    timeZone: "UTC",
    zoneSet: false,
    dailyGoal: false,
  });
  expect(
    await fixture.operator`select * from practice_game.player_profiles`,
  ).toHaveLength(0);
  expect(
    await fixture.operator`select * from practice_game.streaks`,
  ).toHaveLength(0);
  expect(
    await fixture.operator`select * from practice_game.play_events`,
  ).toHaveLength(0);
  expect(
    statements.filter((s) => /^(insert|update|delete)\b/iu.test(s)),
  ).toEqual([]);
});

const cases = [
  {
    zone: "UTC",
    now: "2026-11-14T00:00:00Z",
    completed: "2026-11-13T23:59:59Z",
    goal: false,
  },
  {
    zone: "UTC",
    now: "2026-11-14T23:59:59Z",
    completed: "2026-11-14T00:00:00Z",
    goal: true,
  },
  {
    zone: "America/Los_Angeles",
    now: "2026-11-14T07:59:59Z",
    completed: "2026-11-14T07:30:00Z",
    goal: true,
  },
  {
    zone: "America/Los_Angeles",
    now: "2026-11-14T08:00:00Z",
    completed: "2026-11-14T07:30:00Z",
    goal: false,
  },
  {
    zone: "Pacific/Kiritimati",
    now: "2026-11-14T09:59:59Z",
    completed: "2026-11-14T09:30:00Z",
    goal: true,
  },
  {
    zone: "Pacific/Kiritimati",
    now: "2026-11-14T10:00:00Z",
    completed: "2026-11-14T09:30:00Z",
    goal: false,
  },
  {
    zone: "America/New_York",
    now: "2026-03-08T07:00:00Z",
    completed: "2026-03-08T06:00:00Z",
    goal: true,
  },
  {
    zone: "Asia/Kolkata",
    now: "2026-11-14T18:30:00Z",
    completed: "2026-11-14T18:29:59Z",
    goal: false,
  },
];
it.each(cases)(
  "matches the old materialized state in $zone at $now",
  async ({ zone, now: timestamp, completed, goal }) => {
    const now = new Date(timestamp);
    await withPlayer(user, (sql) => ensurePlayer(sql, user));
    await fixture.operator`update practice_game.player_profiles set time_zone=${zone},zone_set=true,chosen_level='staff' where user_id=${user}`;
    const lastActive = new Date(now.getTime() - 4 * 86400000)
      .toISOString()
      .slice(0, 10);
    await fixture.operator`update practice_game.streaks set current=8,longest=10,freezes_available=2,last_active_date=${lastActive},last_resolved_date=${lastActive} where user_id=${user}`;
    await fixture.operator`insert into practice_game.points_ledger(id,user_id,delta,reason,ref_id) values(${crypto.randomUUID()},${user},45,'fixture','mine'),(${crypto.randomUUID()},${other},999,'fixture','theirs')`;
    for (const [topic, age] of [
      ["rag-course", 21],
      ["rag", 20],
    ] as const)
      await fixture.operator`insert into practice_game.topic_readiness(user_id,topic,state,verified_level,last_activity_at) values(${user},${topic},'interview_ready','staff',${new Date(now.getTime() - age * 86400000)})`;
    await fixture.operator`insert into practice_game.play_sessions(id,user_id,request_id,topic,mode,completed_at) values(${crypto.randomUUID()},${user},${crypto.randomUUID()},'rag-course','review',${new Date(completed)})`;
    const before = await readPlayerSnapshot(user, now);
    expect(before.points).toBe(45);
    expect(before.dailyGoal).toBe(goal);
    expect(before.readiness.find((r) => r.topic === "rag-course")?.state).toBe(
      "practice_ready",
    );
    expect(before.readiness.find((r) => r.topic === "rag")?.state).toBe(
      "interview_ready",
    );
    expect(
      await fixture.operator`select * from practice_game.play_events`,
    ).toHaveLength(0);
    // The previous page path persisted these policies before returning its snapshot.
    await withPlayer(user, async (sql) => {
      await ensurePlayer(sql, user);
      await refreshStreak(sql, user, false, now);
      await ageReadiness(sql, user, now);
    });
    expect(await readPlayerSnapshot(user, now)).toEqual(before);
  },
);

it("uses four statements without write attempts and enforces a read-only transaction", async () => {
  await readPlayerSnapshot(user);
  statements.length = 0;
  await readPlayerSnapshot(user);
  expect(statements).toHaveLength(4);
  expect(statements.some((s) => /advisory/iu.test(s))).toBe(false);
  await expect(
    readPlayer(
      user,
      (sql) =>
        sql`insert into practice_game.player_profiles(user_id) values(${user})`,
    ),
  ).rejects.toMatchObject({ code: "25006" });
});
