import { z } from "zod";

/** Public stage labels only; goals, criteria, and guidance stay on the server. */
export const interviewPhaseSchema = z
  .object({
    id: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(80),
    title: z.string().min(1).max(100),
    position: z.number().int().min(1).max(10),
    total: z.number().int().min(1).max(10),
  })
  .refine((phase) => phase.position <= phase.total, {
    message: "Invalid stage position",
  });
export type InterviewPhase = z.infer<typeof interviewPhaseSchema>;

export const INTERVIEW_PHASE_HEADER = "X-Interview-Phase";

/** Headers announce a planned stage; callers apply it only after a complete reply. */
export function readInterviewPhase(
  headers: Headers,
): InterviewPhase | undefined {
  const encoded = headers.get(INTERVIEW_PHASE_HEADER);
  if (!encoded) return undefined;
  return interviewPhaseSchema.parse(JSON.parse(decodeURIComponent(encoded)));
}
