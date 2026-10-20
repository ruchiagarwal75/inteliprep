import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  openSharedSession,
  publishNewSession,
} from "@/lib/shared-interview-session";
import {
  acquireInterviewSession,
  createInterviewSession,
  interviewSessionCheckpoint,
} from "@/lib/interview-sessions";
import {
  interviewSessionState,
  withInterviewSessionContext,
} from "@/lib/interview-session-context";
import { gradingSelection } from "@/lib/fixtures/scorecard-test";
import { redisSessionCommand } from "@/lib/fixtures/redis-session-test";
import { unsealSession } from "@/lib/session-token";

const redis = vi.hoisted(() => ({ command: vi.fn() }));
vi.mock("@/lib/redis-rest", () => ({ redisCommand: redis.command }));
const values = new Map<string, string>();
beforeEach(() => {
  vi.stubEnv("INTELIPREP_ENV", "beta");
  vi.stubEnv("INTERVIEW_RESUME_SECRET", "s".repeat(32));
  values.clear();
  redis.command.mockReset().mockImplementation(redisSessionCommand(values));
});
afterEach(() => vi.unstubAllEnvs());

async function started() {
  return withInterviewSessionContext(async () => {
    const id = createInterviewSession(gradingSelection);
    const token = interviewSessionCheckpoint(id, gradingSelection).resumeToken;
    await publishNewSession(id);
    expect(interviewSessionState().size).toBe(0);
    return { id, token };
  });
}
function working(id: string, token: string) {
  return withInterviewSessionContext(async () => {
    const shared = await openSharedSession(id, gradingSelection, token);
    const turn = acquireInterviewSession(id, gradingSelection);
    return { shared, turn, state: interviewSessionState() };
  });
}

describe("detached callbacks and overlapping request owners", () => {
  it("persists, rolls back, and discards its own working copy outside the original call stack", async () => {
    const { id, token } = await started();
    const request = await working(id, token);
    expect(() => interviewSessionState()).toThrow("temporarily unavailable");
    request.turn.commit({ phaseIndex: 1, coveredCriteria: [0] });
    await request.shared.persist();
    await request.shared.rollback();
    expect(unsealSession(request.turn.checkpoint()).phaseIndex).toBe(0);
    request.turn.release();
    await request.shared.release();
    expect(request.state.size).toBe(0);
    const next = await working(id, token);
    expect(next.turn.state.phaseIndex).toBe(0);
    next.turn.release();
    await next.shared.release();
    expect(next.state.size).toBe(0);
  });

  it("an expired request cannot roll back or clear another request's state or lease", async () => {
    const { id, token } = await started();
    const old = await working(id, token);
    const lock = [...values.keys()].find((key) => key.endsWith(":lock"));
    if (!lock) throw new Error("Missing session lease");
    values.delete(lock);
    const next = await working(id, token);
    expect(next.state).not.toBe(old.state);
    const owner = values.get(lock);
    next.turn.commit({ phaseIndex: 1, coveredCriteria: [0] });
    await next.shared.persist();
    await expect(old.shared.rollback()).rejects.toThrow(
      "temporarily unavailable",
    );
    old.turn.release();
    await old.shared.release();
    expect(old.state.size).toBe(0);
    expect(next.state.get(id)).toMatchObject({ phaseIndex: 1, busy: true });
    expect(values.get(lock)).toBe(owner);
    next.turn.release();
    await next.shared.release();
    expect(next.state.size).toBe(0);
    expect(values.has(lock)).toBe(false);
    const restored = await working(id, token);
    expect(restored.turn.state.phaseIndex).toBe(1);
    restored.turn.release();
    await restored.shared.release();
  });
});
