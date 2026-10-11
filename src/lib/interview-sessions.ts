import "server-only";
import { randomUUID } from "node:crypto";
import type { InterviewSelection } from "@/lib/interview-selection";

type Session = InterviewSelection & {
  id: string;
  phaseIndex: number;
  coveredCriteria: number[];
  updatedAt: number;
  busy: boolean;
};
export type PhaseState = Pick<Session, "phaseIndex" | "coveredCriteria">;
// Shared across route bundles and hot reloads in the local Node process.
const processState = globalThis as typeof globalThis & {
  inteliprepSessions?: Map<string, Session>;
};
const sessions = (processState.inteliprepSessions ??= new Map());
const SESSION_TTL = 2 * 60 * 60 * 1_000;
const MAX_SESSIONS = 500;

export class InterviewSessionError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export function createInterviewSession(selection: InterviewSelection): string {
  const now = Date.now();
  for (const [id, session] of sessions)
    if (!session.busy && now - session.updatedAt > SESSION_TTL)
      sessions.delete(id);
  if (sessions.size >= MAX_SESSIONS) {
    const oldest = [...sessions.values()]
      .filter((session) => !session.busy)
      .sort((a, b) => a.updatedAt - b.updatedAt)[0];
    if (!oldest)
      throw new InterviewSessionError(
        "The server is busy. Please try again.",
        503,
      );
    sessions.delete(oldest.id);
  }
  const id = randomUUID();
  sessions.set(id, {
    ...selection,
    id,
    phaseIndex: 0,
    coveredCriteria: [],
    updatedAt: now,
    busy: false,
  });
  return id;
}

/** Only a completed turn may commit its stage; failed and concurrent turns cannot advance it. */
export function acquireInterviewSession(
  id: string,
  selection: InterviewSelection,
) {
  const session = sessions.get(id);
  if (!session || Date.now() - session.updatedAt > SESSION_TTL)
    throw new InterviewSessionError(
      "This interview has expired. Start a new interview.",
      404,
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
      "An interviewer reply is already in progress.",
      409,
    );
  session.busy = true;
  let released = false;
  return {
    state: {
      phaseIndex: session.phaseIndex,
      coveredCriteria: [...session.coveredCriteria],
    },
    commit(state: PhaseState) {
      if (released) throw new Error("Interview turn already released");
      if (
        state.phaseIndex < session.phaseIndex ||
        state.phaseIndex > session.phaseIndex + 1
      )
        throw new Error("Interview stages may advance only one step");
      session.phaseIndex = state.phaseIndex;
      session.coveredCriteria = [...state.coveredCriteria];
      session.updatedAt = Date.now();
    },
    release() {
      if (!released) {
        session.busy = false;
        released = true;
      }
    },
  };
}
