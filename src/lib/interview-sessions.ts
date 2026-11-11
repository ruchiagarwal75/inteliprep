import "server-only";
import { interviewWrapUpSeconds } from "@/lib/interview-timer";
import type { InterviewSelection } from "@/lib/interview-selection";
import type { InterviewEndSnapshot } from "@/lib/interview-end";
import type { Scorecard } from "@/lib/scorecard";
import {
  lockSession,
  InterviewSessionError,
  type PhaseState,
} from "@/lib/interview-session-store";
import {
  pendingQuestions,
  enqueueQuestion,
  unresolvedQuestions,
} from "@/lib/open-question-queue";
import { stageTimeGate } from "@/lib/stage-clock";
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
    if (
      !session.ending &&
      stageTimeGate(session.phaseIndex, false, {
        timing: lease.timing,
        enteredAt: session.phaseEnteredAt ?? lease.timing.startedAt,
      }).wrap
    ) {
      session.phaseIndex = 4;
      session.coveredCriteria = [];
      session.phaseEnteredAt = new Date().toISOString();
    }
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
        phaseEnteredAt: session.phaseEnteredAt,
        openQuestion: session.openQuestion,
        answeredStages: session.answeredStages,
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
    openQuestion: session.openQuestion,
    openQuestions: pendingQuestions(
      session,
      session.transcript?.messages ?? [],
    ),
    pendingDiagramComponents: session.pendingDiagramComponents ?? [],
    topicTurnCounts: session.topicTurnCounts ?? {},
    coveredTopics: session.coveredTopics ?? [],
    recordReply(
      reply: string,
      answered: boolean,
      paused: boolean,
      question?: string,
      resolvedQuestion = false,
      metadata?: {
        resolvedQuestionIds: string[];
        continuedQuestionId?: string;
        topicId?: string;
        stageId: string;
        topicCounts?: Record<string, number>;
        diagramComponents: string[];
        resetQuestions: boolean;
      },
    ) {
      lease.assertHeld();
      if (metadata) {
        const previous = pendingQuestions(
          session,
          session.transcript?.messages ?? [],
        );
        const remaining = metadata.resetQuestions
          ? []
          : unresolvedQuestions(previous, metadata.resolvedQuestionIds);
        const queue =
          paused || remaining.some((q) => q.id === metadata.continuedQuestionId)
            ? remaining
            : enqueueQuestion(
                remaining,
                reply,
                (session.transcript?.messages.length ?? 1) - 1,
                metadata.topicId,
              );
        session.openQuestions = queue;
        session.openQuestion = queue[0]?.question;
        session.pendingDiagramComponents = metadata.diagramComponents;
        if (metadata.topicId && question) {
          const key = metadata.topicId;
          session.topicTurnCounts = {
            ...(metadata.topicCounts ?? session.topicTurnCounts ?? {}),
          };
          session.topicTurnCounts[key] = Math.min(
            100,
            (session.topicTurnCounts[key] ?? 0) + 1,
          );
        }
      }
      if (answered)
        session.answeredStages = [
          ...new Set([...(session.answeredStages ?? []), session.phaseIndex]),
        ];
      if (
        !metadata &&
        (resolvedQuestion || (!paused && (answered || question)))
      )
        session.openQuestion = question;
    },
    clock: {
      timing: lease.timing,
      enteredAt: (session.phaseEnteredAt ??=
        session.phaseIndex === 0
          ? lease.timing.startedAt
          : new Date().toISOString()),
    },
    state: {
      phaseIndex: session.phaseIndex,
      coveredCriteria: [...session.coveredCriteria],
    },
    commit(state: PhaseState, coveredTopics: string[] = []) {
      lease.assertHeld();
      if (
        state.phaseIndex < session.phaseIndex ||
        (state.phaseIndex > session.phaseIndex + 1 &&
          !(
            state.phaseIndex === 4 &&
            Date.parse(lease.timing.deadlineAt) - Date.now() <=
              interviewWrapUpSeconds(lease.timing.durationMinutes) * 1000
          ))
      )
        throw new Error("Interview stages may advance only one step");
      if (session.phaseIndex !== state.phaseIndex)
        session.phaseEnteredAt = new Date().toISOString();
      session.phaseIndex = state.phaseIndex;
      session.coveredCriteria = [...state.coveredCriteria];
      session.coveredTopics = [
        ...new Set([...(session.coveredTopics ?? []), ...coveredTopics]),
      ].slice(-40);
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
        phaseEnteredAt: session.phaseEnteredAt,
        openQuestion: session.openQuestion,
        answeredStages: session.answeredStages,
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
  if (session.transcript && ending.snapshot)
    session.transcript.messages = structuredClone(ending.snapshot.messages);
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
    answeredStageCount: session.answeredStages?.length ?? 0,
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
