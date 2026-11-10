import "server-only";
import { getProblem, type ProblemDefinition } from "@/lib/problems";
import { problemSchema } from "@/lib/problem-definition";
/** Synthetic canaries exercise privacy and seven areas before the real catalog is added. */
export function genaiEngineFixture(): ProblemDefinition {
  const core = getProblem("single-server-scaling");
  if (!core) throw Error("Missing fixture base");
  return problemSchema.parse({
    ...core,
    id: "genai-engine-fixture",
    track: "genai",
    genai: {
      facts: [
        {
          id: "employees",
          description: "Number of employees and users.",
          answers: {
            mid: "There are 2,000 employees.",
            senior: "There are 20,000 employees.",
            staff: "There are 100,000 employees.",
          },
          coversCriteria: [1],
        },
        {
          id: "docs",
          description: "Number of documents.",
          answers: {
            mid: "There are 200K documents.",
            senior: "There are 5M documents.",
            staff: "There are 50M documents.",
          },
          coversCriteria: [1],
        },
      ],
      estimateAnchors: {
        mid: [],
        senior: ["PRIVATE_ANCHOR_CANARY"],
        staff: [],
      },
      expectedDesign: ["PRIVATE_EXPECTED_DESIGN_CANARY"],
      redFlags: ["PRIVATE_RED_FLAG_CANARY"],
      assumptionGuidance: [],
      assumptions: [
        {
          id: "message-size",
          pattern:
            "(?:bytes|kb|size).{0,25}message|message.{0,25}(?:bytes|kb|size)",
          question: "What would you assume, given the token counts?",
          midSuggestion:
            "After your attempt, about 2 KB per message is a possible assumption.",
        },
      ],
    },
    rubric: [
      ...core.rubric,
      {
        area: "Evaluation and quality",
        strong: "PRIVATE_QUALITY_CANARY",
        assessmentPattern: "eval|quality",
      },
      {
        area: "Safety and security",
        strong: "PRIVATE_SAFETY_CANARY",
        assessmentPattern: "safety|security",
      },
    ],
    reviewProbes: [
      {
        id: "cache",
        areaIndex: 3,
        topic: "cache",
        stageIndex: 3,
        topicPattern: "cache",
        requiresPattern: "cache",
        question: "What happens if your cache is unavailable?",
      },
      {
        id: "evaluation",
        areaIndex: 5,
        topic: "evaluation",
        stageIndex: 3,
        topicPattern: "eval",
        question: "How would you evaluate a change before launch?",
      },
    ],
  });
}
