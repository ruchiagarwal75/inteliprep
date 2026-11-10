import "server-only";
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
  type InterviewLevel,
  type InterviewStart,
  type ProblemSummary,
} from "@/lib/interview-selection";
import { publicPhase } from "@/lib/phase-config";
import { initializeTranscript } from "@/lib/interview-transcript";
import {
  problemSchema,
  type ProblemDefinition,
} from "@/lib/problem-definition";
export type { ProblemDefinition } from "@/lib/problem-definition";
import { questionAtEnd } from "@/lib/open-question";
import {
  createInterviewSession,
  interviewSessionCheckpoint,
} from "@/lib/interview-sessions";

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
    track: problem.track,
    title: problem.title,
    summary: problem.summary,
    levels: [...interviewLevelSchema.options],
  }));
}

/** Only the candidate-visible openings join the public catalog for the Brief page. */
export function problemBriefs() {
  return listProblems().map((summary) => {
    const problem = getProblem(summary.problemId);
    return {
      ...summary,
      brief: problem
        ? {
            mid: problem.levels.mid.openingMessage,
            senior: problem.levels.senior.openingMessage,
            staff: problem.levels.staff.openingMessage,
          }
        : undefined,
    };
  });
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
