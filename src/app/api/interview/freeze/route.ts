import { trackCurrentInterview } from "@/lib/interview-tracking";
import { setInterviewReference } from "@/lib/reporting-context";
import { interviewEndRequestSchema } from "@/lib/interview-end";
import { readJsonBody, withApiRequest } from "@/lib/api-request";
import { openSharedSession } from "@/lib/shared-interview-session";
import {
  acquireInterviewEnd,
  interviewSessionCheckpoint,
  InterviewSessionError,
} from "@/lib/interview-sessions";
import { verifiedEndMessages } from "@/lib/interview-transcript";

export const runtime = "nodejs";
async function freeze(request: Request) {
  const parsed = interviewEndRequestSchema.safeParse(
    await readJsonBody(request, 4_000_000),
  );
  if (!parsed.success)
    return Response.json(
      { error: "Invalid interview evidence" },
      { status: 400 },
    );
  const input = parsed.data;
  setInterviewReference(parsed.data.sessionId);
  const shared = await openSharedSession(
    input.sessionId,
    input,
    input.resumeToken,
  );
  try {
    const lease = acquireInterviewEnd(
      input.sessionId,
      input,
      {
        messages: verifiedEndMessages(input.sessionId, input.messages),
        scene: input.scene,
        diagramImage: input.diagramImage,
      },
      input.resumeToken,
    );
    const endedAt = lease.endedAt;
    lease.release();
    await shared.persist();
    await trackCurrentInterview(input.sessionId, { grading: true });
    const checkpoint = interviewSessionCheckpoint(input.sessionId, input);
    return Response.json(
      { ended: true, endedAt, resumeToken: checkpoint.resumeToken },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (cause) {
    if (cause instanceof InterviewSessionError)
      return Response.json(
        { error: cause.message, code: cause.code, ended: cause.ended },
        { status: cause.status },
      );
    throw cause;
  } finally {
    await shared.release();
  }
}
// Freezing calls no model; it must not consume grading/model quotas.
export const POST = withApiRequest("resume", "/api/interview/freeze", freeze);
