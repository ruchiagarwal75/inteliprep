import type { SavedInterview } from "@/lib/saved-interview";
import { interviewResumeResponseSchema } from "@/lib/interview-resume";
import { serverClockOffset } from "@/lib/interview-timer";

/** Reopening a finished scorecard needs no provider or server request. */
export async function reconnectInterview(
  saved: SavedInterview,
): Promise<SavedInterview> {
  if (saved.scorecard) return saved;
  const response = await fetch("/api/interview/resume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(saved.interview),
    signal: AbortSignal.timeout(8_000),
  });
  const body: unknown = await response.json();
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
    phase: checkpoint.phase,
    hasEnded: saved.hasEnded || checkpoint.ended,
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
