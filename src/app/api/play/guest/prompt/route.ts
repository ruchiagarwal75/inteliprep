import { z } from "zod";
import { playEndpoint } from "@/lib/play/api";
import { readJsonBody, ApiRequestError } from "@/lib/api-request";
import { currentPlayGuest } from "@/lib/play/guest-context";
import { recordGuestPrompt } from "@/lib/play/guest-events";
export const POST = playEndpoint(
  "/api/play/guest/prompt",
  async (request, userId) => {
    if (!currentPlayGuest())
      throw new ApiRequestError("This prompt is for guest practice.", 400);
    const parsed = z
      .strictObject({ reason: z.enum(["first_drill", "limit"]) })
      .safeParse(await readJsonBody(request, 1024));
    if (!parsed.success)
      throw new ApiRequestError("Choose a valid prompt.", 400);
    const { reason } = parsed.data;
    await recordGuestPrompt(userId, reason);
    return Response.json({ saved: true });
  },
);
