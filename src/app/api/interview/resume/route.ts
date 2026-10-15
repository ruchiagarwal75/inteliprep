import { interviewResumeRequestSchema } from "@/lib/interview-resume";
import {
  interviewSessionCheckpoint,
  InterviewSessionError,
} from "@/lib/interview-sessions";
import { getProblem } from "@/lib/problems";
import { publicPhase } from "@/lib/phase-config";
import { readJsonBody, withApiRequest } from "@/lib/api-request";
import { openSharedSession } from "@/lib/shared-interview-session";

export const runtime = "nodejs";

async function resume(request: Request): Promise<Response> {
  const body = await readJsonBody(request, 32_768);
  const parsed = interviewResumeRequestSchema.safeParse(body);
  if (!parsed.success)
    return Response.json({ error: "Invalid saved interview" }, { status: 400 });
  const problem = getProblem(parsed.data.problemId);
  if (!problem)
    return Response.json(
      { error: "Unknown interview problem" },
      { status: 404 },
    );
  const shared = await openSharedSession(
    parsed.data.sessionId,
    parsed.data,
    parsed.data.resumeToken,
  );
  try {
    const checkpoint = interviewSessionCheckpoint(
      parsed.data.sessionId,
      parsed.data,
      parsed.data.resumeToken,
    );
    if (!problem.phases[checkpoint.phaseIndex])
      throw new InterviewSessionError(
        "The saved interview uses an older stage configuration.",
        409,
      );
    await shared.persist();
    return Response.json(
      {
        phase: publicPhase(problem.phases, checkpoint.phaseIndex),
        resumeToken: checkpoint.resumeToken,
        ended: checkpoint.ended,
        timing: checkpoint.timing,
        serverTime: checkpoint.serverTime,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (cause) {
    if (!(cause instanceof InterviewSessionError)) throw cause;
    return Response.json({ error: cause.message }, { status: cause.status });
  } finally {
    await shared.release();
  }
}

export const POST = withApiRequest("resume", "/api/interview/resume", resume);
