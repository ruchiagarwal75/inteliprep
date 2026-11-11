import { observeMockCompletion } from "@/lib/play/mock-hooks";
import { gradingResponse } from "@/lib/grading-response";
import type { GradingProgressListener } from "@/lib/grading-progress";
import { trackCurrentInterview } from "@/lib/interview-tracking";
import { setInterviewReference } from "@/lib/reporting-context";
import { interviewEndRequestSchema } from "@/lib/interview-end";
import { endInterview, InterviewGradingError } from "@/lib/end-interview";
import {
  InterviewSessionError,
  interviewSessionCheckpoint,
} from "@/lib/interview-sessions";
import { readJsonBody, withApiRequest } from "@/lib/api-request";
import { openSharedSession } from "@/lib/shared-interview-session";
import { BetaUnavailableError } from "@/lib/beta-config";
import { verifiedEndMessages } from "@/lib/interview-transcript";
import { getProblem } from "@/lib/problems";

export const runtime = "nodejs";
export const maxDuration = 210;

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
  if (!getProblem(parsed.data.problemId))
    return Response.json(
      { error: "Unknown interview problem" },
      { status: 404 },
    );
  setInterviewReference(parsed.data.sessionId);
  const shared = await openSharedSession(
    parsed.data.sessionId,
    parsed.data,
    parsed.data.resumeToken,
  );
  const complete = async (
    signal: AbortSignal,
    onProgress: GradingProgressListener,
  ) => {
    try {
      interviewSessionCheckpoint(
        parsed.data.sessionId,
        parsed.data,
        parsed.data.resumeToken,
      );
      const scorecard = await endInterview(
        {
          ...parsed.data,
          messages: verifiedEndMessages(
            parsed.data.sessionId,
            parsed.data.messages,
          ),
        },
        signal,
        async () => {
          await shared.persist();
          await trackCurrentInterview(parsed.data.sessionId, { grading: true });
        },
        onProgress,
      );
      await shared.persist();
      await trackCurrentInterview(parsed.data.sessionId);
      await observeMockCompletion(parsed.data.sessionId, scorecard);
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
          code: cause instanceof InterviewSessionError ? cause.code : undefined,
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
  };
  return gradingResponse(request, complete);
}

export const POST = withApiRequest("end", "/api/interview/end", end);
