import { z } from "zod";

export const interviewRecoveryFailureSchema = z.object({
  code: z.enum([
    "INTERVIEW_CHECKPOINT_INVALID",
    "INTERVIEW_SESSION_EXPIRED",
    "INTERVIEW_CONFIGURATION_CHANGED",
  ]),
  message: z.string().min(1).max(1_000),
});
export type InterviewRecoveryFailure = z.infer<
  typeof interviewRecoveryFailureSchema
>;

/** Only explicit, permanent checkpoint failures disable retry. Busy requests remain retryable. */
export function interviewRecoveryFailure(status: number, body: unknown) {
  if (status !== 404 && status !== 409) return undefined;
  if (
    !body ||
    typeof body !== "object" ||
    !("error" in body) ||
    !("code" in body)
  )
    return undefined;
  const parsed = interviewRecoveryFailureSchema.safeParse({
    code: body.code,
    message: body.error,
  });
  return parsed.success ? parsed.data : undefined;
}

export class InterviewRecoveryError extends Error {
  constructor(public readonly failure: InterviewRecoveryFailure) {
    super(failure.message);
  }
}
