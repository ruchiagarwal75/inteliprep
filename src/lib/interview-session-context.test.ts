import { afterEach, describe, expect, it, vi } from "vitest";
import {
  interviewSessionState,
  withInterviewSessionContext,
} from "@/lib/interview-session-context";
import {
  createInterviewSession,
  acquireInterviewSession,
  interviewSessionCheckpoint,
} from "@/lib/interview-sessions";
import { gradingSelection } from "@/lib/fixtures/scorecard-test";

afterEach(() => vi.unstubAllEnvs());

describe("request-owned beta session state", () => {
  it("never reads or writes the development cache outside a beta request", () => {
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("INTELIPREP_ENV", "");
    const id = createInterviewSession(gradingSelection);
    const development = interviewSessionState();
    vi.stubEnv("INTELIPREP_ENV", "beta");
    expect(() => interviewSessionState()).toThrow("temporarily unavailable");
    withInterviewSessionContext(() => {
      expect(interviewSessionState().has(id)).toBe(false);
      const betaId = createInterviewSession(gradingSelection);
      expect(development.has(betaId)).toBe(false);
    });
    vi.stubEnv("INTELIPREP_ENV", "");
    expect(interviewSessionState().get(id)?.id).toBe(id);
  });

  it("starts each request empty, even when an earlier request is still running", async () => {
    vi.stubEnv("INTELIPREP_ENV", "beta");
    vi.stubEnv("INTERVIEW_RESUME_SECRET", "s".repeat(32));
    const interview = withInterviewSessionContext(() => {
      const id = createInterviewSession(gradingSelection);
      return { id, ...interviewSessionCheckpoint(id, gradingSelection) };
    });
    let finish: (() => void) | undefined;
    const first = withInterviewSessionContext(async () => {
      expect(interviewSessionState().size).toBe(0);
      const turn = acquireInterviewSession(
        interview.id,
        gradingSelection,
        interview.resumeToken,
      );
      turn.commit({ phaseIndex: 1, coveredCriteria: [0] });
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
      expect(interviewSessionState().get(interview.id)?.phaseIndex).toBe(1);
      turn.release();
    });
    await withInterviewSessionContext(async () => {
      expect(interviewSessionState().size).toBe(0);
      const turn = acquireInterviewSession(
        interview.id,
        gradingSelection,
        interview.resumeToken,
      );
      expect(turn.state.phaseIndex).toBe(0);
      turn.release();
    });
    finish?.();
    await first;
    withInterviewSessionContext(() => {
      expect(interviewSessionState().size).toBe(0);
    });
  });

  it("keeps the local development fallback when Redis is not required", () => {
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("INTELIPREP_ENV", "");
    const id = withInterviewSessionContext(() =>
      createInterviewSession(gradingSelection),
    );
    withInterviewSessionContext(() => {
      const turn = acquireInterviewSession(id, gradingSelection);
      expect(turn.state.phaseIndex).toBe(0);
      turn.release();
    });
  });
});
