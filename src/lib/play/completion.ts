import { recordPlayEvent } from "./events";
import "server-only";
import { z } from "zod";
import type { PlayTransaction } from "./database";
import { levelsForTopic } from "./catalog";
import { levelPassed } from "./round-rules";
import { roundSummarySchema } from "./public";
import { storedRound } from "./round-store";
export async function markLevel(
  sql: PlayTransaction,
  userId: string,
  topic: string,
  level: number,
  score: number,
  passed: boolean,
) {
  await sql`insert into practice_game.level_progress(user_id,topic,level,status,best_score,passed_at) values(${userId},${topic},${level},${passed ? "passed" : "open"},${score},${passed ? new Date() : null}) on conflict(user_id,topic,level) do update set best_score=greatest(level_progress.best_score,excluded.best_score),status=case when level_progress.status='passed' or excluded.status='passed' then 'passed' else level_progress.status end,passed_at=coalesce(level_progress.passed_at,excluded.passed_at)`;
  if (passed) {
    const levels = levelsForTopic(topic),
      index = levels.findIndex((item) => item.level === level),
      next = levels[index + 1];
    if (next)
      await sql`insert into practice_game.level_progress(user_id,topic,level,status) values(${userId},${topic},${next.level},'open') on conflict(user_id,topic,level) do update set status=case when level_progress.status='locked' then 'open' else level_progress.status end`;
  }
}
export async function completeRound(
  sql: PlayTransaction,
  userId: string,
  id: string,
) {
  const round = await storedRound(sql, userId, id);
  if (round.completed_at) return round.result_json ?? undefined;
  const rows =
    await sql`select drill_id,level,correct,submitted_at,private_variant->'definition'->>'title' as title from practice_game.drill_attempts where user_id=${userId} and session_id=${id} order by ordinal`;
  if (!rows.length || rows.some((row) => !row.submitted_at)) return;
  const attempts = z
    .array(
      z.object({
        drill_id: z.string(),
        level: z.number(),
        correct: z.boolean(),
        title: z.string(),
      }),
    )
    .parse(rows);
  const correct = attempts.filter((row) => row.correct).length,
    passedLevels: number[] = [];
  if (round.mode === "level" && round.level !== null) {
    const passed = levelPassed(attempts.map((row) => row.correct));
    await markLevel(
      sql,
      userId,
      round.topic,
      round.level,
      correct / attempts.length,
      passed,
    );
    if (passed) passedLevels.push(round.level);
  }
  if (round.mode === "placement")
    for (const level of [...new Set(attempts.map((row) => row.level))]) {
      const subset = attempts.filter((row) => row.level === level),
        passed = subset.length === 2 && subset.every((row) => row.correct);
      await markLevel(
        sql,
        userId,
        round.topic,
        level,
        subset.filter((row) => row.correct).length / 2,
        passed,
      );
      if (passed) passedLevels.push(level);
    }
  const summary = roundSummarySchema.parse({
    mode: round.mode,
    topic: round.topic,
    level: round.level,
    correct,
    total: attempts.length,
    passed:
      round.mode === "level"
        ? passedLevels.includes(round.level ?? 0)
        : correct === attempts.length,
    passedLevels,
    retryDrills: attempts
      .filter((row) => !row.correct)
      .map((row) => ({
        drillId: row.drill_id,
        title: row.title,
        level: row.level,
      })),
    bonusPoints: 0,
    earnedBadges: [],
    practiceReadyNow: false,
  });
  await sql`update practice_game.play_sessions set completed_at=now(),result_json=${sql.json(summary)} where user_id=${userId} and id=${id} and completed_at is null`;
  for (const level of passedLevels)
    await recordPlayEvent(sql, userId, "level_passed", `${id}:${level}`, {
      topic: round.topic,
    });
  if (round.mode === "placement")
    await recordPlayEvent(sql, userId, "placement_done", id, {
      topic: round.topic,
    });
  return summary;
}
