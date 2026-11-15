import {
  readJsonBody,
  withApiRequest,
  ApiRequestError,
} from "@/lib/api-request";
import { currentCandidateId } from "@/lib/candidate-context";
import { getProblem } from "@/lib/problems";
import { mockTrialViewsSchema } from "@/lib/mock-trial-public";
import { recordMockViews } from "@/lib/mock-trial-store";
export const POST = withApiRequest(
  "mockInterest",
  "/api/mock/views",
  async (request) => {
    const parsed = mockTrialViewsSchema.safeParse(
      await readJsonBody(request, 4096),
    );
    if (!parsed.success) throw new ApiRequestError("Invalid mock views.", 400);
    if (parsed.data.problemIds.some((id) => !getProblem(id)))
      throw new ApiRequestError("Mock interview not found.", 404);
    const userId = currentCandidateId();
    if (!userId) throw new ApiRequestError("Sign in to continue.", 401);
    return Response.json(await recordMockViews(userId, parsed.data.problemIds));
  },
);
