import { describe, expect, it } from "vitest";
import { getProblem, listProblems } from "@/lib/problems";
import { interviewLevelSchema } from "@/lib/interview-selection";
import {
  configuredClarification,
  sharedRequirementCriteria,
} from "@/lib/configured-clarifications";
import { problemReviews } from "@/lib/fixtures/problem-reviews";

describe("curated catalog consistency", () => {
  it.each(listProblems())(
    "validates private coverage and topic rules for $problemId",
    ({ problemId }) => {
      const problem = getProblem(problemId);
      if (!problem) throw new Error("Missing problem");
      const count = problem.phases[0].completionCriteria.length;
      for (const index of [
        ...problem.openingCriteria,
        ...problem.clarifications.flatMap((entry) => entry.coversCriteria),
      ])
        expect(index).toBeLessThan(count);
      for (const entry of problem.clarifications) {
        expect(() => new RegExp(entry.pattern, "iu")).not.toThrow();
        const sharedAnswerPattern = entry.sharedAnswerPattern;
        if (sharedAnswerPattern)
          expect(() => new RegExp(sharedAnswerPattern, "iu")).not.toThrow();
      }
      for (const area of problem.rubric) {
        expect(area.assessmentPattern).toBeTruthy();
        expect(
          () => new RegExp(area.assessmentPattern ?? "", "iu"),
        ).not.toThrow();
      }
      expect(new Set(problem.rubric.map((area) => area.area)).size).toBe(
        problem.rubric.length,
      );
      expect(
        new Set(
          interviewLevelSchema.options.map(
            (level) => problem.levels[level].expectations,
          ),
        ).size,
      ).toBe(3);
    },
  );
  it.each(
    problemReviews.flatMap((example) =>
      interviewLevelSchema.options.map((level) => ({ ...example, level })),
    ),
  )("establishes $problemId requirements once at $level", (example) => {
    const problem = getProblem(example.problemId);
    if (!problem) throw new Error("Missing problem");
    const goals = configuredClarification(
      problem,
      example.level,
      example.goalsQuestion,
    );
    const constraints = configuredClarification(
      problem,
      example.level,
      example.constraintsQuestion,
    );
    expect(goals?.coveredCriteria).toContain(1);
    expect(constraints?.coveredCriteria).toContain(2);
    expect(
      sharedRequirementCriteria(problem, example.level, [
        {
          role: "assistant",
          content: problem.levels[example.level].openingMessage,
        },
        { role: "assistant", content: goals?.text ?? "" },
        { role: "assistant", content: constraints?.text ?? "" },
        { role: "user", content: "I will use those agreed requirements." },
      ]).sort(),
    ).toEqual([0, 1, 2]);
    expect(
      configuredClarification(
        problem,
        example.level,
        "How should I choose the storage design?",
      ),
    ).toBeUndefined();
  });
  it.each(interviewLevelSchema.options)(
    "answers combined rate-limit facts and tight enforcement at %s",
    (level) => {
      const problem = getProblem("rate-limiter");
      if (!problem) throw new Error("Missing rate limiter");
      const answer = configuredClarification(
        problem,
        level,
        "What traffic and latency should I use, and what happens when requests are rejected?",
      );
      expect(answer?.text).toContain("rolling 60 seconds");
      expect(answer?.text).toContain("10 milliseconds");
      expect(answer?.text).toContain("HTTP 429");
      expect(answer?.coveredCriteria).toEqual([1, 2]);
      expect(
        configuredClarification(problem, level, "Is staleness okay?")?.text,
      ).toMatch(/^No,/u);
    },
  );
  it.each(interviewLevelSchema.options)(
    "distinguishes online delivery, acceptance, and history at %s",
    (level) => {
      const problem = getProblem("chat-service");
      if (!problem) throw new Error("Missing chat service");
      const answer = configuredClarification(
        problem,
        level,
        "What traffic and latency should I use, and how long is history retained?",
      );
      expect(answer?.text).toContain("200 milliseconds");
      expect(answer?.text).toContain("90 days");
      expect(answer?.text).toContain("not delivery or reading");
      expect(answer?.coveredCriteria).toEqual([1, 2]);
      expect(
        configuredClarification(
          problem,
          level,
          "Can messages show up a few seconds late?",
        )?.text,
      ).toMatch(/^No,/u);
    },
  );
  it.each(interviewLevelSchema.options)(
    "answers all four chat clarification topics without an unasked negative at %s",
    (level) => {
      const problem = getProblem("chat-service");
      if (!problem) throw new Error("Missing chat service");
      const answer = configuredClarification(
        problem,
        level,
        "How many users and messages should I plan for, what are the latency targets, do messages need ordering and duplicate protection, and how long should history be kept?",
      );
      expect(answer?.text).toContain("daily active users");
      expect(answer?.text).toContain("messages per day");
      expect(answer?.text).toContain("200 milliseconds");
      expect(answer?.text).toContain("1 second");
      expect(answer?.text).toContain("one stable order per conversation");
      expect(answer?.text).toContain("must not create another stored message");
      expect(answer?.text).toContain("Retain history for 90 days");
      expect(answer?.text).toContain("means durable acceptance");
      expect(answer?.text).not.toMatch(/\bNo,/u);
      expect(answer?.coveredCriteria).toEqual([1, 2]);
    },
  );
  it.each(interviewLevelSchema.options)(
    "separates feed freshness from deletion visibility at %s",
    (level) => {
      const problem = getProblem("news-feed");
      if (!problem) throw new Error("Missing news feed");
      const answer = configuredClarification(
        problem,
        level,
        "What traffic and freshness should I use, and how long are deleted posts visible?",
      );
      expect(answer?.text).toContain("500 milliseconds");
      expect(answer?.text).toContain("New posts may take up to 5 seconds");
      expect(answer?.text).not.toMatch(/\bYes,/u);
      expect(answer?.text).toContain("60 seconds");
      expect(answer?.coveredCriteria).toEqual([1, 2]);
    },
  );
});
