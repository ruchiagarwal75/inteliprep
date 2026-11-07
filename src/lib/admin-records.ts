import { z } from "zod";
export const adminFeedbackSchema = z.object({
  summary: z.string(),
  signal: z.string(),
  areas: z.array(
    z.object({
      area: z.string(),
      score: z.number().nullable(),
      rationale: z.string(),
    }),
  ),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
});
export type AdminInterview = {
  id: string;
  problemId: string;
  level: string;
  status: "unfinished" | "completed" | "exited" | "failed";
  startedAt: string | null;
  lastActivityAt: string | null;
  endedAt: string | null;
  firstResponseAt: string | null;
  designPresentedAt: string | null;
  feedbackStatus: string;
  feedback: z.infer<typeof adminFeedbackSchema> | null;
  coverage: string;
  isTest: boolean;
  cost: CostSummary;
  failure: {
    category: string;
    referenceId: string;
    occurredAt: string;
    operation: string;
    source: string;
  } | null;
};
export type CostSummary = {
  totalCalls: number;
  pricedCalls: number;
  knownUsd: number | null;
  unknownCalls: number;
};
export type AdminUser = {
  id: string;
  email: string | null;
  signupAt: string;
  lastActivityAt: string | null;
  interviewCount: number;
  historyComplete: boolean;
};
export type AdminFailure = {
  id: string;
  interviewId: string | null;
  userId: string | null;
  email: string | null;
  requestId: string;
  referenceId: string;
  operation: string;
  category: string;
  occurredAt: string;
  source: string;
};
export type AdminOverview = {
  environment: string;
  trackingSince: string;
  generatedAt: string;
  sevenDaysAgo: string;
  users: { total: number; newSignups: number; active: number };
  interviews: {
    started: number;
    completed: number;
    failed: number;
    unfinished: number;
    exited: number;
    averageSeconds: number | null;
    timedCompleted: number;
  };
  cost: CostSummary;
  activity: {
    interviewId: string;
    userId: string | null;
    email: string | null;
    problemId: string;
    event: string;
    at: string;
  }[];
  failures: AdminFailure[];
};
