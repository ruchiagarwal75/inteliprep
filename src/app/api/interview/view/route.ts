import { z } from "zod";
import {
  readJsonBody,
  withApiRequest,
  ApiRequestError,
} from "@/lib/api-request";
import { currentCandidateId } from "@/lib/candidate-context";
import { recordScorecardOpened } from "@/lib/beta-funnel-tracking";
export const runtime = "nodejs";
const input = z.strictObject({ interviewId: z.uuid() });
export const POST = withApiRequest(
  "resume",
  "/api/interview/view",
  async (request) => {
    const parsed = input.safeParse(await readJsonBody(request, 512));
    if (!parsed.success) throw new ApiRequestError("Invalid interview.", 400);
    const userId = currentCandidateId();
    if (!userId) throw new ApiRequestError("Sign in to continue.", 401);
    if (!(await recordScorecardOpened(userId, parsed.data.interviewId)))
      throw new ApiRequestError("Scorecard not found.", 404);
    return new Response(null, { status: 204 });
  },
);
