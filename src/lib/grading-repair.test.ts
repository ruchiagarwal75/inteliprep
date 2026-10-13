import { describe, expect, it } from "vitest";
import { repairGradingAssessment } from "@/lib/grading-repair";
import { areaWasExplored } from "@/lib/grading-opportunity";
import { getProblem } from "@/lib/problems";
import {
  gradingAssessmentFixture,
  gradingSnapshot,
  endedAtFixture,
} from "@/lib/fixtures/scorecard-test";
import { validateScorecard } from "@/lib/scorecard-validation";
import type { InterviewEndSnapshot } from "@/lib/interview-end";

const selected = getProblem("single-server-scaling");
if (!selected) throw new Error("Missing problem");
const problem = selected;
const shortSnapshot: InterviewEndSnapshot = {
  ...gradingSnapshot,
  messages: [
    {
      role: "assistant",
      content:
        "Explain a change and how you would verify its effect. What requirements would you clarify?",
    },
    { role: "user", content: "The app and data run on one server." },
    {
      role: "user",
      content: "I've finished explaining. Let's discuss my design.",
      source: "control",
      action: "review",
    },
  ],
};

describe("honest partial feedback for short interviews", () => {
  it("does not grade unrelated URL-shortener topics using a real but irrelevant redirect quote", () => {
    const url = getProblem("url-shortener");
    if (!url) throw new Error("Missing problem");
    const snapshot: InterviewEndSnapshot = {
      messages: [
        { role: "assistant", content: "Let's design a URL shortener." },
        {
          role: "user",
          content:
            "I would store the original URL and its identifier in a database, then look it up for a redirect.",
        },
      ],
    };
    const assessment = gradingAssessmentFixture();
    assessment.areas = assessment.areas.map((area) => ({
      ...area,
      score: 1,
      evidence: [{ kind: "message", quoteId: "m1q0" }],
    }));
    const card = validateScorecard(
      url,
      "senior",
      snapshot,
      endedAtFixture,
      repairGradingAssessment(url, snapshot, assessment),
    );
    expect(card.areas[2].score).toBe(1);
    expect(card.areas[3].score).toBeNull();
    expect(card.areas[4].score).toBeNull();
  });
  it("preserves supported areas and marks unasked validation unassessed even with a real diagram reference", () => {
    const assessment = gradingAssessmentFixture();
    assessment.areas = assessment.areas.map((area) => ({
      ...area,
      evidence: [{ kind: "message", quoteId: "m1q0" }],
    }));
    assessment.areas[4].score = 1;
    assessment.areas[4].evidence = [
      {
        kind: "diagram",
        elementId: shortSnapshot.scene?.elements[0].id ?? "missing",
      },
    ];
    assessment.gaps = [
      {
        text: "You should validate results with a before-and-after benchmark to confirm the change helped.",
        evidence: [{ kind: "message", quoteId: "m1q0" }],
      },
    ];
    const repaired = repairGradingAssessment(
      problem,
      shortSnapshot,
      assessment,
    );
    const card = validateScorecard(
      problem,
      "mid",
      shortSnapshot,
      endedAtFixture,
      repaired,
    );
    expect(card.areas[0].score).toBe(3);
    expect(card.areas[4]).toMatchObject({ score: null, evidence: [] });
    expect(card.areas[4].rationale).toContain("not discussed");
    expect(card.gaps).toEqual([]);
    expect(card.signal).toBe("insufficient_evidence");
  });

  it("drops nonexistent quotes, missing elements, button citations and label-only findings", () => {
    const assessment = gradingAssessmentFixture();
    assessment.areas[0].evidence = [{ kind: "message", quoteId: "m2q0" }];
    assessment.areas[1].evidence = [
      { kind: "diagram", elementId: "deleted-app" },
    ];
    assessment.areas[2].evidence = [];
    assessment.strengths[0].evidence = [
      { kind: "message", quoteId: "invented" },
    ];
    assessment.gaps = [
      {
        text: "In your final diagram: Clients",
        evidence: [{ kind: "message", quoteId: "m1q0" }],
      },
    ];
    const repaired = repairGradingAssessment(
      problem,
      shortSnapshot,
      assessment,
    );
    expect(
      repaired.areas
        .slice(0, 3)
        .every((area) => area.score === null && !area.evidence.length),
    ).toBe(true);
    expect(repaired.strengths).toEqual([]);
    expect(repaired.gaps).toEqual([]);
    expect(() =>
      validateScorecard(
        problem,
        "mid",
        shortSnapshot,
        endedAtFixture,
        repaired,
      ),
    ).not.toThrow();
  });

  it("recognizes volunteered validation and an actual follow-up, but not the opening or a bottleneck measurement alone", () => {
    expect(areaWasExplored(problem, 4, shortSnapshot)).toBe(false);
    expect(areaWasExplored(problem, 4, gradingSnapshot)).toBe(true);
    expect(
      areaWasExplored(problem, 4, {
        messages: [
          ...shortSnapshot.messages,
          {
            role: "assistant",
            content: "How would you check that the change helped?",
          },
          { role: "user", content: "I don't know how to test that." },
        ],
      }),
    ).toBe(true);
    expect(
      areaWasExplored(problem, 4, {
        messages: [
          {
            role: "user",
            content: "I would measure CPU usage to identify the bottleneck.",
          },
        ],
      }),
    ).toBe(false);
  });

  it("still rejects malformed provider output instead of inventing an assessment", () => {
    expect(() =>
      repairGradingAssessment(problem, shortSnapshot, { areas: [] }),
    ).toThrow();
  });
});
