import { describe, expect, it } from "vitest";
import {
  INTERVIEW_PHASE_HEADER,
  interviewPhaseSchema,
  readInterviewPhase,
} from "@/lib/interview-phase";

const phase = {
  id: "draw-and-explain",
  title: "Draw and explain → discuss",
  position: 2,
  total: 5,
};
describe("public interview stage", () => {
  it("reads an encoded stage header while stripping private config", () => {
    const headers = new Headers({
      [INTERVIEW_PHASE_HEADER]: encodeURIComponent(
        JSON.stringify({
          ...phase,
          goal: "private",
          completionCriteria: ["private"],
        }),
      ),
    });
    expect(readInterviewPhase(headers)).toEqual(phase);
    expect(readInterviewPhase(new Headers())).toBeUndefined();
  });
  it.each([
    { ...phase, position: 0 },
    { ...phase, position: 6 },
    { ...phase, total: 11 },
    { ...phase, id: "../private" },
  ])("rejects malformed stage metadata %j", (value) => {
    expect(interviewPhaseSchema.safeParse(value).success).toBe(false);
  });
  it("rejects invalid JSON and encoding", () => {
    expect(() =>
      readInterviewPhase(new Headers({ [INTERVIEW_PHASE_HEADER]: "invalid" })),
    ).toThrow();
    expect(() =>
      readInterviewPhase(new Headers({ [INTERVIEW_PHASE_HEADER]: "%bad" })),
    ).toThrow();
  });
});
