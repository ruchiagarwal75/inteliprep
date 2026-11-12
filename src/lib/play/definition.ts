import "server-only";
import { z } from "zod";
const parameter = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("range"),
      min: z.number(),
      max: z.number(),
      step: z.number().positive().default(1),
    })
    .refine((p) => p.max >= p.min),
  z.object({ kind: z.literal("choices"), values: z.array(z.number()).min(1) }),
]);
export const mathTemplateSchema = z.object({
  parameters: z.record(z.string(), parameter),
  expression: z
    .array(
      z.union([
        z.number(),
        z.object({ param: z.string() }),
        z.enum(["add", "multiply", "divide", "ceil"]),
      ]),
    )
    .min(1),
  formula: z.string(),
  canonicalUnit: z.string(),
  units: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        factor: z.number().positive(),
      }),
    )
    .min(1),
  exactInteger: z.boolean().default(false),
  example: z
    .object({
      parameters: z.record(z.string(), z.number()),
      answer: z.number(),
    })
    .optional(),
});
const common = {
  id: z.string().regex(/^[a-z0-9-]+$/u),
  topic: z.string(),
  level: z.number().int().positive(),
  title: z.string(),
  prompt: z.string(),
  why: z.string(),
  gapId: z.string().optional(),
  sample: z.boolean(),
  placement: z.boolean().default(false),
};
const written = { rubric: z.string().min(1), seniorAnswer: z.string().min(1) };
export const drillDefinitionSchema = z.discriminatedUnion("type", [
  z.object({ ...common, type: z.literal("math"), math: mathTemplateSchema }),
  z.object({
    ...common,
    type: z.literal("spot_flaw"),
    options: z.array(z.string()).length(4),
    correctIndex: z.number().int().min(0).max(3),
    course: z
      .object({
        kind: z.enum(["concept", "flaw", "math"]),
        keyIdea: z.string(),
        ifWrong: z.record(z.string(), z.string()),
      })
      .optional(),
  }),
  z.object({ ...common, type: z.literal("pick_probe"), ...written }),
  z.object({ ...common, type: z.literal("tradeoff"), ...written }),
]);
export type DrillDefinition = z.infer<typeof drillDefinitionSchema>;
export type MathTemplate = z.infer<typeof mathTemplateSchema>;
export const drillVariantSchema = z.object({
  parameters: z.record(z.string(), z.number()),
  order: z
    .array(z.number().int().min(0).max(3))
    .length(4)
    .refine((order) => new Set(order).size === 4),
});
export type DrillVariant = z.infer<typeof drillVariantSchema>;
