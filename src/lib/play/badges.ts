import "server-only";
import type { PlayTransaction } from "./database";
import { recordPlayEvent } from "./events";
import type { BADGE_LABELS } from "./public";
export type BadgeId = keyof typeof BADGE_LABELS;
export async function awardBadge(
  sql: PlayTransaction,
  userId: string,
  badge: BadgeId,
) {
  const rows =
    await sql`insert into practice_game.badges(user_id,badge_id) values(${userId},${badge}) on conflict do nothing returning badge_id`;
  if (rows.length) {
    await recordPlayEvent(sql, userId, "badge_earned", badge);
    return badge;
  }
}
