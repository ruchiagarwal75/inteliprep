import { describe, expect, it } from "vitest";
import { createInterviewStart, getProblem, listProblems } from "@/lib/problems";
import { interviewLevelSchema } from "@/lib/interview-selection";

describe("problem registry", () => {
  it("resolves known problems but never falls back from an unknown id", () => {
    expect(getProblem("single-server-scaling")?.title).toBe(
      "Scale a single server",
    );
    expect(getProblem("url-shortener")?.title).toBe("Design a URL shortener");
    expect(getProblem("unknown")).toBeUndefined();
    expect(getProblem("toString")).toBeUndefined();
  });
  it("exposes only public catalog fields and returns independent level lists", () => {
    const catalog = listProblems();
    expect(catalog.map((problem) => problem.problemId)).toEqual([
      "single-server-scaling",
      "url-shortener",
    ]);
    for (const summary of catalog)
      expect(Object.keys(summary).sort()).toEqual([
        "levels",
        "problemId",
        "summary",
        "title",
      ]);
    expect(catalog[0].levels).toEqual(["mid", "senior", "staff"]);
    for (const privateField of [
      "rubric",
      "followUps",
      "scaleHints",
      "expectations",
      "requirements",
    ])
      expect(JSON.stringify(catalog)).not.toContain(privateField);
    catalog[0].levels.pop();
    expect(listProblems()[0].levels).toHaveLength(3);
  });
  it("starts each level with one configured question without returning private configuration", () => {
    for (const { problemId } of listProblems()) {
      const problem = getProblem(problemId);
      if (!problem) throw new Error("Missing problem config");
      for (const level of interviewLevelSchema.options) {
        const result = createInterviewStart(problem, level);
        expect(result).toEqual({
          problemId,
          level,
          openingMessage: {
            role: "assistant",
            content: problem.levels[level].openingMessage,
          },
        });
        expect(result.openingMessage.content.match(/\?/g)).toHaveLength(1);
        expect(result.openingMessage.content.split(/\s+/).length).toBeLessThan(
          80,
        );
        expect(JSON.stringify(result)).not.toContain(problem.rubric[0].strong);
        expect(JSON.stringify(result)).not.toContain(
          problem.levels[level].expectations,
        );
      }
    }
  });
});
