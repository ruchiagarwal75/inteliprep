import { z } from "zod";
import { readJsonBody, withApiRequest } from "@/lib/api-request";
import { currentCandidateId } from "@/lib/candidate-context";
import { recordProInterest } from "@/lib/mock-access-store";
export const runtime = "nodejs";
export const POST = withApiRequest(
  "feedback",
  "/api/mock/interest",
  async (request) => {
    if (
      !z.strictObject({}).safeParse(await readJsonBody(request, 1024)).success
    )
      return Response.json({ error: "Invalid request." }, { status: 400 });
    const userId = currentCandidateId();
    if (!userId)
      return Response.json({ error: "Sign in to continue." }, { status: 401 });
    return Response.json(await recordProInterest(userId));
  },
);
