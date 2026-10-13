import { getProblem } from "@/lib/problems";
import { sceneSchema } from "@/lib/scene";
import basicScene from "@/lib/fixtures/basic-system.json";
import type { GradingAssessment } from "@/lib/scorecard";
import type { InterviewEndSnapshot } from "@/lib/interview-end";
import { validateScorecard } from "@/lib/scorecard-validation";
import { candidateQuotes } from "@/lib/scorecard-quotes";

export const gradingSelection = {
  problemId: "single-server-scaling",
  level: "mid" as const,
};
export const endedAtFixture = "2026-10-12T20:00:00.000Z";
export const gradingSnapshot: InterviewEndSnapshot = {
  messages: [
    { role: "assistant", content: "What requirements would you clarify?" },
    {
      role: "user",
      content:
        "The app and existing data run on one server. We need 1,000 requests per second at under 500 ms, keeping data correct and available. I would measure CPU and response times with a load test before changing capacity, then scale the application servers. Requests reach the application and then the database. This costs more and requires checking data correctness during rollout. I would compare latency and throughput before and after the change and test a server failure.",
    },
  ],
  scene: sceneSchema.parse(basicScene),
};
const quotes = [
  "The app and existing data run on one server.",
  "I would measure CPU and response times with a load test",
  "Requests reach the application and then the database.",
  "This costs more and requires checking data correctness during rollout.",
  "I would compare latency and throughput before and after the change and test a server failure.",
];
function evidenceFor(text: string) {
  const source = candidateQuotes(gradingSnapshot.messages).find((item) =>
    item.quote.includes(text),
  );
  if (!source) throw new Error("Missing fixture quote");
  return { kind: "message" as const, quoteId: source.quoteId };
}
export function gradingAssessmentFixture(): GradingAssessment {
  return {
    summary:
      "The candidate explained the starting architecture and a measurable improvement.",
    signal: "yes",
    areas: quotes.map((quote, areaIndex) => ({
      areaIndex,
      score: 3,
      rationale: "A concrete explanation supports this area.",
      evidence: [evidenceFor(quote)],
    })),
    strengths: [
      {
        text: "Proposes measuring performance before changing capacity.",
        evidence: [evidenceFor(quotes[1])],
      },
    ],
    gaps: [],
    nextProblemId: "url-shortener",
    practiceFocus:
      "Practice applying the same measurement approach to a redirect service.",
  };
}
export function scorecardFixture() {
  const problem = getProblem(gradingSelection.problemId);
  if (!problem) throw new Error("Missing fixture problem");
  return validateScorecard(
    problem,
    gradingSelection.level,
    gradingSnapshot,
    endedAtFixture,
    gradingAssessmentFixture(),
  );
}
