import { logPlayFailure } from "./log";
import "server-only";
import { randomUUID } from "node:crypto";
import type { PlayTransaction } from "./database";
import { excludedUserIds, reportingEnvironment } from "@/lib/admin-config";
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
  | "mock_started_from_prompt"
  | "intro_shown"
  | "intro_skipped"
  | "intro_completed"
  | "first_topic_started_from_intro";
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
    panel?: number;
  } = {},
) {
  try {
    await sql.savepoint(async (tx) => {
      await tx`insert into practice_game.play_events(id,user_id,event,ref_id,topic,drill_type,correct,time_ms,panel,environment,is_test) values(${randomUUID()},${userId},${event},${refId},${details.topic ?? null},${details.type ?? null},${details.correct ?? null},${details.timeMs ?? null},${details.panel ?? null},${reportingEnvironment()},${excludedUserIds().includes(userId)}) on conflict(user_id,event,ref_id) do nothing`;
    });
  } catch (cause) {
    logPlayFailure("play_event", cause);
  }
}
