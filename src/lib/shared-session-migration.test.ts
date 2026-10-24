import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openSharedSession } from "@/lib/shared-interview-session";
import { exportSessionRecord } from "@/lib/interview-session-record";
import {
  interviewSessionState,
  withInterviewSessionContext,
} from "@/lib/interview-session-context";
import {
  acquireInterviewEnd,
  acquireInterviewSession,
  createInterviewSession,
  interviewSessionCheckpoint,
} from "@/lib/interview-sessions";
import { parseSharedRecord } from "@/lib/shared-session-record";
import { redisNamespace } from "@/lib/beta-config";
import { legacySessionRecordFixture } from "@/lib/fixtures/legacy-session-record-test";
import { redisSessionCommand } from "@/lib/fixtures/redis-session-test";
import {
  gradingSelection,
  scorecardFixture,
} from "@/lib/fixtures/scorecard-test";

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

describe("Redis session format migration", () => {
  it("keeps committed progress, frozen evidence and cached feedback while converting an old session to JSON", async () => {
    const previous = withInterviewSessionContext(() => {
      const id = createInterviewSession(gradingSelection);
      const turn = acquireInterviewSession(id, gradingSelection);
      turn.commit({ phaseIndex: 1, coveredCriteria: [0] });
      turn.release();
      const ending = acquireInterviewEnd(id, gradingSelection, {
        messages: [],
      });
      ending.complete(scorecardFixture());
      ending.release();
      return {
        id,
        token: interviewSessionCheckpoint(id, gradingSelection).resumeToken,
        record: exportSessionRecord(id),
      };
    });
    const key = `${redisNamespace()}:session:${previous.id}`;
    values.set(key, legacySessionRecordFixture(previous.record));
    await withInterviewSessionContext(async () => {
      const shared = await openSharedSession(
        previous.id,
        gradingSelection,
        previous.token,
      );
      const restored = interviewSessionCheckpoint(
        previous.id,
        gradingSelection,
      );
      expect(restored).toMatchObject({
        phaseIndex: 1,
        ended: true,
        timing: previous.record.checkpoint.timing,
      });
      const ending = acquireInterviewEnd(previous.id, gradingSelection, {
        messages: [],
      });
      expect(ending.scorecard).toEqual(previous.record.scorecard);
      ending.release();
      await shared.persist();
      await shared.release();
      expect(interviewSessionState().size).toBe(0);
    });
    const stored = values.get(key);
    if (!stored) throw new Error("Missing migrated session");
    expect(JSON.parse(stored)).toEqual(previous.record);
    expect(parseSharedRecord(stored).checkpoint.ending).toEqual(
      previous.record.checkpoint.ending,
    );
    expect(stored).not.toContain("resumeToken");
  });

  it("rejects a JSON record for another session and releases its shared lease", async () => {
    const previous = withInterviewSessionContext(() => {
      const id = createInterviewSession(gradingSelection);
      return {
        id,
        token: interviewSessionCheckpoint(id, gradingSelection).resumeToken,
        record: exportSessionRecord(id),
      };
    });
    values.set(
      `${redisNamespace()}:session:${previous.id}`,
      JSON.stringify({
        checkpoint: { ...previous.record.checkpoint, id: crypto.randomUUID() },
      }),
    );
    await withInterviewSessionContext(async () => {
      await expect(
        openSharedSession(previous.id, gradingSelection, previous.token),
      ).rejects.toThrow("temporarily unavailable");
      expect(interviewSessionState().size).toBe(0);
    });
    expect([...values.keys()].some((key) => key.endsWith(":lock"))).toBe(false);
  });
});
