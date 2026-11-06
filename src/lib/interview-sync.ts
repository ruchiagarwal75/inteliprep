export const INTERVIEW_TRANSCRIPT_CHANGED = "INTERVIEW_TRANSCRIPT_CHANGED";
export function isTranscriptConflict(status: number, body: unknown): boolean {
  return (
    status === 409 &&
    Boolean(
      body &&
      typeof body === "object" &&
      "code" in body &&
      body.code === INTERVIEW_TRANSCRIPT_CHANGED,
    )
  );
}
export class InterviewSyncError extends Error {
  constructor() {
    super(
      "The conversation changed in another tab. Load the latest version to continue.",
    );
  }
}
