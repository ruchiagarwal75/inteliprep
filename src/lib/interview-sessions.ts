import "server-only";
import type { InterviewSelection } from "@/lib/interview-selection";
import type { InterviewEndSnapshot } from "@/lib/interview-end";
import type { Scorecard } from "@/lib/scorecard";
import {
  lockSession,
  InterviewSessionError,
  type PhaseState,
} from "@/lib/interview-session-store";
import { endSnapshotHash, sealSession } from "@/lib/session-token";

export {
  createInterviewSession,
  InterviewSessionError,
} from "@/lib/interview-session-store";
export type { PhaseState } from "@/lib/interview-session-store";

/** Returns only an opaque checkpoint of already committed server state. */
export function interviewSessionCheckpoint(
  id: string,
  selection: InterviewSelection,
  token?: string,
) {
  const lease = lockSession(id, selection, true, token);
  try {
    const { session } = lease;
    return {
      phaseIndex: session.phaseIndex,
      ended: Boolean(session.ending),
      timing: lease.timing,
      serverTime: new Date().toISOString(),
      resumeToken: sealSession({
        id,
        ownerUserId: session.ownerUserId,
        ...selection,
        phaseIndex: session.phaseIndex,
        coveredCriteria: session.coveredCriteria,
        timing: lease.timing,
        ending: session.ending
          ? {
              endedAt: session.ending.endedAt,
              snapshotHash: session.ending.snapshotHash,
            }
          : undefined,
      }),
    };
  } finally {
    lease.release();
  }
}

/** Failed and concurrent turns cannot advance a stage. */
export function acquireInterviewSession(
  id: string,
  selection: InterviewSelection,
  token?: string,
) {
  const lease = lockSession(id, selection, false, token);
  const { session } = lease;
  return {
    state: {
      phaseIndex: session.phaseIndex,
      coveredCriteria: [...session.coveredCriteria],
    },
    commit(state: PhaseState) {
      lease.assertHeld();
      if (
        state.phaseIndex < session.phaseIndex ||
        state.phaseIndex > session.phaseIndex + 1
      )
        throw new Error("Interview stages may advance only one step");
      session.phaseIndex = state.phaseIndex;
      session.coveredCriteria = [...state.coveredCriteria];
      session.updatedAt = Date.now();
    },
    checkpoint() {
      lease.assertHeld();
      return sealSession({
        id,
        ownerUserId: session.ownerUserId,
        ...selection,
        phaseIndex: session.phaseIndex,
        coveredCriteria: session.coveredCriteria,
        timing: lease.timing,
      });
    },
    release: lease.release,
  };
}

/** Ending freezes evidence immediately. A restored checkpoint verifies the same frozen evidence. */
export function acquireInterviewEnd(
  id: string,
  selection: InterviewSelection,
  snapshot: InterviewEndSnapshot,
  token?: string,
) {
  const lease = lockSession(id, selection, true, token);
  const { session } = lease;
  session.ending ??= {
    endedAt: new Date().toISOString(),
    snapshotHash: endSnapshotHash(snapshot),
    snapshot: structuredClone(snapshot),
  };
  const ending = session.ending;
  if (!ending.snapshot && !ending.scorecard) {
    if (endSnapshotHash(snapshot) !== ending.snapshotHash) {
      lease.release();
      throw new InterviewSessionError(
        "The saved grading evidence does not match the ended interview.",
        409,
        true,
      );
    }
    ending.snapshot = structuredClone(snapshot);
  }
  session.updatedAt = Date.now();
  return {
    endedAt: ending.endedAt,
    timing: lease.timing,
    snapshot: ending.snapshot ? structuredClone(ending.snapshot) : undefined,
    scorecard: ending.scorecard ? structuredClone(ending.scorecard) : undefined,
    complete(scorecard: Scorecard) {
      lease.assertHeld();
      session.ending = {
        endedAt: ending.endedAt,
        snapshotHash: ending.snapshotHash,
        scorecard: structuredClone(scorecard),
      };
      session.updatedAt = Date.now();
    },
    release: lease.release,
  };
}
