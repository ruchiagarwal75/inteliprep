import { describe, expect, it } from "vitest";
import { getProblem } from "@/lib/problems";
import {
  validateScorecard,
  emptyInterviewScorecard,
} from "@/lib/scorecard-validation";
import { scorecardSchema } from "@/lib/scorecard";
import {
  gradingAssessmentFixture,
  gradingSnapshot,
  endedAtFixture,
} from "@/lib/fixtures/scorecard-test";

const selected = getProblem("single-server-scaling");
if (!selected) throw new Error("Missing problem");
const problem = selected;
function validate(assessment: unknown, snapshot = gradingSnapshot) {
  return validateScorecard(
    problem,
    "mid",
    snapshot,
    endedAtFixture,
    assessment,
  );
}
describe("verified scorecard evidence", () => {
  it("rejects a diagram caption used as a gap", () => {
    const assessment = gradingAssessmentFixture();
    assessment.gaps = [
      {
        text: "In your final diagram: Clients",
        evidence: [{ kind: "diagram", elementId: "client" }],
      },
    ];
    expect(() => validate(assessment)).toThrow("actionable");
  });
  it.each([0, 5, 2.5])("rejects an invalid score of %s", (score) => {
    const assessment = gradingAssessmentFixture();
    assessment.areas[0].score = score;
    expect(() => validate(assessment)).toThrow();
  });
  it("returns configured areas in order, verified candidate quotes, and public feedback only", () => {
    const assessment = gradingAssessmentFixture();
    assessment.areas.reverse();
    const scorecard = validate(assessment);
    expect(scorecard.areas.map((area) => area.area)).toEqual(
      problem.rubric.map((area) => area.area),
    );
    expect(scorecard.signal).toBe("yes");
    expect(scorecard.areas[1].evidence[0]).toMatchObject({
      kind: "message",
      messageIndex: 1,
      quote: expect.stringContaining("I would measure CPU"),
    });
    expect(scorecard.nextPractice.title).toBe("Design a URL shortener");
    expect(scorecardSchema.safeParse(scorecard).success).toBe(true);
    expect(JSON.stringify(scorecard)).not.toContain(problem.rubric[0].strong);
    expect(JSON.stringify(scorecard)).not.toContain(
      problem.levels.mid.expectations,
    );
  });
  it("rejects invented quotes and interviewer statements as candidate evidence", () => {
    for (const evidence of [
      { kind: "message" as const, quoteId: "invented" },
      { kind: "message" as const, quoteId: "m0q0" },
      { kind: "message" as const, quoteId: "m999q0" },
      { kind: "message" as const, quoteId: " " },
    ]) {
      const assessment = gradingAssessmentFixture();
      assessment.areas[0].evidence = [evidence];
      expect(() => validate(assessment)).toThrow("evidence");
    }
  });
  it("attaches original candidate words rather than model-supplied quote text", () => {
    const assessment = gradingAssessmentFixture();
    const card = validate({
      ...assessment,
      areas: [
        {
          ...assessment.areas[0],
          evidence: [
            {
              kind: "message",
              quoteId: "m1q0",
              quote: "I implemented a cache",
            },
          ],
        },
        ...assessment.areas.slice(1),
      ],
    });
    expect(card.areas[0].evidence[0]).toEqual({
      kind: "message",
      messageIndex: 1,
      quote: "The app and existing data run on one server.",
    });
  });
  it("accepts only real live diagram elements, including freehand anchors", () => {
    const assessment = gradingAssessmentFixture();
    assessment.areas[0].evidence = [{ kind: "diagram", elementId: "api" }];
    expect(validate(assessment).areas[0].score).toBe(3);
    expect(() =>
      validate(assessment, {
        ...gradingSnapshot,
        scene: {
          elements:
            gradingSnapshot.scene?.elements.map((element) => ({
              ...element,
              isDeleted: true,
            })) ?? [],
        },
      }),
    ).toThrow("evidence");
    assessment.areas[0].evidence = [{ kind: "diagram", elementId: "invented" }];
    expect(() => validate(assessment)).toThrow("evidence");
    assessment.areas[0].evidence = [{ kind: "diagram", elementId: "stroke" }];
    const first = gradingSnapshot.scene?.elements[0];
    if (!first) throw new Error("Missing fixture element");
    expect(
      validate(assessment, {
        ...gradingSnapshot,
        scene: { elements: [{ ...first, type: "freedraw", id: "stroke" }] },
      }).areas[0].score,
    ).toBe(3);
  });
  it("requires evidence for every numeric score and finding", () => {
    const assessment = gradingAssessmentFixture();
    assessment.areas[0].evidence = [];
    expect(() => validate(assessment)).toThrow("evidence");
    const invented = gradingAssessmentFixture();
    invented.strengths[0].evidence = [
      { kind: "diagram", elementId: "missing" },
    ];
    expect(() => validate(invented)).toThrow("evidence");
  });
  it("does not give an overall hire signal when some areas were never assessed", () => {
    const assessment = gradingAssessmentFixture();
    assessment.areas[2].score = null;
    assessment.areas[2].evidence = [];
    assessment.signal = "strong_yes";
    const result = validate(assessment);
    expect(result.signal).toBe("insufficient_evidence");
    expect(result.areas[2].score).toBeNull();
    assessment.areas[2].evidence = [{ kind: "diagram", elementId: "api" }];
    expect(() => validate(assessment)).toThrow("evidence");
  });
  it("rejects missing, duplicate, or out-of-range areas and unknown practice problems", () => {
    const missing = gradingAssessmentFixture();
    missing.areas.pop();
    expect(() => validate(missing)).toThrow("rubric");
    const duplicate = gradingAssessmentFixture();
    duplicate.areas[0].areaIndex = 1;
    expect(() => validate(duplicate)).toThrow("rubric");
    const outside = gradingAssessmentFixture();
    outside.areas[0].areaIndex = 9;
    expect(() => validate(outside)).toThrow("rubric");
    const next = gradingAssessmentFixture();
    next.nextProblemId = "invented";
    expect(() => validate(next)).toThrow("unknown practice");
  });
  it("returns honest unassessed feedback for an interview ended before an answer", () => {
    const empty = emptyInterviewScorecard(problem, "mid", endedAtFixture);
    expect(
      empty.areas.every((area) => area.score === null && !area.evidence.length),
    ).toBe(true);
    expect(empty.signal).toBe("insufficient_evidence");
    expect(empty.strengths).toEqual([]);
    expect(empty.gaps).toEqual([]);
    expect(empty.nextPractice.problemId).toBe(problem.id);
  });
});
