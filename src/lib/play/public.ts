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
  elapsedMs: z.number().nonnegative().optional(),
  maxTimeMs: z.number().positive().optional(),
  revision: z.number().int().nonnegative().optional(),
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
  combo: z.number().int().nonnegative().optional(),
  comboBonus: z.number().int().nonnegative().optional(),
  correct: z.boolean(),
  score: z.number().min(0).max(1),
  points: z.number().int().nonnegative(),
  feedback: z.string(),
  why: z.string(),
  formula: z.string().optional(),
  expected: z.string().optional(),
  timeMs: z.number().nonnegative(),
  badgesEarned: z.array(z.string()).default([]),
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
  levelTitle: z.string().optional(),
  bestCombo: z.number().int().nonnegative().optional(),
  stars: z.number().int().min(0).max(3).optional(),
  bestStars: z.number().int().min(0).max(3).optional(),
  replay: z.boolean().optional(),
  answerTimeMs: z.number().nonnegative().optional(),
  pointsEarned: z.number().int().nonnegative().optional(),
  nextLevel: z
    .object({ level: z.number().int(), title: z.string() })
    .optional(),
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
  mockPrompt: z
    .object({
      topic: z.string(),
      title: z.string(),
      problemId: z.string(),
      level: z.enum(["mid", "senior", "staff"]),
    })
    .optional(),
});
export type RoundSummary = z.infer<typeof roundSummarySchema>;
const roundFields = {
  refreshed: z.boolean().optional(),
  combo: z.number().int().nonnegative().optional(),
  outcomes: z.array(z.boolean().nullable()).optional(),
  resumed: z.boolean().optional(),
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
export const startRoundResultSchema = z.object({
  sessionId: z.uuid(),
  view: roundViewSchema.optional(),
});
export const submitRoundSchema = z
  .object({
    attemptId: z.uuid(),
    answer: drillAnswerSchema,
    revision: z.number().int().nonnegative().default(0),
  })
  .strict();
export const playerXpLevelSchema = z.object({
  level: z.number().int().positive(),
  currentXp: z.number().int().nonnegative(),
  neededXp: z.number().int().positive(),
  nextXp: z.number().int().positive(),
});
export const playTotalsSchema = z.object({
  xpLevel: playerXpLevelSchema.optional(),
  dailyGoal: z.boolean().optional(),
  points: z.coerce.number().int().nonnegative(),
  streak: z.number().int().nonnegative(),
});
export type PlayTotals = z.infer<typeof playTotalsSchema>;
export const submitRoundResultSchema = z.object({
  totals: playTotalsSchema.optional(),
  result: drillResultSchema,
  summary: roundSummarySchema.optional(),
});
export const advanceRoundSchema = z
  .object({ sessionId: z.uuid(), afterAttemptId: z.uuid() })
  .strict();

export const BADGE_LABELS = {
  "first-level": "First level cleared",
  "math-five": "Caught the math",
  "rag-practice": "RAG practice-ready",
  "rag-interview": "RAG interview-ready",
  "streak-seven": "7-day streak",
} as const;

export const chestInputSchema = z
  .object({
    topic: z.string().regex(/^[a-z0-9-]{1,80}$/u),
    afterLevel: z.number().int().min(1).max(100),
  })
  .strict();
export const chestResultSchema = z.object({
  xp: z.number().int().min(20).max(50),
  opened: z.literal(true),
  totals: playTotalsSchema,
});

export const drillActivitySchema = z
  .object({
    attemptId: z.uuid(),
    revision: z.number().int().nonnegative().default(0),
    visible: z.boolean(),
  })
  .strict();
export const drillActivityResultSchema = z.object({
  elapsedMs: z.number().nonnegative(),
  maxTimeMs: z.number().positive(),
  refreshed: z.boolean().optional(),
});
