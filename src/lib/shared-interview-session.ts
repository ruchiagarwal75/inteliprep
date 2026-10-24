import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { InterviewSelection } from "@/lib/interview-selection";
import {
  isPrivateBeta,
  redisNamespace,
  BetaUnavailableError,
} from "@/lib/beta-config";
import { redisCommand } from "@/lib/redis-rest";
import {
  exportSessionRecord,
  importSessionRecord,
} from "@/lib/interview-session-record";
import {
  getCachedSession,
  InterviewSessionError,
  type Session,
} from "@/lib/interview-session-store";
import { interviewSessionState } from "@/lib/interview-session-context";
import { unsealSession } from "@/lib/session-token";
import {
  serializeSharedRecord,
  parseSharedRecord,
} from "@/lib/shared-session-record";
import { logServerEvent } from "@/lib/server-events";

const TTL_SECONDS = 7_200;
const LOCK_MS = 180_000; // Longer than the route's 120-second hard limit.
const SAVE_SCRIPT = `
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[2], ARGV[2], 'EX', ARGV[3])
return 1`;
const RELEASE_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end
return 0`;
const recordKey = (id: string) => `${redisNamespace()}:session:${id}`;

export async function publishNewSession(id: string): Promise<void> {
  if (!isPrivateBeta()) return;
  const state = interviewSessionState();
  try {
    const result = await redisCommand([
      "SET",
      recordKey(id),
      serializeSharedRecord(exportSessionRecord(id)),
      "NX",
      "EX",
      TTL_SECONDS,
    ]);
    if (result !== "OK") throw new BetaUnavailableError();
  } finally {
    state.delete(id);
  }
}

/** The signed token proves possession; a UUID alone is insufficient in the beta. */
export async function openSharedSession(
  id: string,
  selection: InterviewSelection,
  token?: string,
) {
  if (!isPrivateBeta())
    return {
      persist: async () => {},
      rollback: async () => {},
      release: async () => {},
    };
  let incoming;
  try {
    incoming = unsealSession(token ?? "");
    if (
      incoming.id !== id ||
      incoming.problemId !== selection.problemId ||
      incoming.level !== selection.level
    )
      throw new Error("Selection mismatch");
  } catch {
    throw new InterviewSessionError(
      "A valid saved interview checkpoint is required. Reopen your saved interview or start a new one.",
      409,
    );
  }
  const state = interviewSessionState();
  let localOwner: Session | undefined;
  const owner = randomUUID();
  const lockKey = `${recordKey(id)}:lock`;
  const acquired = await redisCommand([
    "SET",
    lockKey,
    owner,
    "NX",
    "PX",
    LOCK_MS,
  ]);
  if (acquired !== "OK")
    throw new InterviewSessionError(
      "An interview request is already in progress. Please wait and retry.",
      409,
    );
  let released = false;
  const release = AsyncLocalStorage.bind(async () => {
    if (released) return;
    released = true;
    try {
      await redisCommand(["EVAL", RELEASE_SCRIPT, 1, lockKey, owner]);
    } catch (cause) {
      logServerEvent(
        { event: "api_failure", route: "session-lock", status: 503 },
        cause,
      );
    } finally {
      // A stream may finish after the handler returns. Drop only its own working copy.
      if (localOwner && state.get(id) === localOwner) state.delete(id);
    }
  });
  try {
    const saved = await redisCommand(["GET", recordKey(id)]);
    if (saved !== null && typeof saved !== "string")
      throw new BetaUnavailableError();
    let record =
      typeof saved === "string"
        ? parseSharedRecord(saved)
        : { checkpoint: incoming };
    const checkpoint = record.checkpoint;
    if (
      checkpoint.problemId !== selection.problemId ||
      checkpoint.level !== selection.level
    )
      throw new BetaUnavailableError();
    // An ended checkpoint issued during a failed publish cannot reopen an active record.
    if (!checkpoint.ending && incoming.ending)
      record = { checkpoint: incoming };
    importSessionRecord(id, record);
    localOwner = getCachedSession(id);
    const before = exportSessionRecord(id);
    const save = async (record: string) => {
      if (released) throw new BetaUnavailableError();
      const result = await redisCommand([
        "EVAL",
        SAVE_SCRIPT,
        2,
        lockKey,
        recordKey(id),
        owner,
        record,
        TTL_SECONDS,
      ]);
      if (result !== 1) throw new BetaUnavailableError();
    };
    const persist = AsyncLocalStorage.bind(() =>
      save(serializeSharedRecord(exportSessionRecord(id))),
    );
    return {
      persist,
      rollback: AsyncLocalStorage.bind(async () => {
        // Fence before mutating local state as well as Redis. An expired owner must
        // never corrupt a replacement request's in-process lease.
        await save(serializeSharedRecord(before));
        importSessionRecord(id, before, localOwner);
      }),
      release,
    };
  } catch (cause) {
    await release();
    if (
      cause instanceof InterviewSessionError ||
      cause instanceof BetaUnavailableError
    )
      throw cause;
    throw new BetaUnavailableError();
  }
}
