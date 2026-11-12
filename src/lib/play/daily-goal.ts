import "server-only";
import { z } from "zod";
import type { PlayTransaction } from "./database";
/** A completed round, passed or not, on the player's own calendar day. */
export async function dailyGoal(sql: PlayTransaction, userId: string) {
  const [row] =
    await sql`select exists(select 1 from practice_game.play_sessions s where s.user_id=${userId} and s.completed_at>=now()-interval '48 hours' and (s.completed_at at time zone p.time_zone)::date=(now() at time zone p.time_zone)::date) as done from practice_game.player_profiles p where p.user_id=${userId}`;
  return z.object({ done: z.boolean() }).parse(row).done;
}
