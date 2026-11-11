import "server-only";
import { z } from "zod";
import type { PlayTransaction } from "./database";
import { streakChange } from "./streak-policy";
import { recordPlayEvent } from "./events";
const stateSchema = z.object({
  current: z.number().int(),
  longest: z.number().int(),
  freezesAvailable: z.number().int(),
  lastActiveDate: z.string().nullable(),
  lastResolvedDate: z.string().nullable(),
  timeZone: z.string(),
});
export async function refreshStreak(
  sql: PlayTransaction,
  userId: string,
  completed = false,
  now = new Date(),
) {
  const [row] =
    await sql`select s.current,s.longest,s.freezes_available as "freezesAvailable",s.last_active_date::text as "lastActiveDate",s.last_resolved_date::text as "lastResolvedDate",p.time_zone as "timeZone" from practice_game.streaks s join practice_game.player_profiles p using(user_id) where user_id=${userId}`;
  const old = stateSchema.parse(row),
    change = streakChange(old, now, old.timeZone, completed),
    next = change.state;
  await sql`update practice_game.streaks set current=${next.current},longest=${next.longest},freezes_available=${next.freezesAvailable},last_active_date=${next.lastActiveDate},last_resolved_date=${next.lastResolvedDate} where user_id=${userId}`;
  if (change.extended)
    await recordPlayEvent(sql, userId, "streak_extended", change.today);
  for (const date of change.usedDates)
    await recordPlayEvent(sql, userId, "freeze_used", date);
  return change;
}
