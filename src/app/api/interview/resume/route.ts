import { interviewResumeRequestSchema } from "@/lib/interview-resume";
import {
  interviewSessionCheckpoint,
  InterviewSessionError,
} from "@/lib/interview-sessions";
import { getProblem } from "@/lib/problems";
import { publicPhase } from "@/lib/phase-config";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body must be valid JSON" }, { status: 400 });
  }
  const parsed = interviewResumeRequestSchema.safeParse(body);
  if (!parsed.success)
    return Response.json({ error: "Invalid saved interview" }, { status: 400 });
  const problem = getProblem(parsed.data.problemId);
  if (!problem)
    return Response.json(
      { error: "Unknown interview problem" },
      { status: 404 },
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
  }
}
