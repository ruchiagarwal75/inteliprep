import { afterEach, describe, expect, it, vi } from "vitest";
import {
  acquireInterviewSession,
  createInterviewSession,
} from "@/lib/interview-sessions";

const selection = { problemId: "single-server-scaling", level: "mid" as const };
afterEach(() => vi.useRealTimers());
describe("temporary server-owned interview sessions", () => {
  it("starts independent sessions and only commits completed stage progress", () => {
    const first = createInterviewSession(selection),
      second = createInterviewSession(selection);
    const lease = acquireInterviewSession(first, selection);
    expect(lease.state).toEqual({ phaseIndex: 0, coveredCriteria: [] });
    lease.commit({ phaseIndex: 1, coveredCriteria: [] });
    lease.release();
    const again = acquireInterviewSession(first, selection);
    expect(again.state.phaseIndex).toBe(1);
    again.release();
    const other = acquireInterviewSession(second, selection);
    expect(other.state.phaseIndex).toBe(0);
    other.release();
  });
  it("releases failed turns without progress, and rejects concurrent or mismatched requests", () => {
    const id = createInterviewSession(selection);
    const first = acquireInterviewSession(id, selection);
    expect(() => acquireInterviewSession(id, selection)).toThrow(
      "already in progress",
    );
    first.release();
    const retry = acquireInterviewSession(id, selection);
    expect(retry.state.phaseIndex).toBe(0);
    first.release();
    expect(() => acquireInterviewSession(id, selection)).toThrow(
      "already in progress",
    );
    retry.release();
    expect(() =>
      acquireInterviewSession(id, { ...selection, level: "staff" }),
    ).toThrow("must match");
    expect(() => acquireInterviewSession("missing", selection)).toThrow(
      "expired",
    );
  });
  it("rejects skipped stages and commits after release", () => {
    const lease = acquireInterviewSession(
      createInterviewSession(selection),
      selection,
    );
    expect(() => lease.commit({ phaseIndex: 2, coveredCriteria: [] })).toThrow(
      "one step",
    );
    lease.release();
    expect(() => lease.commit({ phaseIndex: 1, coveredCriteria: [] })).toThrow(
      "released",
    );
  });
  it("expires inactive sessions and bounds the local process cache", () => {
    vi.useFakeTimers();
    const expired = createInterviewSession(selection);
    vi.advanceTimersByTime(2 * 60 * 60 * 1_000 + 1);
    expect(() => acquireInterviewSession(expired, selection)).toThrow(
      "expired",
    );
    const oldest = createInterviewSession(selection);
    for (let index = 0; index < 500; index++) {
      vi.advanceTimersByTime(1);
      createInterviewSession(selection);
    }
    expect(() => acquireInterviewSession(oldest, selection)).toThrow("expired");
  });
});

it("keeps one pending question when a continued ask is reworded", () => {
  const id = createInterviewSession(selection);
  const first = acquireInterviewSession(id, selection);
  const meta = {
    resolvedQuestionIds: [],
    topicId: "id_allocation",
    stageId: "core",
    diagramComponents: [],
    resetQuestions: false,
  };
  first.recordReply(
    "How are IDs allocated?",
    false,
    false,
    "How are IDs allocated?",
    false,
    meta,
  );
  first.release();
  const next = acquireInterviewSession(id, selection);
  const pending = next.openQuestions[0];
  next.recordReply(
    "Which process owns the next ID range?",
    true,
    false,
    "Which process owns the next ID range?",
    false,
    { ...meta, continuedQuestionId: pending.id },
  );
  next.release();
  const saved = acquireInterviewSession(id, selection);
  expect(saved.openQuestions).toHaveLength(1);
  expect(saved.openQuestions[0].id).toBe(pending.id);
  saved.release();
});

it("counts a technical imperative as an ask even without a question mark", async () => {
  const { getCachedSession } = await import("@/lib/interview-session-store");
  const id = createInterviewSession(selection);
  const lease = acquireInterviewSession(id, selection);
  try {
    const metadata = {
      resolvedQuestionIds: [],
      topicId: "fresh:retry-recovery",
      stageId: "core",
      diagramComponents: [],
      resetQuestions: false,
    };
    lease.recordReply(
      "Walk me through recovery after an ambiguous retry.",
      false,
      false,
      undefined,
      false,
      metadata,
    );
    lease.recordReply(
      "That is one tradeoff.",
      false,
      false,
      undefined,
      false,
      metadata,
    );
    expect(getCachedSession(id)?.topicTurnCounts?.[metadata.topicId]).toBe(1);
  } finally {
    lease.release();
  }
});
