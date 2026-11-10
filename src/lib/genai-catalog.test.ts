import { describe, expect, it } from "vitest";
import { getProblem, listProblems, problemBriefs } from "@/lib/problems";
import { genaiFact } from "@/lib/genai-facts";
import { buildInterviewInstructions } from "@/lib/interview-instructions";
import rag from "../../tests/fixtures/genai/enterprise-rag-assistant.json";

const fixtures = [rag];
describe.each(fixtures)("GenAI config $problemId", (fixture) => {
  const problem = getProblem(fixture.problemId);
  if (!problem?.genai) throw new Error("Missing private GenAI config");
  const config = problem.genai;
  it("has the provided content and seven independent, unweighted areas", () => {
    expect(problem.track).toBe("genai");
    expect(problem.prompt.length).toBeGreaterThan(30);
    expect(problem.rubric).toHaveLength(7);
    expect(problem.rubric.map((r) => r.area)).toEqual(
      expect.arrayContaining(["Evaluation and quality", "Safety and security"]),
    );
    expect(config.expectedDesign.length).toBeGreaterThan(0);
    expect(config.redFlags.length).toBeGreaterThan(2);
    expect(config.estimateAnchors.senior.length).toBeGreaterThan(0);
    expect(new Set(config.facts.map((f) => f.id)).size).toBe(
      config.facts.length,
    );
    for (const fact of config.facts)
      expect(() => new RegExp(fact.pattern, "iu")).not.toThrow();
    for (const probe of problem.reviewProbes) {
      expect(() => new RegExp(probe.topicPattern, "iu")).not.toThrow();
      expect(probe.areaIndex).toBeLessThan(problem.rubric.length);
      expect(probe.stageIndex).toBeLessThan(problem.phases.length);
    }
  });
  for (const level of ["mid", "senior", "staff"] as const) {
    it(`discloses each requested fact individually at ${level}`, () => {
      for (const row of fixture.facts) {
        const fact = config.facts.find((f) => f.id === row.id);
        expect(genaiFact(problem, level, row.ask)?.text, row.ask).toBe(
          fact?.answers[level],
        );
      }
      const one = genaiFact(
        problem,
        level,
        fixture.facts
          .slice(0, 3)
          .map((f) => f.ask)
          .join(" "),
      );
      expect(one?.text).toBe(
        config.facts.find((f) => f.id === fixture.facts[0].id)?.answers[level],
      );
    });
    it(`keeps private reference material out of every ${level} reply prefix`, () => {
      const publicText = JSON.stringify([listProblems(), problemBriefs()]);
      for (const phase of problem.phases) {
        const prefix = buildInterviewInstructions({ problem, level, phase });
        for (const privateText of [
          ...config.expectedDesign,
          ...config.estimateAnchors[level],
          ...config.redFlags,
          ...config.facts.map((f) => f.answers[level]),
        ]) {
          expect(prefix).not.toContain(privateText);
          expect(publicText).not.toContain(privateText);
        }
      }
    });
  }
});
