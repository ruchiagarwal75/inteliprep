import "server-only";
import { randomUUID } from "node:crypto";
import type { PlayTransaction } from "./database";
import { levelsForTopic } from "./catalog";
import type { DrillGrade } from "./grade";
import type { RoundSummary } from "./public";
import { awardBadge } from "./badges";
import type { BadgeId } from "./badges";
import { refreshStreak } from "./streak-store";
export async function grantPoints(
  sql: PlayTransaction,
  userId: string,
  delta: number,
  reason: string,
  refId: string,
) {
  if (delta <= 0) return 0;
  await sql`insert into practice_game.points_ledger(id,user_id,delta,reason,ref_id) values(${randomUUID()},${userId},${delta},${reason},${refId}) on conflict(user_id,reason,ref_id) do nothing`;
  const [row] =
    await sql`select delta from practice_game.points_ledger where user_id=${userId} and reason=${reason} and ref_id=${refId}`;
  return Number(row.delta);
}
export async function rewardDrill(
  sql: PlayTransaction,
  userId: string,
  attempt: {
    id: string;
    topic: string;
    level: number;
    private_variant: { definition: { type: string } };
  },
  grade: DrillGrade,
) {
  const points = await grantPoints(
      sql,
      userId,
      grade.correct
        ? (levelsForTopic(attempt.topic).find((l) => l.level === attempt.level)
            ?.points ?? 0)
        : 0,
      "drill",
      attempt.id,
    ),
    badges: BadgeId[] = [];
  if (attempt.private_variant.definition.type === "math") {
    const [row] =
      await sql`update practice_game.player_profiles set math_run=case when ${grade.correct} then math_run+1 else 0 end where user_id=${userId} returning math_run`;
    if (row.math_run >= 5) {
      const badge = await awardBadge(sql, userId, "math-five");
      if (badge) badges.push(badge);
    }
  }
  const streak = await refreshStreak(sql, userId, true);
  if (streak.state.current >= 7) {
    const badge = await awardBadge(sql, userId, "streak-seven");
    if (badge) badges.push(badge);
  }
  return { points, badges };
}
export async function rewardRound(
  sql: PlayTransaction,
  userId: string,
  id: string,
  summary: RoundSummary,
  already: BadgeId[],
) {
  const badges = [...already];
  let bonusPoints = 0;
  if (summary.passedLevels.length) {
    const badge = await awardBadge(sql, userId, "first-level");
    if (badge) badges.push(badge);
  }
  if (summary.mode === "level" && summary.passed && summary.level !== null) {
    const [previous] =
      await sql`select count(*)::integer as count from practice_game.play_sessions where user_id=${userId} and topic=${summary.topic} and level=${summary.level} and mode='level' and completed_at is not null and id<>${id}`;
    if (previous.count === 0)
      bonusPoints = await grantPoints(
        sql,
        userId,
        25,
        "first-level-pass",
        `${summary.topic}:${summary.level}`,
      );
  }
  const result = { ...summary, bonusPoints, earnedBadges: badges };
  await sql`update practice_game.play_sessions set result_json=${sql.json(result)} where user_id=${userId} and id=${id}`;
  return result;
}
