import "server-only";
import {
  usesSharedStore,
  redisNamespace,
  BetaUnavailableError,
} from "@/lib/beta-config";
import { redisCommand } from "@/lib/redis-rest";
export const NEW_VIEWER_ROWS_PER_DAY = 2000;
const script = `if redis.call('SISMEMBER',KEYS[1],ARGV[1]) == 1 then return 1 end
if redis.call('SCARD',KEYS[1]) >= tonumber(ARGV[2]) then return 0 end
redis.call('SADD',KEYS[1],ARGV[1]); redis.call('EXPIRE',KEYS[1],172800); return 1`;
const state = globalThis as typeof globalThis & {
  mockmeaiViewerBudget?: Map<string, Set<string>>;
};
/** Reserve new identifiers atomically across deployed instances, independently of per-IP quotas. */
export async function reserveViewerRow(
  kind: "browser" | "ip",
  identifier: string,
) {
  const day = new Date().toISOString().slice(0, 10),
    key = `${redisNamespace()}:viewer-new:${kind}:${day}`;
  if (usesSharedStore()) {
    const result = await redisCommand([
      "EVAL",
      script,
      1,
      key,
      identifier,
      NEW_VIEWER_ROWS_PER_DAY,
    ]);
    if (result !== 0 && result !== 1) throw new BetaUnavailableError();
    return result === 1;
  }
  const budgets = (state.mockmeaiViewerBudget ??= new Map());
  for (const old of budgets.keys()) if (!old.endsWith(day)) budgets.delete(old);
  const entries = budgets.get(key) ?? new Set<string>();
  budgets.set(key, entries);
  if (entries.has(identifier)) return true;
  if (entries.size >= NEW_VIEWER_ROWS_PER_DAY) return false;
  entries.add(identifier);
  return true;
}
