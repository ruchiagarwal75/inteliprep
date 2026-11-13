import { observeMockStart } from "@/lib/play/mock-hooks";
import { randomUUID } from "node:crypto";
import {
  MockStartAccessError,
  withMockStartAccess,
} from "@/lib/mock-start-access";
import { trackInterview } from "@/lib/interview-tracking";
import { requireTestInterviewAccess } from "@/lib/test-interview-access";
import { setInterviewReference } from "@/lib/reporting-context";
import { interviewStartRequestSchema } from "@/lib/interview-selection";
import { getProblem } from "@/lib/problems";
import { InterviewSessionError } from "@/lib/interview-sessions";
import { readJsonBody, withApiRequest } from "@/lib/api-request";
import {
  idempotentInterviewStart,
  InterviewStartLimit,
} from "@/lib/idempotent-interview-start";

export const runtime = "nodejs";

async function start(request: Request): Promise<Response> {
  const body = await readJsonBody(request, 32_768);
  const parsed = interviewStartRequestSchema.safeParse(body);
  if (!parsed.success)
    return Response.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid interview selection",
      },
      { status: 400 },
    );
  const problem = getProblem(parsed.data.problemId);
  if (!problem)
    return Response.json(
      { error: "Unknown interview problem" },
      { status: 404 },
    );
  try {
    const requestId = parsed.data.requestId ?? randomUUID();
    const { interview, created, record } = await withMockStartAccess(
      { ...parsed.data, requestId },
      async (expectedSessionId) => {
        await requireTestInterviewAccess(parsed.data.durationMinutes);
        return idempotentInterviewStart(
          request,
          problem,
          parsed.data.level,
          parsed.data.durationMinutes,
          requestId,
          expectedSessionId,
        );
      },
    );
    setInterviewReference(
      interview.sessionId,
      interview.timing?.durationMinutes === 1,
    );
    if (created && record) {
      await trackInterview(record, { started: true });
      await observeMockStart(
        request,
        interview.sessionId,
        parsed.data.problemId,
        parsed.data.level,
      );
    }
    return Response.json(interview, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (cause) {
    if (cause instanceof MockStartAccessError)
      return Response.json(
        { error: cause.message, code: cause.code },
        { status: cause.status },
      );
    if (cause instanceof InterviewStartLimit)
      return Response.json(
        { error: cause.message },
        { status: 429, headers: { "Retry-After": String(cause.retryAfter) } },
      );
    if (cause instanceof InterviewSessionError)
      return Response.json(
        { error: cause.message, code: cause.code },
        { status: cause.status },
      );
    throw cause;
  }
}

export const POST = withApiRequest("start", "/api/interview/start", start, {
  deferLimit: true,
});
