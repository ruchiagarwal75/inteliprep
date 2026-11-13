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
