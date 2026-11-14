import "server-only";
import { recordRoundTime } from "./round-timing";
import type { TransactionSql } from "postgres";
import { reportingDb } from "@/lib/reporting-db";
export type PlayTransaction = TransactionSql;
/** A single snapshot query needs RLS scope, but no write lock or mutable state. */
export function readPlayer<T>(
  userId: string,
  work: (sql: PlayTransaction) => Promise<T>,
) {
  return reportingDb().begin("read only", async (sql) => {
    await sql`select set_config('mockmeai.user_id',${userId},true)`;
    return work(sql);
  });
}
/** Every statement shares the same connection, verified owner and per-player lock. */
export async function withPlayer<T>(
  userId: string,
  work: (sql: PlayTransaction) => Promise<T>,
) {
  const started = performance.now();
  let acquireMs = 0,
    lockMs = 0,
    workMs = 0,
    acquired = false;
  try {
    return await reportingDb().begin(async (sql) => {
      acquireMs = performance.now() - started;
      acquired = true;
      const lockStarted = performance.now();
      await sql`select set_config('mockmeai.user_id',${userId},true),pg_advisory_xact_lock(hashtext('mockmeai-play'),hashtext(${userId}))`;
      lockMs = performance.now() - lockStarted;
      const workStarted = performance.now();
      try {
        return await work(sql);
      } finally {
        workMs = performance.now() - workStarted;
      }
    });
  } finally {
    const total = performance.now() - started;
    if (!acquired) acquireMs = total;
    recordRoundTime("dbAcquireMs", acquireMs);
    recordRoundTime("dbLockMs", lockMs);
    recordRoundTime("dbWorkMs", workMs);
    recordRoundTime(
      "dbFinishMs",
      Math.max(0, total - acquireMs - lockMs - workMs),
    );
  }
}
export async function ensurePlayer(sql: PlayTransaction, userId: string) {
  await sql`insert into practice_game.player_profiles(user_id) values(${userId}) on conflict do nothing`;
  await sql`insert into practice_game.streaks(user_id) values(${userId}) on conflict do nothing`;
}
