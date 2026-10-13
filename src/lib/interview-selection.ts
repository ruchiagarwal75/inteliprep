import { z } from "zod";
import { interviewPhaseSchema } from "@/lib/interview-phase";
import {
  interviewDurationSchema,
  interviewTimingSchema,
} from "@/lib/interview-timer";

/** Public selection and response types; no interviewer configuration lives here. */
export const interviewLevelSchema = z.enum(["mid", "senior", "staff"]);
export const problemIdSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const interviewSelectionSchema = z.object({
  problemId: problemIdSchema,
  level: interviewLevelSchema,
});
export const interviewStartSchema = interviewSelectionSchema.extend({
  timing: interviewTimingSchema.optional(),
  serverTime: z.iso.datetime().optional(),
  sessionId: z.uuid(),
  resumeToken: z.string().min(1).max(8_000).optional(),
  phase: interviewPhaseSchema,
  openingMessage: z.object({
    role: z.literal("assistant"),
    content: z.string().min(1).max(8_000),
  }),
});
export const interviewStartRequestSchema = interviewSelectionSchema.extend({
  durationMinutes: interviewDurationSchema.default(45),
});
export type InterviewLevel = z.infer<typeof interviewLevelSchema>;
export type InterviewSelection = z.infer<typeof interviewSelectionSchema>;
export type InterviewStart = z.infer<typeof interviewStartSchema>;
export type ProblemSummary = {
  problemId: string;
  title: string;
  summary: string;
  levels: InterviewLevel[];
};
export const INTERVIEW_LEVEL_LABELS: Record<InterviewLevel, string> = {
  mid: "Mid-level",
  senior: "Senior",
  staff: "Staff",
};
