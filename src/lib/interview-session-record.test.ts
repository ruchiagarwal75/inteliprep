import { describe, expect, it } from "vitest";
import {
  exportSessionRecord,
  importSessionRecord,
} from "@/lib/interview-session-record";
import {
  createInterviewSession,
  acquireInterviewSession,
  interviewSessionCheckpoint,
} from "@/lib/interview-sessions";
import { getCachedSession } from "@/lib/interview-session-store";
import { gradingSelection } from "@/lib/fixtures/scorecard-test";

describe("local shared-record bridge", () => {
  it("preserves timing and progress while replacing a stale busy cache", () => {
    const id = createInterviewSession(gradingSelection);
    const before = interviewSessionCheckpoint(id, gradingSelection);
    const turn = acquireInterviewSession(id, gradingSelection);
    turn.commit({ phaseIndex: 1, coveredCriteria: [0] });
    const record = exportSessionRecord(id);
    importSessionRecord(id, record);
    expect(interviewSessionCheckpoint(id, gradingSelection)).toMatchObject({
      phaseIndex: 1,
      timing: before.timing,
    });
    turn.release();
  });
  it("rejects mismatched IDs and missing sessions", () => {
    const id = createInterviewSession(gradingSelection);
    expect(() => exportSessionRecord("missing")).toThrow();
    expect(() => importSessionRecord("other", exportSessionRecord(id))).toThrow(
      "mismatch",
    );
  });
  it("ignores a rollback from a replaced local owner", () => {
    const id = createInterviewSession(gradingSelection);
    const before = exportSessionRecord(id);
    const owner = getCachedSession(id);
    if (!owner) throw new Error("Missing cache");
    importSessionRecord(id, before);
    const turn = acquireInterviewSession(id, gradingSelection);
    turn.commit({ phaseIndex: 1, coveredCriteria: [] });
    importSessionRecord(id, before, owner);
    turn.release();
    expect(interviewSessionCheckpoint(id, gradingSelection).phaseIndex).toBe(1);
  });
});
