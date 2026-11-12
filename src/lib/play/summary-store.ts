import "server-only";
import { z } from "zod";
import type { PlayTransaction } from "./database";
import type { RoundSummary } from "./public";
import { levelsForTopic } from "./catalog";
import { levelUnlocked } from "./round-rules";
export async function nextRoundLevel(
  sql: PlayTransaction,
  userId: string,
  topic: string,
) {
  const rows =
    await sql`select level from practice_game.level_progress where user_id=${userId} and topic=${topic} and status='passed'`;
  const passed = z
      .array(z.object({ level: z.number().int() }))
      .parse(rows)
      .map((row) => row.level),
    levels = levelsForTopic(topic);
  const next = levels.find(
    (level) =>
      !passed.includes(level.level) &&
      levelUnlocked(level.level, levels, passed),
  );
  return next ? { level: next.level, title: next.title } : undefined;
}
/** Enrich older saved results without rewriting or discarding them. */
export async function displayRoundSummary(
  sql: PlayTransaction,
  userId: string,
  id: string,
  summary: RoundSummary,
) {
  if (summary.pointsEarned !== undefined) return summary;
  const [row] =
    await sql`select coalesce(sum(points_awarded),0)::integer as points from practice_game.drill_attempts where session_id=${id} and user_id=${userId}`;
  const points = z.object({ points: z.number().int() }).parse(row).points;
  return {
    ...summary,
    pointsEarned: points + summary.bonusPoints,
    nextLevel: summary.passed
      ? await nextRoundLevel(sql, userId, summary.topic)
      : undefined,
  };
}
