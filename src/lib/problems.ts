import "server-only";
import { z } from "zod";
import type { InterviewDuration } from "@/lib/interview-timer";
import urlShortener from "@/lib/problems/url-shortener.json";
import singleServerScaling from "@/lib/problems/single-server-scaling.json";
import rateLimiter from "@/lib/problems/rate-limiter.json";
import chatService from "@/lib/problems/chat-service.json";
import newsFeed from "@/lib/problems/news-feed.json";
import notificationSystem from "@/lib/problems/notification-system.json";
import fileStorage from "@/lib/problems/file-storage.json";
import videoStreaming from "@/lib/problems/video-streaming.json";
import {
  interviewLevelSchema,
  problemIdSchema,
  type InterviewLevel,
  type InterviewStart,
  type ProblemSummary,
} from "@/lib/interview-selection";
import { phasesSchema, publicPhase } from "@/lib/phase-config";
import { initializeTranscript } from "@/lib/interview-transcript";
import { questionAtEnd } from "@/lib/open-question";
import {
  createInterviewSession,
  interviewSessionCheckpoint,
} from "@/lib/interview-sessions";

const levelConfig = z.object({
  openingMessage: z
    .string()
    .min(1)
    .max(8_000)
    .refine(
      (value) => Boolean(questionAtEnd(value)),
      "An opening needs a closing clarification question",
    ),
  expectations: z.string().min(1),
  scaleHints: z.array(z.string().min(1)).min(1),
});
const problemSchema = z.object({
  id: problemIdSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  prompt: z.string().min(1),
  phases: phasesSchema,
  openingCriteria: z.array(z.number().int().min(0).max(7)).default([]),
  clarifications: z
    .array(
      z.object({
        pattern: z.string().min(1).max(300),
        sharedAnswerPattern: z.string().min(1).max(400).optional(),
        sharedAnswerPatterns: z
          .object({
            mid: z.string().min(1).max(600),
            senior: z.string().min(1).max(600),
            staff: z.string().min(1).max(600),
          })
          .optional(),
        answers: z.object({
          mid: z.string().min(1),
          senior: z.string().min(1),
          staff: z.string().min(1),
        }),
        coversCriteria: z.array(z.number().int().min(0).max(7)),
      }),
    )
    .default([]),
  drawingPolicy: z.object({
    discussionTurns: z.number().int().min(1).max(10),
    invitation: z.string().trim().min(1).max(1_000),
    legacyInvitations: z.array(z.string()).default([]),
  }),
  requirements: z.array(z.string().min(1)).min(1),
  gradingGuidance: z.array(z.string().min(1)).default([]),
  levels: z.object({
    mid: levelConfig,
    senior: levelConfig,
    staff: levelConfig,
  }),
  rubric: z
    .array(
      z.object({
        area: z.string().min(1),
        strong: z.string().min(1),
        assessmentPattern: z.string().min(1).max(1_000).optional(),
      }),
    )
    .min(1),
  followUps: z.array(z.string().min(1)).min(1),
  followUpStages: z.array(z.number().int().min(2).max(4)).default([]),
  reviewProbes: z
    .array(
      z.object({
        id: z.string().min(1),
        areaIndex: z.number().int().min(0),
        topicPattern: z.string().min(1),
        question: z.string().min(1),
        stageIndex: z.number().int().min(2).max(4).optional(),
      }),
    )
    .default([]),
  diagramReview: z
    .object({ checkApplicationDataPaths: z.boolean() })
    .default({ checkApplicationDataPaths: true }),
});
export type ProblemDefinition = z.infer<typeof problemSchema>;
const problems: ProblemDefinition[] = [
  problemSchema.parse(singleServerScaling),
  problemSchema.parse(urlShortener),
  problemSchema.parse(rateLimiter),
  problemSchema.parse(chatService),
  problemSchema.parse(newsFeed),
  problemSchema.parse(notificationSystem),
  problemSchema.parse(fileStorage),
  problemSchema.parse(videoStreaming),
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
  durationMinutes: InterviewDuration = 45,
): InterviewStart {
  const selection = { problemId: problem.id, level };
  const openingQuestion = questionAtEnd(problem.levels[level].openingMessage);
  if (!openingQuestion) throw new Error("Missing configured opening question");
  const sessionId = createInterviewSession(selection, durationMinutes);
  initializeTranscript(sessionId, {
    role: "assistant",
    content: openingQuestion,
  });
  const checkpoint = interviewSessionCheckpoint(sessionId, selection);
  return {
    problemId: problem.id,
    level,
    sessionId,
    resumeToken: checkpoint.resumeToken,
    timing: checkpoint.timing,
    serverTime: checkpoint.serverTime,
    phase: publicPhase(problem.phases, 0),
    openingMessage: {
      role: "assistant",
      content: openingQuestion,
    },
  };
}
