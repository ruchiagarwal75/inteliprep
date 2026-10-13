import { interviewEndRequestSchema } from "@/lib/interview-end";
import { endInterview, InterviewGradingError } from "@/lib/end-interview";
import {
  InterviewSessionError,
  interviewSessionCheckpoint,
} from "@/lib/interview-sessions";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body must be valid JSON" }, { status: 400 });
  }
  const parsed = interviewEndRequestSchema.safeParse(body);
  if (!parsed.success)
    return Response.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid interview evidence",
      },
      { status: 400 },
    );
  try {
    const scorecard = await endInterview(parsed.data, request.signal);
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
    try {
      resumeToken = interviewSessionCheckpoint(
        parsed.data.sessionId,
        parsed.data,
      ).resumeToken;
    } catch {
      /* Another request may still hold the session. */
    }
    const status = cause instanceof InterviewSessionError ? cause.status : 502;
    return Response.json(
      {
        resumeToken,
        error:
          cause instanceof Error
            ? cause.message
            : "Could not end the interview",
        ended:
          cause instanceof InterviewGradingError ||
          (cause instanceof InterviewSessionError && cause.ended),
      },
      { status },
    );
  }
}
