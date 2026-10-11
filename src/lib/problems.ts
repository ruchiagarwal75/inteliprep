import "server-only";
import { z } from "zod";
import urlShortener from "@/lib/problems/url-shortener.json";
import singleServerScaling from "@/lib/problems/single-server-scaling.json";
import {
  interviewLevelSchema,
  problemIdSchema,
  type InterviewLevel,
  type InterviewStart,
  type ProblemSummary,
} from "@/lib/interview-selection";
import { phasesSchema, publicPhase } from "@/lib/phase-config";
import { createInterviewSession } from "@/lib/interview-sessions";

const levelConfig = z.object({
  openingMessage: z.string().min(1).max(8_000),
  expectations: z.string().min(1),
  scaleHints: z.array(z.string().min(1)).min(1),
});
const problemSchema = z.object({
  id: problemIdSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  prompt: z.string().min(1),
  phases: phasesSchema,
  drawingPolicy: z.object({
    discussionTurns: z.number().int().min(1).max(10),
    invitation: z.string().trim().min(1).max(1_000),
  }),
  requirements: z.array(z.string().min(1)).min(1),
  levels: z.object({
    mid: levelConfig,
    senior: levelConfig,
    staff: levelConfig,
  }),
  rubric: z
    .array(z.object({ area: z.string().min(1), strong: z.string().min(1) }))
    .min(1),
  followUps: z.array(z.string().min(1)).min(1),
});
export type ProblemDefinition = z.infer<typeof problemSchema>;
const problems: ProblemDefinition[] = [
  problemSchema.parse(singleServerScaling),
  problemSchema.parse(urlShortener),
];

export function getProblem(problemId: string): ProblemDefinition | undefined {
  return problems.find((problem) => problem.id === problemId);
}

/** Explicit allowlist: only this projection may be sent to the browser. */
export function listProblems(): ProblemSummary[] {
  return problems.map((problem) => ({
    problemId: problem.id,
    title: problem.title,
    summary: problem.summary,
    levels: [...interviewLevelSchema.options],
  }));
}

/** The opening is configured and deterministic; starting makes no LLM call. */
export function createInterviewStart(
  problem: ProblemDefinition,
  level: InterviewLevel,
): InterviewStart {
  return {
    problemId: problem.id,
    level,
    sessionId: createInterviewSession({ problemId: problem.id, level }),
    phase: publicPhase(problem.phases, 0),
    openingMessage: {
      role: "assistant",
      content: problem.levels[level].openingMessage,
    },
  };
}
