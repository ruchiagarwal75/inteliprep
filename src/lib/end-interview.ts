import "server-only";
import { APIError } from "openai";
import type { InterviewEndRequest } from "@/lib/interview-end";
import { getProblem } from "@/lib/problems";
import {
  acquireInterviewEnd,
  InterviewSessionError,
} from "@/lib/interview-sessions";
import { gradeInterview } from "@/lib/interview-grading";
import { withSessionContext } from "@/lib/scorecard-calibration";

export class InterviewGradingError extends Error {
  constructor(
    detail = "The grading service couldn't produce valid feedback. Retry scorecard; your answers and drawing are saved.",
  ) {
    super(`Your interview has ended. ${detail}`);
  }
}

export async function endInterview(
  request: InterviewEndRequest,
  signal?: AbortSignal,
) {
  const problem = getProblem(request.problemId);
  if (!problem)
    throw new InterviewSessionError("Unknown interview problem", 404);
  signal?.throwIfAborted();
  const lease = acquireInterviewEnd(
    request.sessionId,
    request,
    {
      messages: request.messages,
      scene: request.scene,
      diagramImage: request.diagramImage,
    },
    request.resumeToken,
  );
  try {
    if (lease.scorecard) return lease.scorecard;
    if (!lease.snapshot) throw new Error("Missing ended interview evidence");
    const scorecard = withSessionContext(
      await gradeInterview(
        problem,
        request.level,
        lease.snapshot,
        lease.endedAt,
        signal,
      ),
      lease.timing,
    );
    signal?.throwIfAborted();
    lease.complete(scorecard);
    return scorecard;
  } catch (cause) {
    // Log a diagnostic code, never provider headers, credentials, or evidence.
    const reason =
      cause instanceof APIError
        ? { status: cause.status, code: cause.code, param: cause.param }
        : cause instanceof Error && cause.name === "Error"
          ? cause.message
          : cause instanceof Error
            ? cause.name
            : "Unknown error";
    console.warn(
      "[interview] Scorecard unavailable; ended evidence retained for retry.",
      reason,
    );
    const detail =
      cause instanceof APIError &&
      (cause.status === 401 || cause.status === 403)
        ? "The grading service needs its server credentials checked. Your saved evidence is intact; retry after the server configuration is corrected."
        : cause instanceof APIError && cause.status === 429
          ? "The grading service is busy or has reached its usage limit. Your evidence is saved; retry later."
          : undefined;
    throw new InterviewGradingError(detail);
  } finally {
    lease.release();
  }
}
