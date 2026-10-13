import { describe, expect, it } from "vitest";
import { phasesSchema, publicPhase } from "@/lib/phase-config";
import { getProblem } from "@/lib/problems";

const phases = getProblem("single-server-scaling")?.phases ?? [];
describe("configured interview stages", () => {
  it("configures the five promised stages and exposes only stage labels", () => {
    expect(phases.map((phase) => phase.title)).toEqual([
      "Clarify requirements",
      "Draw and explain",
      "Discuss improvements",
      "Validate results",
      "Wrap up",
    ]);
    expect(publicPhase(phases, 2)).toEqual({
      id: "discuss-improvements",
      title: "Discuss improvements",
      position: 3,
      total: 5,
    });
    expect(() => publicPhase(phases, 10)).toThrow("Unknown interview stage");
  });
  it("uses URL-shortener-specific goals", () => {
    const url = getProblem("url-shortener");
    expect(url?.phases[2].goal).toContain("identifiers");
    expect(url?.phases[3].title).toBe("Scaling and reliability");
  });
  it.each(["single-server-scaling", "url-shortener"])(
    "requires scope, scale/goals, and constraints for %s",
    (id) => {
      const initial = getProblem(id)?.phases[0];
      expect(initial?.transition).toBe("initial");
      expect(initial?.completionCriteria).toHaveLength(3);
      expect(initial?.clarificationQuestions).toHaveLength(3);
      expect(initial?.interviewerGuidance).toContain("never proof");
    },
  );
  it("rejects duplicate IDs, misplaced stages, and empty criteria", () => {
    expect(
      phasesSchema.safeParse([
        { ...phases[0], id: phases[1].id },
        ...phases.slice(1),
      ]).success,
    ).toBe(false);
    expect(phasesSchema.safeParse([...phases].reverse()).success).toBe(false);
    expect(
      phasesSchema.safeParse([
        { ...phases[0], completionCriteria: [] },
        ...phases.slice(1),
      ]).success,
    ).toBe(false);
  });
  it("rejects missing or mismatched initial clarification questions", () => {
    for (const clarificationQuestions of [undefined, ["Confirm scope?"]])
      expect(
        phasesSchema.safeParse([
          { ...phases[0], clarificationQuestions },
          ...phases.slice(1),
        ]).success,
      ).toBe(false);
  });
});
