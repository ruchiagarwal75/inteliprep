import { z } from "zod";
export const gradingStageSchema = z.enum(["reading", "writing", "checking"]);
export type GradingStage = z.infer<typeof gradingStageSchema>;
export type GradingProgressListener = (stage: GradingStage) => void;
export const GRADING_STEPS = [
  { id: "reading", label: "Reading your transcript and diagram" },
  { id: "writing", label: "Writing feedback" },
  { id: "checking", label: "Checking the evidence" },
] as const;
export const gradingEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("progress"), stage: gradingStageSchema }),
  z.object({
    type: z.literal("result"),
    status: z.number().int().min(200).max(599),
    body: z.unknown(),
  }),
]);
