import {
  requireCourseTopic,
  requireCourseRound,
} from "@/lib/play/course/access";
import { z } from "zod";
import { readJsonBody } from "@/lib/api-request";
import { playEndpoint } from "@/lib/play/api";
import { startRoundInputSchema } from "@/lib/play/public";
import { getRound, startRound } from "@/lib/play/rounds";
export const runtime = "nodejs";
export const POST = playEndpoint("/api/play/round", async (request, userId) => {
  const input = startRoundInputSchema.safeParse(
    await readJsonBody(request, 4096),
  );
  if (!input.success)
    return Response.json(
      { error: input.error.issues[0]?.message ?? "Invalid round" },
      { status: 400 },
    );
  requireCourseTopic(input.data.topic);
  return Response.json(await startRound(userId, input.data));
});
export const GET = playEndpoint("/api/play/round", async (request, userId) => {
  const id = z
    .uuid()
    .safeParse(new URL(request.url).searchParams.get("sessionId"));
  if (!id.success)
    return Response.json({ error: "Choose a valid round." }, { status: 400 });
  await requireCourseRound(userId, id.data);
  return Response.json(await getRound(userId, id.data));
});
