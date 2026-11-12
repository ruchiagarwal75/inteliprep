import "server-only";
import { playerXpLevel } from "./game-rules";
import { dailyGoal } from "./daily-goal";
import type { PlayTransaction } from "./database";
import { playTotalsSchema } from "./public";
export async function playerTotals(sql: PlayTransaction, userId: string) {
  const [row] =
    await sql`select (select coalesce(sum(delta),0) from practice_game.points_ledger where user_id=${userId}) as points,current as streak from practice_game.streaks where user_id=${userId}`;
  return playTotalsSchema.parse({
    ...row,
    xpLevel: playerXpLevel(Number(row.points)),
    dailyGoal: await dailyGoal(sql, userId),
  });
}
