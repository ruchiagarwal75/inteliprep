import { requireCourseAttempt } from "@/lib/play/course/access";
import { readJsonBody } from "@/lib/api-request";
import { playEndpoint } from "@/lib/play/api";
import { submitRoundSchema } from "@/lib/play/public";
import { submitRoundAnswer } from "@/lib/play/submit";
export const runtime = "nodejs";
export const maxDuration = 60;
export const POST = playEndpoint(
  "/api/play/submit",
  async (request, userId) => {
    const input = submitRoundSchema.safeParse(
      await readJsonBody(request, 8192),
    );
    if (!input.success)
      return Response.json(
        { error: input.error.issues[0]?.message ?? "Invalid answer" },
        { status: 400 },
      );
    await requireCourseAttempt(userId, input.data.attemptId);
    if (input.data.answer.type !== "spot_flaw")
      return Response.json(
        { error: "Choose one of the four answers." },
        { status: 400 },
      );
    return Response.json(
      await submitRoundAnswer(
        userId,
        input.data.attemptId,
        input.data.answer,
        request.signal,
        input.data.revision,
      ),
    );
  },
);
