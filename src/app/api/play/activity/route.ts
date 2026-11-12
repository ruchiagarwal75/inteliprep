import { requireCourseAttempt } from "@/lib/play/course/access";
import { readJsonBody } from "@/lib/api-request";
import { playEndpoint } from "@/lib/play/api";
import { drillActivitySchema } from "@/lib/play/public";
import { recordDrillActivity } from "@/lib/play/drill-activity";
export const runtime = "nodejs";
export const POST = playEndpoint(
  "/api/play/activity",
  async (request, userId) => {
    const input = drillActivitySchema.safeParse(
      await readJsonBody(request, 1024),
    );
    if (!input.success)
      return Response.json(
        { error: "Choose the current drill." },
        { status: 400 },
      );
    await requireCourseAttempt(userId, input.data.attemptId);
    return Response.json(
      await recordDrillActivity(
        userId,
        input.data.attemptId,
        input.data.revision,
        input.data.visible,
      ),
    );
  },
);
