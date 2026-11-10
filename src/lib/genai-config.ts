import "server-only";
import { z } from "zod";
const levels = z.object({
  mid: z.string().min(1),
  senior: z.string().min(1),
  staff: z.string().min(1),
});
/** All facts, reference arithmetic and model designs stay behind the server boundary. */
export const genaiConfigSchema = z.object({
  facts: z
    .array(
      z.object({
        id: z.string().min(1),
        pattern: z.string().min(1).max(500),
        answers: levels,
        coversCriteria: z.array(z.number().int().min(0).max(7)),
      }),
    )
    .min(1),
  estimateAnchors: z.object({
    mid: z.array(z.string()),
    senior: z.array(z.string()),
    staff: z.array(z.string()),
  }),
  expectedDesign: z.array(z.string().min(1)).min(1),
  redFlags: z.array(z.string().min(1)).min(1),
  assumptions: z
    .array(
      z.object({
        id: z.string(),
        pattern: z.string().max(500),
        question: z.string().min(1),
        midSuggestion: z.string().optional(),
      }),
    )
    .default([]),
  interviewerGuidance: z.array(z.string().min(1)).default([]),
  assumptionGuidance: z.array(z.string().min(1)).default([]),
});
export type GenaiConfig = z.infer<typeof genaiConfigSchema>;
