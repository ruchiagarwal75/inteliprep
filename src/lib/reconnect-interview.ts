import type { SavedInterview } from "@/lib/saved-interview";
import { interviewResumeResponseSchema } from "@/lib/interview-resume";
import { serverClockOffset } from "@/lib/interview-timer";
import { interviewRecoveryFailure } from "@/lib/interview-recovery";
import { reconcileTranscript } from "@/lib/transcript-reconciliation";
import { expiredInterviewUpdate } from "@/lib/close-interview";
import { responseRateLimit } from "@/lib/retry-after";

/** Reopening a finished scorecard needs no provider or server request. */
export async function reconnectInterview(
  saved: SavedInterview,
  request: typeof fetch = fetch,
): Promise<SavedInterview> {
  if (saved.scorecard || saved.closedWithoutScoring) return saved;
  const response = await request("/api/interview/resume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(saved.interview),
    signal: AbortSignal.timeout(8_000),
  });
  const body: unknown = await response.json();
  const limited = responseRateLimit(response);
  if (limited) throw limited;
  const recovery = interviewRecoveryFailure(response.status, body);
  if (!response.ok && recovery)
    return {
      ...saved,
      ...(recovery.code === "INTERVIEW_SESSION_EXPIRED"
        ? expiredInterviewUpdate(
            saved.messages,
            saved.draftText,
            saved.interview.timing?.deadlineAt,
          )
        : {}),
      recoveryFailure: recovery,
    };
  if (!response.ok)
    throw new Error(
      body &&
        typeof body === "object" &&
        "error" in body &&
        typeof body.error === "string"
        ? body.error
        : "Couldn't reconnect to the interviewer. Your browser copy is available.",
    );
  const checkpoint = interviewResumeResponseSchema.parse(body);
  return {
    ...saved,
    ...(checkpoint.messages
      ? reconcileTranscript(saved, checkpoint.messages)
      : {}),
    transcriptConflict: undefined,
    recoveryFailure: undefined,
    phase: checkpoint.phase,
    hasEnded: checkpoint.messages
      ? checkpoint.ended
      : saved.hasEnded || checkpoint.ended,
    ...(checkpoint.messages && !checkpoint.ended
      ? { endRequest: undefined, gradingError: undefined, endedAt: undefined }
      : {}),
    ...(checkpoint.scorecard
      ? {
          scorecard: checkpoint.scorecard,
          endRequest: undefined,
          gradingError: undefined,
          endedAt: checkpoint.scorecard.endedAt,
        }
      : {}),
    clockOffsetMs: checkpoint.serverTime
      ? serverClockOffset(checkpoint.serverTime)
      : saved.clockOffsetMs,
    interview: {
      ...saved.interview,
      resumeToken: checkpoint.resumeToken,
      timing: checkpoint.timing ?? saved.interview.timing,
      serverTime: checkpoint.serverTime ?? saved.interview.serverTime,
    },
  };
}
