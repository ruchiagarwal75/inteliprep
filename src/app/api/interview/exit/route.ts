import { z } from "zod";
import { readJsonBody, withApiRequest } from "@/lib/api-request";
import { currentCandidateId } from "@/lib/candidate-context";
import { explicitlyExitInterview } from "@/lib/interview-exit";
import { setInterviewReference } from "@/lib/reporting-context";
export const runtime = "nodejs";
export const POST = withApiRequest(
  "resume",
  "/api/interview/exit",
  async (request) => {
    const input = z
      .strictObject({ sessionId: z.uuid() })
      .safeParse(await readJsonBody(request, 2048));
    if (!input.success)
      return Response.json(
        { error: "Invalid interview reference" },
        { status: 400 },
      );
    const userId = currentCandidateId();
    if (!userId)
      return Response.json({ error: "Sign in required" }, { status: 401 });
    setInterviewReference(input.data.sessionId);
    const result = await explicitlyExitInterview(input.data.sessionId, userId);
    return result
      ? Response.json(result)
      : Response.json(
          { error: "No recorded interview for this account" },
          { status: 404 },
        );
  },
);
