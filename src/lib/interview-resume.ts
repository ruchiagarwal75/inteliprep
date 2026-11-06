import { z } from "zod";
import { interviewSelectionSchema } from "@/lib/interview-selection";
import { interviewPhaseSchema } from "@/lib/interview-phase";
import { interviewTimingSchema } from "@/lib/interview-timer";
import { chatMessageSchema } from "@/lib/chat";
import { scorecardSchema } from "@/lib/scorecard";

export const resumeTokenSchema = z.string().min(1).max(8_000);
export const interviewResumeRequestSchema = interviewSelectionSchema.extend({
  sessionId: z.uuid(),
  resumeToken: resumeTokenSchema.optional(),
});
export const interviewResumeResponseSchema = z.object({
  phase: interviewPhaseSchema,
  resumeToken: resumeTokenSchema,
  ended: z.boolean(),
  timing: interviewTimingSchema.optional(),
  serverTime: z.iso.datetime().optional(),
  messages: z.array(chatMessageSchema).max(102).optional(),
  scorecard: scorecardSchema.optional(),
});
export type InterviewCheckpoint = z.infer<typeof interviewResumeResponseSchema>;
