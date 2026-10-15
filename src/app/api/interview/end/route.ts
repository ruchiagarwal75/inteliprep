import { interviewEndRequestSchema } from "@/lib/interview-end";
import { endInterview, InterviewGradingError } from "@/lib/end-interview";
import {
  InterviewSessionError,
  interviewSessionCheckpoint,
} from "@/lib/interview-sessions";
import { readJsonBody, withApiRequest } from "@/lib/api-request";
import { openSharedSession } from "@/lib/shared-interview-session";
import { BetaUnavailableError } from "@/lib/beta-config";

export const runtime = "nodejs";
export const maxDuration = 120;

async function end(request: Request): Promise<Response> {
  const body = await readJsonBody(request, 4_000_000);
  const parsed = interviewEndRequestSchema.safeParse(body);
  if (!parsed.success)
    return Response.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid interview evidence",
      },
      { status: 400 },
    );
  const shared = await openSharedSession(
    parsed.data.sessionId,
    parsed.data,
    parsed.data.resumeToken,
  );
  try {
    const scorecard = await endInterview(
      parsed.data,
      request.signal,
      shared.persist,
    );
    await shared.persist();
    return Response.json(
      {
        ended: true,
        scorecard,
        resumeToken: interviewSessionCheckpoint(
          parsed.data.sessionId,
          parsed.data,
        ).resumeToken,
      },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (cause) {
    let resumeToken: string | undefined;
    let ended = false;
    try {
      const checkpoint = interviewSessionCheckpoint(
        parsed.data.sessionId,
        parsed.data,
      );
      resumeToken = checkpoint.resumeToken;
      ended = checkpoint.ended;
    } catch {
      /* Another request may still hold the session. */
    }
    const status =
      cause instanceof InterviewSessionError
        ? cause.status
        : cause instanceof BetaUnavailableError
          ? 503
          : 502;
    return Response.json(
      {
        resumeToken,
        error:
          cause instanceof InterviewGradingError ||
          cause instanceof InterviewSessionError ||
          cause instanceof BetaUnavailableError
            ? cause.message
            : "Could not end the interview",
        ended:
          ended ||
          cause instanceof InterviewGradingError ||
          (cause instanceof InterviewSessionError && cause.ended),
      },
      { status },
    );
  } finally {
    await shared.release();
  }
}

export const POST = withApiRequest("end", "/api/interview/end", end);
