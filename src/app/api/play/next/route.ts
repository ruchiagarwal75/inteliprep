import { requireCourseRound } from "@/lib/play/course/access";
import { readJsonBody } from "@/lib/api-request";
import { playEndpoint } from "@/lib/play/api";
import { advanceRoundSchema } from "@/lib/play/public";
import { advanceRound } from "@/lib/play/rounds";
export const runtime = "nodejs";
export const POST = playEndpoint("/api/play/next", async (request, userId) => {
  const input = advanceRoundSchema.safeParse(await readJsonBody(request, 1024));
  if (!input.success)
    return Response.json(
      { error: "Choose a valid round and drill." },
      { status: 400 },
    );
  await requireCourseRound(userId, input.data.sessionId);
  return Response.json(
    await advanceRound(userId, input.data.sessionId, input.data.afterAttemptId),
  );
});
