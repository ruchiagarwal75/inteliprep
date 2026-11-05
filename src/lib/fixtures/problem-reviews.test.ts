import { describe, expect, it } from "vitest";
import { problemReviews, reviewScene } from "@/lib/fixtures/problem-reviews";
import { sceneToGraph } from "@/lib/scene-graph";
import { candidateQuotes } from "@/lib/scorecard-quotes";
import { getProblem } from "@/lib/problems";
import { coveredPhaseCriteria } from "@/lib/phase-assessment";
import { areaWasExplored } from "@/lib/grading-opportunity";

describe("synthetic catalog review examples", () => {
  it.each(problemReviews)(
    "keeps $problemId diagrams and technical evidence usable",
    (example) => {
      const problem = getProblem(example.problemId);
      if (!problem) throw new Error("Missing problem");
      const scene = reviewScene(example);
      const graph = sceneToGraph(scene);
      expect(graph.status).toBe("drawn");
      expect(graph.components.map((node) => node.label)).toEqual(example.nodes);
      expect(graph.connections).toHaveLength(example.edges.length);
      expect(
        graph.connections.every(
          (edge) => edge.start && edge.end && !edge.inferred,
        ),
      ).toBe(true);
      const messages = [
        example.requirementsAnswer,
        ...example.coreExplanation,
        ...example.validationExplanation,
      ].map((content) => ({ role: "user" as const, content }));
      const quotes = candidateQuotes(messages);
      for (const [areaIndex, anchor] of example.rubricEvidence.entries()) {
        expect(quotes.some((quote) => quote.quote.startsWith(anchor))).toBe(
          true,
        );
        expect(areaWasExplored(problem, areaIndex, { messages, scene })).toBe(
          true,
        );
      }
      for (const [phaseIndex, excerpts, start] of [
        [2, example.coreExplanation, 1],
        [3, example.validationExplanation, 3],
      ] as const) {
        expect(
          coveredPhaseCriteria(problem.phases[phaseIndex], messages, {
            criteria: excerpts.map((quote, criterionIndex) => ({
              criterionIndex,
              met: true,
              quote,
              messageIndex: start + criterionIndex,
            })),
          }),
        ).toEqual([0, 1]);
      }
    },
  );
});
