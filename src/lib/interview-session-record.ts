import "server-only";
import {
  getCachedSession,
  insertSession,
  type Session,
} from "@/lib/interview-session-store";
import type { SharedSessionRecord } from "@/lib/shared-session-record";

/** Snapshot progress without attempting a second local lock. */
export function exportSessionRecord(id: string): SharedSessionRecord {
  const session = getCachedSession(id);
  if (!session) throw new Error("Missing interview session");
  const {
    ownerUserId,
    problemId,
    level,
    phaseIndex,
    coveredCriteria,
    timing,
    ending,
  } = session;
  return structuredClone({
    checkpoint: {
      id,
      ownerUserId,
      problemId,
      level,
      phaseIndex,
      coveredCriteria,
      timing,
      ending: ending
        ? { endedAt: ending.endedAt, snapshotHash: ending.snapshotHash }
        : undefined,
    },
    scorecard: ending?.scorecard,
  });
}

/** Called only with a shared lease. It may replace a crashed instance's stale busy flag. */
export function importSessionRecord(
  id: string,
  record: SharedSessionRecord,
  rollbackOwner?: Session,
): void {
  const { checkpoint, scorecard } = structuredClone(record);
  if (checkpoint.id !== id) throw new Error("Shared session mismatch");
  const existing = getCachedSession(id);
  if (rollbackOwner && existing !== rollbackOwner) return;
  const restored: Session = {
    ...checkpoint,
    updatedAt: Date.now(),
    busy: rollbackOwner?.busy ?? false,
    ending: checkpoint.ending ? { ...checkpoint.ending, scorecard } : undefined,
  };
  if (rollbackOwner) Object.assign(rollbackOwner, restored);
  else insertSession(restored);
}
