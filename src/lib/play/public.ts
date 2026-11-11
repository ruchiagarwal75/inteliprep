import { z } from "zod";
export const drillTypeSchema = z.enum([
  "math",
  "spot_flaw",
  "pick_probe",
  "tradeoff",
]);
export const DRILL_TYPE_LABELS = {
  math: "Math",
  spot_flaw: "Spot the flaw",
  pick_probe: "Pick the probe",
  tradeoff: "Trade-off call",
} as const;
export const drillAnswerSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("math"),
      value: z.number().finite().nonnegative(),
      unit: z.string().min(1).max(64),
    })
    .strict(),
  z
    .object({
      type: z.literal("spot_flaw"),
      option: z.enum(["0", "1", "2", "3"]),
    })
    .strict(),
  z
    .object({
      type: z.literal("pick_probe"),
      text: z.string().trim().min(1).max(2000),
    })
    .strict(),
  z
    .object({
      type: z.literal("tradeoff"),
      decision: z.string().trim().min(1).max(300),
      reason: z.string().trim().min(1).max(2000),
    })
    .strict(),
]);
export type DrillAnswer = z.infer<typeof drillAnswerSchema>;
const questionFields = {
  attemptId: z.uuid(),
  drillId: z.string(),
  topic: z.string(),
  level: z.number().int(),
  title: z.string(),
  prompt: z.string(),
  ordinal: z.number().int(),
  total: z.number().int(),
  startedAt: z.iso.datetime(),
  serverNow: z.iso.datetime(),
  gapHref: z.string().optional(),
  sample: z.boolean(),
};
export const drillQuestionSchema = z.discriminatedUnion("type", [
  z.object({
    ...questionFields,
    type: z.literal("math"),
    units: z.array(z.object({ id: z.string(), label: z.string() })).min(1),
  }),
  z.object({
    ...questionFields,
    type: z.literal("spot_flaw"),
    options: z
      .array(z.object({ id: z.enum(["0", "1", "2", "3"]), text: z.string() }))
      .length(4),
  }),
  z.object({ ...questionFields, type: z.literal("pick_probe") }),
  z.object({ ...questionFields, type: z.literal("tradeoff") }),
]);
export type DrillQuestion = z.infer<typeof drillQuestionSchema>;
export const drillResultSchema = z.object({
  correct: z.boolean(),
  score: z.number().min(0).max(1),
  points: z.number().int().nonnegative(),
  feedback: z.string(),
  why: z.string(),
  formula: z.string().optional(),
  expected: z.string().optional(),
  timeMs: z.number().nonnegative(),
});
export type DrillResult = z.infer<typeof drillResultSchema>;
export const timeZoneSchema = z
  .string()
  .min(1)
  .max(100)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, "Choose a valid time zone");
const startFields = {
  requestId: z.uuid(),
  topic: z.string().regex(/^[a-z0-9-]{1,80}$/u),
  timeZone: timeZoneSchema,
};
export const startRoundInputSchema = z.discriminatedUnion("mode", [
  z
    .object({
      ...startFields,
      mode: z.literal("level"),
      level: z.number().int().min(1).max(100),
    })
    .strict(),
  z.object({ ...startFields, mode: z.literal("placement") }).strict(),
  z.object({ ...startFields, mode: z.literal("review") }).strict(),
]);
export type StartRoundInput = z.infer<typeof startRoundInputSchema>;
export const roundSummarySchema = z.object({
  mode: z.enum(["level", "placement", "review"]),
  topic: z.string(),
  level: z.number().int().nullable(),
  correct: z.number().int(),
  total: z.number().int(),
  passed: z.boolean(),
  passedLevels: z.array(z.number().int()),
  retryDrills: z.array(
    z.object({
      drillId: z.string(),
      title: z.string(),
      level: z.number().int(),
    }),
  ),
  bonusPoints: z.number().int(),
  earnedBadges: z.array(z.string()),
  practiceReadyNow: z.boolean(),
});
export type RoundSummary = z.infer<typeof roundSummarySchema>;
const roundFields = {
  sessionId: z.uuid(),
  mode: z.enum(["level", "placement", "review"]),
  question: drillQuestionSchema,
};
export const roundViewSchema = z.discriminatedUnion("status", [
  z.object({ ...roundFields, status: z.literal("answering") }),
  z.object({
    ...roundFields,
    status: z.literal("grading"),
    answer: drillAnswerSchema,
    retryAfter: z.number().int().nonnegative(),
  }),
  z.object({
    ...roundFields,
    status: z.literal("graded"),
    answer: drillAnswerSchema,
    result: drillResultSchema,
    summary: roundSummarySchema.optional(),
  }),
]);
export type RoundView = z.infer<typeof roundViewSchema>;
export const submitRoundSchema = z
  .object({ attemptId: z.uuid(), answer: drillAnswerSchema })
  .strict();
export const submitRoundResultSchema = z.object({
  result: drillResultSchema,
  summary: roundSummarySchema.optional(),
});
export const advanceRoundSchema = z
  .object({ sessionId: z.uuid(), afterAttemptId: z.uuid() })
  .strict();
