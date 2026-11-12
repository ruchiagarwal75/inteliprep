import "server-only";
import { withPlayer } from "./database";
import { storedAttempt, storedRound } from "./round-store";
import { refreshUnanswered } from "./round-refresh";
import { activeDrillMs } from "./drill-time";
import { GAME_RULES } from "./game-rules";
import { PlayError } from "./errors";
export async function recordDrillActivity(
  userId: string,
  attemptId: string,
  revision: number,
  visible: boolean,
  activity: { order?: number } = {},
) {
  return withPlayer(userId, async (sql) => {
    let attempt = await storedAttempt(sql, userId, attemptId);
    const round = await storedRound(sql, userId, attempt.session_id),
      now = new Date();
    const refreshed = await refreshUnanswered(sql, userId, round, now);
    if (refreshed) attempt = await storedAttempt(sql, userId, attemptId);
    const maxTimeMs =
      3 * GAME_RULES.parMs[attempt.private_variant.definition.type];
    if (attempt.ordinal !== round.active_ordinal)
      throw new PlayError("Open the current drill to continue.", 409);
    if (revision !== attempt.variant_revision)
      return { elapsedMs: 0, maxTimeMs, refreshed: true };
    const elapsedMs =
      attempt.time_ms ??
      activeDrillMs({
        elapsedMs: attempt.active_elapsed_ms,
        activeSince: attempt.active_since?.getTime() ?? null,
        now: now.getTime(),
        maxTimeMs,
      });
    const order = activity.order ?? attempt.activity_order + 1;
    // A delayed heartbeat must never reopen a newer pause, or pause a newer resume.
    if (order <= attempt.activity_order)
      return {
        elapsedMs: Math.min(elapsedMs, maxTimeMs),
        maxTimeMs,
        refreshed,
      };
    if (!attempt.answer && !round.completed_at) {
      await sql`update practice_game.drill_attempts set active_elapsed_ms=${elapsedMs},active_since=${visible ? now : null},activity_order=${order} where user_id=${userId} and id=${attemptId} and answer is null`;
      await sql`update practice_game.play_sessions set last_activity_at=${now} where user_id=${userId} and id=${round.id}`;
    }
    return { elapsedMs: Math.min(elapsedMs, maxTimeMs), maxTimeMs, refreshed };
  });
}
