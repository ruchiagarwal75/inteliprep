import "server-only";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import {
  isPrivateBeta,
  redisNamespace,
  BetaUnavailableError,
} from "@/lib/beta-config";
import { redisCommand } from "@/lib/redis-rest";

export const REQUEST_LIMITS = {
  chat: [30, 600],
  start: [10, 60],
  end: [10, 30],
  resume: [60, 1_000],
  clientError: [30, 300],
} as const;
export type RequestKind = keyof typeof REQUEST_LIMITS;
type Counter = { count: number; expiresAt: number };
const state = globalThis as typeof globalThis & {
  inteliprepRequestCounters?: Map<string, Counter>;
};
const counters = (state.inteliprepRequestCounters ??= new Map());

/** Vercel sets this header; forwarded headers from local clients are untrusted. */
export function requestIdentity(request: Request): string {
  if (process.env.VERCEL !== "1") return "local";
  const ip = request.headers.get("x-vercel-forwarded-for")?.trim();
  if (!ip || !isIP(ip)) throw new BetaUnavailableError();
  const secret = process.env.INTERVIEW_RESUME_SECRET;
  if (!secret) throw new BetaUnavailableError();
  return createHmac("sha256", secret).update(ip).digest("hex");
}

// Check all windows before incrementing, atomically across server instances.
const LIMIT_SCRIPT = `
local retry = 0
for i, key in ipairs(KEYS) do
  if tonumber(redis.call('GET', key) or '0') >= tonumber(ARGV[i * 2 - 1]) then
    retry = math.max(retry, redis.call('PTTL', key))
  end
end
if retry > 0 then return retry end
for i, key in ipairs(KEYS) do
  local count = redis.call('INCR', key)
  if count == 1 then redis.call('PEXPIRE', key, ARGV[i * 2]) end
end
return 0`;

export async function checkRequestLimit(
  request: Request,
  kind: RequestKind,
): Promise<number> {
  const identity = requestIdentity(request);
  const prefix = `${redisNamespace()}:limit:${kind}:${identity}`;
  const windows: { key: string; limit: number; ms: number }[] = [
    { key: `${prefix}:minute`, limit: REQUEST_LIMITS[kind][0], ms: 60_000 },
    { key: `${prefix}:hour`, limit: REQUEST_LIMITS[kind][1], ms: 3_600_000 },
  ];
  // Shared cost ceiling is deliberately independent of client IP or interview IDs.
  if (kind === "chat" || kind === "end")
    windows.push({
      key: `${redisNamespace()}:limit:model:hour`,
      limit: 2_000,
      ms: 3_600_000,
    });
  if (isPrivateBeta()) {
    const result = await redisCommand([
      "EVAL",
      LIMIT_SCRIPT,
      windows.length,
      ...windows.map((window) => window.key),
      ...windows.flatMap((window) => [window.limit, window.ms]),
    ]);
    if (typeof result !== "number" || result < 0 || !Number.isFinite(result))
      throw new BetaUnavailableError();
    return Math.ceil(result / 1_000);
  }
  const now = Date.now();
  for (const [key, counter] of counters)
    if (counter.expiresAt <= now) counters.delete(key);
  const retry = Math.max(
    0,
    ...windows.map(({ key, limit }) => {
      const counter = counters.get(key);
      return counter && counter.count >= limit ? counter.expiresAt - now : 0;
    }),
  );
  if (retry) return Math.ceil(retry / 1_000);
  if (counters.size > 10_000) throw new BetaUnavailableError();
  for (const { key, ms } of windows) {
    const counter = counters.get(key) ?? { count: 0, expiresAt: now + ms };
    counter.count++;
    counters.set(key, counter);
  }
  return 0;
}
