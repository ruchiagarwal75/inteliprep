import { z } from "zod";
import {
  ApiRequestError,
  readJsonBody,
  withApiRequest,
} from "@/lib/api-request";
import { currentCandidateId } from "@/lib/candidate-context";
import { topicRatingSchema } from "@/lib/play/topic-rating-public";
import { requireCourseRound } from "@/lib/play/course/access";
import { currentPlayGuest } from "@/lib/play/guest-context";
import {
  saveTopicRating,
  topicRatingStatus,
} from "@/lib/play/topic-rating-store";

export const runtime = "nodejs";
function owner() {
  const id = currentCandidateId();
  if (!id) throw new ApiRequestError("Sign in to send feedback.", 401);
  return id;
}
export const GET = withApiRequest(
  "resume",
  "/api/play/topic-rating",
  async (request) => {
    const id = z
      .uuid()
      .safeParse(new URL(request.url).searchParams.get("sessionId"));
    if (!id.success) throw new ApiRequestError("Choose a valid quiz.", 400);
    if (currentPlayGuest()) await requireCourseRound(owner(), id.data);
    return Response.json(await topicRatingStatus(owner(), id.data));
  },
  { allowPlayGuest: true },
);
export const POST = withApiRequest(
  "feedback",
  "/api/play/topic-rating",
  async (request) => {
    const input = topicRatingSchema.safeParse(
      await readJsonBody(request, 1024),
    );
    if (!input.success)
      throw new ApiRequestError(
        "Feedback request wasn't valid. Please try again.",
        400,
      );
    if (currentPlayGuest())
      await requireCourseRound(owner(), input.data.sessionId);
    return Response.json(await saveTopicRating(owner(), input.data));
  },
  { allowPlayGuest: true },
);
