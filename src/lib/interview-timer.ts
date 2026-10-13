import { z } from "zod";

export const interviewDurationSchema = z.union([z.literal(1), z.literal(45)]);
export type InterviewDuration = z.infer<typeof interviewDurationSchema>;
export const interviewTimingSchema = z
  .object({
    startedAt: z.iso.datetime(),
    deadlineAt: z.iso.datetime(),
    durationMinutes: interviewDurationSchema,
  })
  .refine(
    (timing) =>
      Date.parse(timing.deadlineAt) - Date.parse(timing.startedAt) ===
      timing.durationMinutes * 60_000,
    { message: "Invalid interview deadline" },
  );
export type InterviewTiming = z.infer<typeof interviewTimingSchema>;

export function createInterviewTiming(
  durationMinutes: InterviewDuration = 45,
  now = Date.now(),
): InterviewTiming {
  return {
    startedAt: new Date(now).toISOString(),
    deadlineAt: new Date(now + durationMinutes * 60_000).toISOString(),
    durationMinutes,
  };
}

/** Recompute from a fixed deadline, so delayed ticks never grant more time. */
export function remainingInterviewSeconds(
  timing: InterviewTiming | undefined,
  serverNow: number,
): number {
  if (!timing) return 0;
  return Math.max(
    0,
    Math.ceil((Date.parse(timing.deadlineAt) - serverNow) / 1_000),
  );
}

export function formatInterviewTime(seconds: number): string {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export function serverClockOffset(
  serverTime: string | undefined,
  clientNow = Date.now(),
): number {
  return serverTime ? Date.parse(serverTime) - clientNow : 0;
}

/** One automatic attempt per mounted session; retries remain an explicit action. */
export function shouldAutoEndInterview(state: {
  expired: boolean;
  isReplying: boolean;
  isEnding: boolean;
  hasEnded: boolean;
  hasScorecard: boolean;
  disabled: boolean;
  attempted: boolean;
}): boolean {
  return (
    state.expired &&
    !state.isReplying &&
    !state.isEnding &&
    !state.hasEnded &&
    !state.hasScorecard &&
    !state.disabled &&
    !state.attempted
  );
}
