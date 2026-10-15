import { interviewStartRequestSchema } from "@/lib/interview-selection";
import { createInterviewStart, getProblem } from "@/lib/problems";
import { InterviewSessionError } from "@/lib/interview-sessions";
import { readJsonBody, withApiRequest } from "@/lib/api-request";
import { publishNewSession } from "@/lib/shared-interview-session";

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
    const interview = createInterviewStart(
      problem,
      parsed.data.level,
      parsed.data.durationMinutes,
    );
    await publishNewSession(interview.sessionId);
    return Response.json(interview, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (cause) {
    if (cause instanceof InterviewSessionError)
      return Response.json({ error: cause.message }, { status: cause.status });
    throw cause;
  }
}

export const POST = withApiRequest("start", "/api/interview/start", start);
