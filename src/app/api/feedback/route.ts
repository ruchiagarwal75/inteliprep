import { z } from "zod";
import {
  ApiRequestError,
  readJsonBody,
  withApiRequest,
} from "@/lib/api-request";
import { practiceFeedbackSchema } from "@/lib/practice-feedback";
import { feedbackHandled, savePracticeFeedback } from "@/lib/feedback-store";

export const runtime = "nodejs";
export const POST = withApiRequest(
  "feedback",
  "/api/feedback",
  async (request) => {
    const input = practiceFeedbackSchema.safeParse(
      await readJsonBody(request, 4096),
    );
    if (!input.success)
      throw new ApiRequestError(
        "Choose an answer or add a comment of up to 2,000 characters. Check the feedback details and try again.",
        400,
      );
    return Response.json(await savePracticeFeedback(input.data));
  },
);

// A separate read quota prevents refreshes from consuming the five-send limit.
export const GET = withApiRequest(
  "resume",
  "/api/feedback",
  async (request) => {
    const id = z
      .uuid()
      .safeParse(new URL(request.url).searchParams.get("interviewId"));
    if (!id.success) throw new ApiRequestError("Invalid interview.", 400);
    return Response.json({ handled: await feedbackHandled(id.data) });
  },
);
