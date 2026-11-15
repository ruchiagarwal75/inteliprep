import {
  readJsonBody,
  withApiRequest,
  ApiRequestError,
} from "@/lib/api-request";
import { currentCandidateId } from "@/lib/candidate-context";
import { getProblem } from "@/lib/problems";
import { mockTrialCommandSchema } from "@/lib/mock-trial-public";
import { mockTrials, requestMockTrial } from "@/lib/mock-trial-store";
export const runtime = "nodejs";
function owner() {
  const id = currentCandidateId();
  if (!id) throw new ApiRequestError("Sign in to continue.", 401);
  return id;
}
export const GET = withApiRequest(
  "mockInterest",
  "/api/mock/requests",
  async () =>
    Response.json(await mockTrials(owner()), {
      headers: { "Cache-Control": "private, no-store" },
    }),
);
export const POST = withApiRequest(
  "mockInterest",
  "/api/mock/requests",
  async (request) => {
    const command = mockTrialCommandSchema.safeParse(
      await readJsonBody(request, 1024),
    );
    if (!command.success)
      throw new ApiRequestError("Choose a valid mock interview.", 400);
    if (!getProblem(command.data.problemId))
      throw new ApiRequestError("Mock interview not found.", 404);
    return Response.json(
      await requestMockTrial(owner(), command.data.problemId),
    );
  },
);
