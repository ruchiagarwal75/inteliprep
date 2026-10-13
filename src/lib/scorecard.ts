import { z } from "zod";
import { interviewSelectionSchema } from "@/lib/interview-selection";

export const scoreEvidenceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("message"),
    messageIndex: z.number().int().min(0),
    quote: z.string().min(1).max(500),
  }),
  z.object({
    kind: z.literal("diagram"),
    elementId: z.string().min(1).max(128),
  }),
]);
export type ScoreEvidence = z.infer<typeof scoreEvidenceSchema>;
const gradingEvidenceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("message"), quoteId: z.string().min(1).max(80) }),
  z.object({
    kind: z.literal("diagram"),
    elementId: z.string().min(1).max(128),
  }),
]);
export const interviewSignalSchema = z.enum([
  "strong_no",
  "no",
  "yes",
  "strong_yes",
  "insufficient_evidence",
]);
export const SCORE_LABELS = {
  1: "Needs work",
  2: "Developing",
  3: "Solid",
  4: "Strong",
} as const;
export const SIGNAL_LABELS: Record<
  z.infer<typeof interviewSignalSchema>,
  string
> = {
  strong_no: "Strong no",
  no: "No",
  yes: "Yes",
  strong_yes: "Strong yes",
  insufficient_evidence: "Not enough evidence for an overall signal",
};

const findingSchema = z.object({
  text: z.string().min(1).max(600),
  evidence: z.array(scoreEvidenceSchema).min(1).max(3),
});
const gradingFindingSchema = findingSchema.extend({
  evidence: z.array(gradingEvidenceSchema).min(1).max(3),
});
const areaFields = {
  score: z.number().int().min(1).max(4).nullable(),
  rationale: z.string().min(1).max(800),
  evidence: z.array(scoreEvidenceSchema).max(3),
};

/** Provider schema; evidence is verified separately before publishing a scorecard. */
export const gradingAssessmentSchema = z.object({
  summary: z.string().min(1).max(1_000),
  signal: interviewSignalSchema,
  areas: z
    .array(
      z.object({
        areaIndex: z.number().int().min(0),
        ...areaFields,
        evidence: z.array(gradingEvidenceSchema).max(3),
      }),
    )
    .min(1)
    .max(10),
  strengths: z.array(gradingFindingSchema).max(3),
  gaps: z.array(gradingFindingSchema).max(3),
  nextProblemId: z.string().min(1).max(80),
  practiceFocus: z.string().min(1).max(600),
});
export type GradingAssessment = z.infer<typeof gradingAssessmentSchema>;

/** Public feedback only: private rubric definitions and prompts stay on the server. */
export const scorecardSchema = z.object({
  ...interviewSelectionSchema.shape,
  problemTitle: z.string().min(1),
  endedAt: z.iso.datetime(),
  session: z
    .object({
      startedAt: z.iso.datetime(),
      elapsedSeconds: z.number().int().nonnegative(),
      allowedSeconds: z.number().int().positive(),
      limited: z.boolean(),
      note: z.string().min(1).max(600),
    })
    .optional(),
  summary: gradingAssessmentSchema.shape.summary,
  signal: interviewSignalSchema,
  areas: z.array(z.object({ area: z.string().min(1), ...areaFields })).min(1),
  strengths: z.array(findingSchema).max(3),
  gaps: z.array(findingSchema).max(3),
  nextPractice: z.object({
    problemId: z.string().min(1),
    title: z.string().min(1),
    focus: gradingAssessmentSchema.shape.practiceFocus,
  }),
});
export type Scorecard = z.infer<typeof scorecardSchema>;
export const interviewEndResponseSchema = z.object({
  ended: z.literal(true),
  scorecard: scorecardSchema,
});
