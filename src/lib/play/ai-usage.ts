import "server-only";
import type { PlayTransaction } from "./database";
import { PLAY_LIMITS } from "./config";
import { PlayError } from "./errors";
/** Reserve before calling the provider. Failed calls consume a slot; cached grades do not. */
export async function reserveAiGrade(
  sql: PlayTransaction,
  userId: string,
  now = new Date(),
) {
  const day = now.toISOString().slice(0, 10);
  const rows =
    await sql`insert into practice_game.daily_ai_usage(user_id,day,calls) values(${userId},${day},1) on conflict(user_id,day) do update set calls=daily_ai_usage.calls+1 where daily_ai_usage.calls<${PLAY_LIMITS.aiGradesPerUserPerDay} returning calls`;
  if (!rows.length) {
    const midnight = Date.parse(day + "T00:00:00.000Z") + 86400000;
    throw new PlayError(
      "You've reached today's AI drill limit. Try a math drill or return tomorrow.",
      429,
      Math.max(1, Math.ceil((midnight - now.getTime()) / 1000)),
    );
  }
  return Number(rows[0].calls);
}
