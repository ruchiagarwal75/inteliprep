import "server-only";
import { z } from "zod";
import type { InterviewPhase } from "@/lib/interview-phase";

export const phaseConfigSchema = z.object({
  id: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(80),
  title: z.string().min(1).max(100),
  goal: z.string().min(1).max(1_000),
  completionCriteria: z.array(z.string().min(1).max(500)).min(1).max(8),
  interviewerGuidance: z.string().min(1).max(2_000),
  transition: z.enum(["initial", "drawing", "coverage", "wrap-up"]),
});
export type PhaseConfig = z.infer<typeof phaseConfigSchema>;

export const phasesSchema = z
  .array(phaseConfigSchema)
  .min(4)
  .max(10)
  .refine(
    (phases) =>
      new Set(phases.map((phase) => phase.id)).size === phases.length &&
      phases[0].transition === "initial" &&
      phases[1].transition === "drawing" &&
      phases.at(-1)?.transition === "wrap-up" &&
      phases.slice(2, -1).every((phase) => phase.transition === "coverage"),
    {
      message:
        "Stages must have unique IDs and follow initial, drawing, coverage, wrap-up order",
    },
  );

export function publicPhase(
  phases: PhaseConfig[],
  index: number,
): InterviewPhase {
  const phase = phases[index];
  if (!phase) throw new Error("Unknown interview stage");
  return {
    id: phase.id,
    title: phase.title,
    position: index + 1,
    total: phases.length,
  };
}
