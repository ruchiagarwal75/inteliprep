import { describe, expect, it } from "vitest";
import { createInterviewStart, getProblem, listProblems } from "@/lib/problems";
import { interviewLevelSchema } from "@/lib/interview-selection";
import { interviewerChatText } from "@/lib/chat-display";
import { sharedRequirementCriteria } from "@/lib/configured-clarifications";

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
      "rate-limiter",
      "chat-service",
      "news-feed",
      "notification-system",
      "file-storage",
      "video-streaming",
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
      "phases",
    ])
      expect(JSON.stringify(catalog)).not.toContain(privateField);
    catalog[0].levels.pop();
    expect(listProblems()[0].levels).toHaveLength(3);
  });
  it("starts all eight problems at all three levels with only their configured closing question", () => {
    for (const { problemId } of listProblems()) {
      const problem = getProblem(problemId);
      if (!problem) throw new Error("Missing problem config");
      for (const level of interviewLevelSchema.options) {
        const closingQuestion = problem.levels[level].openingMessage
          .trim()
          .split("\n")
          .at(-1);
        const result = createInterviewStart(problem, level);
        expect(result).toMatchObject({
          problemId,
          level,
          openingMessage: {
            role: "assistant",
            content: closingQuestion,
          },
        });
        expect(
          interviewerChatText(
            result.openingMessage.content,
            result.openingMessage.content,
          ),
        ).toBe(closingQuestion);
        expect(
          interviewerChatText(
            problem.levels[level].openingMessage,
            problem.levels[level].openingMessage,
          ),
        ).toBe(closingQuestion);
        if (problemId !== "single-server-scaling")
          expect(result.openingMessage.content).not.toContain(
            "before changing",
          );
        expect(result.openingMessage.content).not.toContain("\n");
        expect(
          sharedRequirementCriteria(problem, level, [result.openingMessage]),
        ).toEqual(
          sharedRequirementCriteria(problem, level, [
            {
              role: "assistant",
              content: problem.levels[level].openingMessage,
            },
          ]),
        );
        expect(result.sessionId).toMatch(/^[0-9a-f-]{36}$/);
        expect(result.phase).toEqual({
          id: problem.phases[0].id,
          title: problem.phases[0].title,
          position: 1,
          total: problem.phases.length,
        });
        expect(JSON.stringify(result)).not.toContain("completionCriteria");
        expect(result.openingMessage.content.match(/\?/g)).toHaveLength(1);
        expect(result.openingMessage.content.split(/\s+/).length).toBeLessThan(
          200,
        );
        expect(JSON.stringify(result)).not.toContain(problem.rubric[0].strong);
        expect(JSON.stringify(result)).not.toContain(
          problem.levels[level].expectations,
        );
      }
    }
  });
});
