import { z } from "zod";
export const welcomeFinishSchema = z.discriminatedUnion("action", [
  z
    .object({
      runId: z.uuid(),
      action: z.literal("skip"),
      panel: z.number().int().min(1).max(4),
    })
    .strict(),
  z
    .object({
      runId: z.uuid(),
      action: z.literal("complete"),
      panel: z.literal(4),
    })
    .strict(),
]);
export type WelcomeFinish = z.infer<typeof welcomeFinishSchema>;
export const welcomeStartSchema = z
  .object({ requestId: z.uuid(), replay: z.boolean() })
  .strict();
export const WELCOME_METRICS = [
  ["shown", "Intro shown"],
  ["skipped", "Intro skipped"],
  ["completed", "Intro completed"],
  ["topicStarted", "First topic opened from intro"],
] as const;
export type WelcomeCounts = Record<(typeof WELCOME_METRICS)[number][0], number>;
