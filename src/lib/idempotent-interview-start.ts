import "server-only";
import { randomUUID } from "node:crypto";
import {
  interviewStartSchema,
  type InterviewStart,
  type InterviewLevel,
} from "@/lib/interview-selection";
import type { InterviewDuration } from "@/lib/interview-timer";
import type { ProblemDefinition } from "@/lib/problems";
import { createInterviewStart } from "@/lib/problems";
import {
  usesSharedStore,
  redisNamespace,
  BetaUnavailableError,
} from "@/lib/beta-config";
import { redisCommand } from "@/lib/redis-rest";
import { exportSessionRecord } from "@/lib/interview-session-record";
import { serializeSharedRecord } from "@/lib/shared-session-record";
import { interviewSessionState } from "@/lib/interview-session-context";
import {
  checkRequestLimit,
  refundLocalStartLimit,
  requestIdentity,
  requestLimitWindows,
} from "@/lib/request-limits";
import { InterviewSessionError } from "@/lib/interview-session-store";
import { setInterviewReference } from "@/lib/reporting-context";
const TTL = 7200;

// Publish the response, authoritative transcript and quota charge in one Redis transaction.
// Even if the HTTP response is lost, a retry gets the same interview and original clock.
export const START_SCRIPT = `-- inteliprep-idempotent-start-v1
local cached = redis.call('GET', KEYS[1])
if cached then return {'cached', cached} end
local retry = 0
for i=3,#KEYS do
 if tonumber(redis.call('GET',KEYS[i]) or '0') >= tonumber(ARGV[(i-3)*2+4]) then
  retry = math.max(retry,redis.call('PTTL',KEYS[i]))
 end
end
if retry > 0 then return {'limited', tostring(retry)} end
for i=3,#KEYS do
 local count = redis.call('INCR',KEYS[i])
 if count == 1 then redis.call('PEXPIRE',KEYS[i],ARGV[(i-3)*2+5]) end
end
redis.call('SET',KEYS[1],ARGV[1],'EX',ARGV[3])
redis.call('SET',KEYS[2],ARGV[2],'EX',ARGV[3])
return {'created',ARGV[1]}`;

export class InterviewStartLimit extends Error {
  constructor(public readonly retryAfter: number) {
    super("Too many requests. Please wait before trying again.");
  }
}
type Result = {
  interview: InterviewStart;
  created: boolean;
  record?: ReturnType<typeof exportSessionRecord>;
};
type Entry = { selection: string; expiresAt: number; result: Promise<Result> };
const state = globalThis as typeof globalThis & {
  inteliprepStarts?: Map<string, Entry>;
};
const local = (state.inteliprepStarts ??= new Map());
function readCached(value: string, selection: string): InterviewStart {
  const parsed: unknown = JSON.parse(value);
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("selection" in parsed) ||
    !("interview" in parsed)
  )
    throw new BetaUnavailableError();
  if (parsed.selection !== selection)
    throw new InterviewSessionError(
      "This start request belongs to a different interview selection.",
      409,
    );
  return {
    ...interviewStartSchema.parse(parsed.interview),
    serverTime: new Date().toISOString(),
  };
}
export async function idempotentInterviewStart(
  request: Request,
  problem: ProblemDefinition,
  level: InterviewLevel,
  duration: InterviewDuration,
  requestId: string = randomUUID(),
): Promise<Result> {
  const selection = JSON.stringify([problem.id, level, duration]);
  const key = `${redisNamespace()}:start:${requestIdentity(request)}:${requestId}`;
  if (!usesSharedStore()) {
    for (const [k, entry] of local)
      if (entry.expiresAt <= Date.now()) local.delete(k);
    const previous = local.get(key);
    if (previous) {
      if (previous.selection !== selection)
        throw new InterviewSessionError(
          "This start request belongs to a different interview selection.",
          409,
        );
      const result = await previous.result;
      return {
        interview: {
          ...result.interview,
          serverTime: new Date().toISOString(),
        },
        created: false,
      };
    }
    if (local.size >= 10000) throw new BetaUnavailableError();
    const result = (async () => {
      const retry = await checkRequestLimit(request, "start");
      if (retry) throw new InterviewStartLimit(retry);
      try {
        const interview = createInterviewStart(problem, level, duration);
        return {
          interview,
          record: exportSessionRecord(interview.sessionId),
          created: true,
        };
      } catch (cause) {
        refundLocalStartLimit(request);
        throw cause;
      }
    })();
    local.set(key, { selection, expiresAt: Date.now() + TTL * 1000, result });
    try {
      return await result;
    } catch (cause) {
      if (local.get(key)?.result === result) local.delete(key);
      throw cause;
    }
  }
  const cached = await redisCommand(["GET", key]);
  if (typeof cached === "string")
    return { interview: readCached(cached, selection), created: false };
  if (cached !== null) throw new BetaUnavailableError();
  const interview = createInterviewStart(problem, level, duration);
  setInterviewReference(interview.sessionId, duration === 1);
  try {
    const record = exportSessionRecord(interview.sessionId);
    const windows = requestLimitWindows(request, "start");
    const result = await redisCommand([
      "EVAL",
      START_SCRIPT,
      windows.length + 2,
      key,
      `${redisNamespace()}:session:${interview.sessionId}`,
      ...windows.map((w) => w.key),
      JSON.stringify({ selection, interview }),
      serializeSharedRecord(record),
      TTL,
      ...windows.flatMap((w) => [w.limit, w.ms]),
    ]);
    if (!Array.isArray(result) || typeof result[1] !== "string")
      throw new BetaUnavailableError();
    if (result[0] === "limited")
      throw new InterviewStartLimit(Math.ceil(Number(result[1]) / 1000));
    if (result[0] !== "created" && result[0] !== "cached")
      throw new BetaUnavailableError();
    return {
      interview: readCached(result[1], selection),
      created: result[0] === "created",
      ...(result[0] === "created" ? { record } : {}),
    };
  } finally {
    interviewSessionState().delete(interview.sessionId);
  }
}
