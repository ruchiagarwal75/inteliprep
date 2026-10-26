import "server-only";
import { randomUUID } from "node:crypto";
import { currentCandidateId } from "@/lib/candidate-context";
import type { InterviewSelection } from "@/lib/interview-selection";
import type { InterviewEndSnapshot } from "@/lib/interview-end";
import type { Scorecard } from "@/lib/scorecard";
import { endSnapshotHash, unsealSession } from "@/lib/session-token";
import { interviewSessionState } from "@/lib/interview-session-context";
import {
  createInterviewTiming,
  remainingInterviewSeconds,
  type InterviewDuration,
  type InterviewTiming,
} from "@/lib/interview-timer";

export type Session = InterviewSelection & {
  id: string;
  ownerUserId?: string;
  phaseIndex: number;
  coveredCriteria: number[];
  updatedAt: number;
  busy: boolean;
  timing?: InterviewTiming;
  ending?: {
    endedAt: string;
    snapshotHash: string;
    snapshot?: InterviewEndSnapshot;
    scorecard?: Scorecard;
  };
};
export type PhaseState = Pick<Session, "phaseIndex" | "coveredCriteria">;
const SESSION_TTL = 2 * 60 * 60 * 1_000;
const MAX_SESSIONS = 500;

export function getCachedSession(id: string): Session | undefined {
  return interviewSessionState().get(id);
}

export class InterviewSessionError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly ended = false,
    public readonly code?: string,
  ) {
    super(message);
  }
}

export function insertSession(session: Session) {
  const sessions = interviewSessionState();
  for (const [id, saved] of sessions)
    if (!saved.busy && Date.now() - saved.updatedAt > SESSION_TTL)
      sessions.delete(id);
  if (!sessions.has(session.id) && sessions.size >= MAX_SESSIONS) {
    const oldest = [...sessions.values()]
      .filter((saved) => !saved.busy)
      .sort((a, b) => a.updatedAt - b.updatedAt)[0];
    if (!oldest)
      throw new InterviewSessionError(
        "The server is busy. Please try again.",
        503,
      );
    sessions.delete(oldest.id);
  }
  sessions.set(session.id, session);
}

export function createInterviewSession(
  selection: InterviewSelection,
  durationMinutes: InterviewDuration = 45,
): string {
  const id = randomUUID();
  insertSession({
    ...selection,
    ownerUserId: currentCandidateId(),
    id,
    phaseIndex: 0,
    coveredCriteria: [],
    updatedAt: Date.now(),
    busy: false,
    timing: createInterviewTiming(durationMinutes),
  });
  return id;
}

export function lockSession(
  id: string,
  selection: InterviewSelection,
  allowEnded = false,
  token?: string,
) {
  const sessions = interviewSessionState();
  let session = sessions.get(id);
  if (session && !session.busy && Date.now() - session.updatedAt > SESSION_TTL)
    session = undefined;
  if (!session && token) {
    try {
      const checkpoint = unsealSession(token);
      if (
        checkpoint.id !== id ||
        checkpoint.problemId !== selection.problemId ||
        checkpoint.level !== selection.level
      )
        throw new Error("Selection mismatch");
      if (checkpoint.ownerUserId !== currentCandidateId())
        throw new Error("Account mismatch");
      session = { ...checkpoint, updatedAt: Date.now(), busy: false };
    } catch {
      throw new InterviewSessionError(
        "This saved interview can't be resumed with the current server configuration. Your browser copy is still available.",
        409,
      );
    }
    insertSession(session);
  }
  if (!session)
    throw new InterviewSessionError(
      "This interview has expired. Start a new interview.",
      404,
    );
  if (session.ownerUserId !== currentCandidateId())
    throw new InterviewSessionError(
      "This interview is not available for this account.",
      404,
    );
  // Hot reload may retain an ending created before browser checkpoints existed.
  if (session.ending && !session.ending.snapshotHash)
    session.ending.snapshotHash = endSnapshotHash(
      session.ending.snapshot ?? { messages: [] },
    );
  if (
    session.problemId !== selection.problemId ||
    session.level !== selection.level
  )
    throw new InterviewSessionError(
      "The problem and difficulty must match the started interview.",
      409,
    );
  if (session.busy)
    throw new InterviewSessionError(
      "An interview request is already in progress.",
      409,
      Boolean(session.ending),
    );
  if (session.ending && !allowEnded)
    throw new InterviewSessionError(
      "This interview has ended. Start a new interview to continue chatting.",
      409,
      true,
    );
  // Older browser saves get a timer once, when they first reconnect.
  const timing = (session.timing ??= createInterviewTiming());
  if (!allowEnded && remainingInterviewSeconds(timing, Date.now()) === 0)
    throw new InterviewSessionError(
      "Time is up. End this interview to generate your scorecard.",
      409,
      false,
      "INTERVIEW_TIME_EXPIRED",
    );
  session.busy = true;
  let released = false;
  return {
    session,
    timing,
    assertHeld() {
      if (released) throw new Error("Interview turn already released");
    },
    release() {
      if (!released) {
        session.busy = false;
        released = true;
      }
    },
  };
}
