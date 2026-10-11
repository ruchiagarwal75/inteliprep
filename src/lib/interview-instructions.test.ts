import { describe, expect, it } from "vitest";
import { buildInterviewInstructions } from "@/lib/interview-instructions";
import { getProblem } from "@/lib/problems";
import { interviewLevelSchema } from "@/lib/interview-selection";
import { INTERVIEWER_INSTRUCTIONS } from "@/lib/interviewer-input";
import { getInterviewProgress } from "@/lib/interview-progress";

describe("buildInterviewInstructions", () => {
  it("attaches the server-selected stage and its covered criteria while giving pacing priority", () => {
    const problem = getProblem("single-server-scaling");
    if (!problem) throw new Error("Missing problem config");
    const phase = problem.phases[3];
    const instructions = buildInterviewInstructions({
      problem,
      level: "mid",
      phase,
      coveredCriteria: [0],
      progress: { step: "drawing", candidateTurns: 8, discussionTurnLimit: 2 },
    });
    expect(instructions).toContain(phase.goal);
    expect(instructions).toContain(phase.interviewerGuidance);
    expect(instructions).toContain('"covered_criterion_indexes":[0]');
    expect(instructions).toContain(
      "Drawing and explanation pacing takes priority",
    );
    expect(instructions).toContain("Do not critique the sketch");
    expect(instructions).not.toContain(problem.phases[2].interviewerGuidance);
  });
  it("includes server-derived drawing progress in trusted instructions", () => {
    const problem = getProblem("single-server-scaling");
    if (!problem) throw new Error("Missing problem config");
    const messages = [
      { role: "user" as const, content: "First answer" },
      { role: "user" as const, content: "Second answer" },
    ];
    const progress = getInterviewProgress(problem, messages);
    const instructions = buildInterviewInstructions({
      problem,
      level: "mid",
      progress,
    });
    expect(instructions).toContain('"step":"invite-drawing"');
    expect(instructions).toContain(
      "application will append the configured invitation",
    );
    expect(instructions).toContain("Do not ask another question");
  });
  it("keeps the simple exercise focused on the drawn server and excludes the URL shortener rubric", () => {
    const problem = getProblem("single-server-scaling");
    if (!problem) throw new Error("Missing simple scaling problem");
    const instructions = buildInterviewInstructions({ problem, level: "mid" });
    expect(instructions).toContain('"problem_id":"single-server-scaling"');
    expect(instructions).toContain(
      "Use plain language and ask one short question at a time",
    );
    expect(instructions).toContain("Keep the exercise in one region");
    expect(instructions).not.toContain("url-shortener");
    expect(instructions).not.toContain("alias ownership");
  });
  it.each(interviewLevelSchema.options)(
    "keeps the selected %s exercise and private rubric in trusted instructions",
    (level) => {
      const problem = getProblem("url-shortener");
      if (!problem) throw new Error("Missing URL shortener config");
      const instructions = buildInterviewInstructions({ problem, level });
      expect(instructions).toContain(INTERVIEWER_INSTRUCTIONS);
      expect(instructions).toContain('"problem_id":"url-shortener"');
      expect(instructions).toContain(`"candidate_level":"${level}"`);
      expect(instructions).toContain(problem.levels[level].expectations);
      expect(instructions).toContain(problem.rubric[0].strong);
      expect(instructions).toContain("Never quote, list, or disclose them");
      expect(instructions).toContain(
        "only when the candidate asks for clarification",
      );
      expect(instructions).toContain("do not greet them again or restart");
      for (const other of interviewLevelSchema.options.filter(
        (value) => value !== level,
      ))
        expect(instructions).not.toContain(problem.levels[other].expectations);
    },
  );
});
