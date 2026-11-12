import "server-only";
import type { TransactionSql } from "postgres";
import { reportingDb } from "@/lib/reporting-db";
export type PlayTransaction = TransactionSql;
/** Every statement shares the same connection, verified owner and per-player lock. */
export function withPlayer<T>(
  userId: string,
  work: (sql: PlayTransaction) => Promise<T>,
) {
  return reportingDb().begin(async (sql) => {
    await sql`select set_config('mockmeai.user_id',${userId},true),pg_advisory_xact_lock(hashtext('mockmeai-play'),hashtext(${userId}))`;
    return work(sql);
  });
}
export async function ensurePlayer(sql: PlayTransaction, userId: string) {
  await sql`insert into practice_game.player_profiles(user_id) values(${userId}) on conflict do nothing`;
  await sql`insert into practice_game.streaks(user_id) values(${userId}) on conflict do nothing`;
}
