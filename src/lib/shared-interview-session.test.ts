import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it as test,
  vi,
} from "vitest";
import {
  openSharedSession,
  publishNewSession,
} from "@/lib/shared-interview-session";
import {
  createInterviewSession,
  acquireInterviewSession,
  acquireInterviewEnd,
  interviewSessionCheckpoint,
} from "@/lib/interview-sessions";
import {
  scorecardFixture,
  gradingSelection,
} from "@/lib/fixtures/scorecard-test";
import {
  interviewSessionState,
  withInterviewSessionContext,
} from "@/lib/interview-session-context";
import { redisSessionCommand } from "@/lib/fixtures/redis-session-test";

const redis = vi.hoisted(() => ({
  command: vi.fn(),
  values: new Map<string, string>(),
}));
vi.mock("@/lib/redis-rest", () => ({ redisCommand: redis.command }));

beforeEach(() => {
  vi.stubEnv("INTELIPREP_ENV", "beta");
  vi.stubEnv("INTERVIEW_RESUME_SECRET", "s".repeat(32));
  redis.values.clear();
  redis.command.mockImplementation(redisSessionCommand(redis.values));
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function newSession() {
  const id = createInterviewSession(gradingSelection);
  return {
    id,
    token: interviewSessionCheckpoint(id, gradingSelection).resumeToken,
  };
}
function expectDiscardedState() {
  expect(interviewSessionState().size).toBe(0);
}
const it = (name: string, work: () => Promise<void>) =>
  test(name, () => withInterviewSessionContext(work));

describe("shared interview coordination", () => {
  it("retains an authentic ended checkpoint if the first freeze publish failed", async () => {
    const { id, token } = newSession();
    await publishNewSession(id);
    const unpublished = await openSharedSession(id, gradingSelection, token);
    const ending = acquireInterviewEnd(id, gradingSelection, {
      messages: [],
    });
    ending.release();
    const endedToken = interviewSessionCheckpoint(
      id,
      gradingSelection,
    ).resumeToken;
    await unpublished.release();
    expectDiscardedState();
    const shared = await openSharedSession(id, gradingSelection, endedToken);
    expect(interviewSessionCheckpoint(id, gradingSelection).ended).toBe(true);
    await shared.persist();
    await shared.release();
  });
  it("recovers a crashed busy cache and prevents the expired owner rolling back a new turn", async () => {
    const { id, token } = newSession();
    await publishNewSession(id);
    const oldShared = await openSharedSession(id, gradingSelection, token);
    const oldTurn = acquireInterviewSession(id, gradingSelection);
    const lock = [...redis.values.keys()].find((key) => key.endsWith(":lock"));
    if (!lock) throw new Error("Missing lock");
    redis.values.delete(lock); // An expired lease after the previous function died.
    const nextShared = await openSharedSession(id, gradingSelection, token);
    const nextTurn = acquireInterviewSession(id, gradingSelection);
    nextTurn.commit({ phaseIndex: 1, coveredCriteria: [0] });
    await nextShared.persist();
    await expect(oldShared.rollback()).rejects.toThrow();
    oldTurn.release();
    expect(() => acquireInterviewSession(id, gradingSelection)).toThrow(
      "already in progress",
    );
    nextTurn.release();
    expect(interviewSessionCheckpoint(id, gradingSelection).phaseIndex).toBe(1);
    await oldShared.release();
    await nextShared.release();
  });
  it("rejects unsigned requests and concurrent requests across instances", async () => {
    const { id, token } = newSession();
    await publishNewSession(id);
    await expect(openSharedSession(id, gradingSelection)).rejects.toMatchObject(
      { status: 409 },
    );
    const shared = await openSharedSession(id, gradingSelection, token);
    await expect(
      openSharedSession(id, gradingSelection, token),
    ).rejects.toMatchObject({ status: 409 });
    await shared.release();
    const next = await openSharedSession(id, gradingSelection, token);
    await next.release();
  });
  it("restores committed progress after process loss and ignores stale browser progress", async () => {
    const { id, token } = newSession();
    await publishNewSession(id);
    const shared = await openSharedSession(id, gradingSelection, token);
    const turn = acquireInterviewSession(id, gradingSelection);
    turn.commit({ phaseIndex: 1, coveredCriteria: [0] });
    await shared.persist();
    turn.release();
    await shared.release();
    expectDiscardedState();
    const resumed = await openSharedSession(id, gradingSelection, token);
    expect(interviewSessionCheckpoint(id, gradingSelection).phaseIndex).toBe(1);
    await resumed.release();
  });
  it("keeps ended state and a cached scorecard across instances", async () => {
    const { id, token } = newSession();
    await publishNewSession(id);
    const shared = await openSharedSession(id, gradingSelection, token);
    const ending = acquireInterviewEnd(id, gradingSelection, {
      messages: [],
    });
    ending.complete(scorecardFixture());
    await shared.persist();
    ending.release();
    await shared.release();
    const stored = [...redis.values.values()].join("");
    expect(stored).not.toContain("candidate");
    expect(stored).not.toContain("CPU");
    expectDiscardedState();
    const resumed = await openSharedSession(id, gradingSelection, token);
    expect(interviewSessionCheckpoint(id, gradingSelection).ended).toBe(true);
    expect(() => acquireInterviewSession(id, gradingSelection)).toThrow(
      "has ended",
    );
    const again = acquireInterviewEnd(id, gradingSelection, { messages: [] });
    expect(again.scorecard).toEqual(scorecardFixture());
    again.release();
    await resumed.release();
  });
  it("restores frozen evidence after process loss and refuses edited retries", async () => {
    const { id, token } = newSession();
    await publishNewSession(id);
    const shared = await openSharedSession(id, gradingSelection, token);
    const ending = acquireInterviewEnd(id, gradingSelection, {
      messages: [],
    });
    await shared.persist();
    ending.release();
    await shared.release();
    expectDiscardedState();
    const resumed = await openSharedSession(id, gradingSelection, token);
    expect(() =>
      acquireInterviewEnd(id, gradingSelection, {
        messages: [{ role: "user", content: "changed answer" }],
      }),
    ).toThrow("does not match");
    await resumed.release();
  });
  it("rolls back cancelled progress before unlocking", async () => {
    const { id, token } = newSession();
    await publishNewSession(id);
    const shared = await openSharedSession(id, gradingSelection, token);
    const turn = acquireInterviewSession(id, gradingSelection);
    turn.commit({ phaseIndex: 1, coveredCriteria: [0] });
    await shared.persist();
    await shared.rollback();
    turn.release();
    await shared.release();
    expectDiscardedState();
    const resumed = await openSharedSession(id, gradingSelection, token);
    expect(interviewSessionCheckpoint(id, gradingSelection).phaseIndex).toBe(0);
    await resumed.release();
  });
  it("fences expired owners so they cannot publish or delete a replacement lock", async () => {
    const { id, token } = newSession();
    await publishNewSession(id);
    const shared = await openSharedSession(id, gradingSelection, token);
    const lock = [...redis.values.keys()].find((key) => key.endsWith(":lock"));
    if (!lock) throw new Error("Missing lock");
    redis.values.set(lock, "replacement-owner");
    await expect(shared.persist()).rejects.toThrow("temporarily unavailable");
    await shared.release();
    expect(redis.values.get(lock)).toBe("replacement-owner");
  });
  it("fails closed on store failure without leaving a local turn held", async () => {
    const { id, token } = newSession();
    await publishNewSession(id);
    redis.command.mockRejectedValueOnce(new Error("Unavailable"));
    await expect(
      openSharedSession(id, gradingSelection, token),
    ).rejects.toThrow();
    const turn = acquireInterviewSession(id, gradingSelection, token);
    turn.release();
  });
});
