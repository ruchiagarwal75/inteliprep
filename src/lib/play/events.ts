import { logPlayFailure } from "./log";
import "server-only";
import { randomUUID } from "node:crypto";
import type { PlayTransaction } from "./database";
export type PlayEvent =
  | "drill_started"
  | "drill_submitted"
  | "level_passed"
  | "placement_done"
  | "streak_extended"
  | "freeze_used"
  | "badge_earned"
  | "readiness_changed"
  | "mock_prompt_shown"
  | "mock_started_from_prompt";
/** Small transactional boundary for a future analytics provider. No answer text. */
export async function recordPlayEvent(
  sql: PlayTransaction,
  userId: string,
  event: PlayEvent,
  refId: string,
  details: {
    topic?: string;
    type?: string;
    correct?: boolean;
    timeMs?: number;
  } = {},
) {
  try {
    await sql.savepoint(async (tx) => {
      await tx`insert into practice_game.play_events(id,user_id,event,ref_id,topic,drill_type,correct,time_ms) values(${randomUUID()},${userId},${event},${refId},${details.topic ?? null},${details.type ?? null},${details.correct ?? null},${details.timeMs ?? null}) on conflict(user_id,event,ref_id) do nothing`;
    });
  } catch (cause) {
    logPlayFailure("play_event", cause);
  }
}
