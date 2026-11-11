import "server-only";
import { internalQuestionKey } from "@/lib/internal-question-key";
import { z } from "zod";
import { problemIdSchema } from "@/lib/interview-selection";
import { phasesSchema } from "@/lib/phase-config";
import { questionAtEnd } from "@/lib/open-question";
import { genaiConfigSchema } from "@/lib/genai-config";
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
export const problemSchema = z
  .object({
    id: problemIdSchema,
    track: z.enum(["core", "genai"]).default("core"),
    genai: genaiConfigSchema.optional(),
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
      .min(1)
      .max(10),
    followUps: z.array(z.string().min(1)).min(1),
    followUpStages: z.array(z.number().int().min(2).max(4)).default([]),
    reviewProbes: z
      .array(
        z.object({
          id: z.string().min(1).transform(internalQuestionKey),
          areaIndex: z.number().int().min(0),
          topicPattern: z.string().min(1),
          topic: z
            .string()
            .min(1)
            .max(85)
            .transform(internalQuestionKey)
            .optional(),
          requiresPattern: z.string().min(1).max(500).optional(),
          question: z.string().min(1),
          stageIndex: z.number().int().min(2).max(4).optional(),
        }),
      )
      .default([]),
    diagramReview: z
      .object({ checkApplicationDataPaths: z.boolean() })
      .default({ checkApplicationDataPaths: true }),
  })
  .superRefine((problem, ctx) => {
    if (
      problem.track === "genai" &&
      (!problem.genai ||
        !problem.rubric.some(
          (area) => area.area === problem.genai?.evaluationArea,
        ) ||
        !problem.rubric.some((area) => area.area === problem.genai?.safetyArea))
    )
      ctx.addIssue({
        code: "custom",
        message:
          "GenAI problems need private reference content and quality/safety rubric areas",
      });
  });
export type ProblemDefinition = z.infer<typeof problemSchema>;
