import { z } from "zod";
import { playEndpoint } from "@/lib/play/api";
import { readJsonBody } from "@/lib/api-request";
import { courseLesson, seeCourseSlide } from "@/lib/play/course/visits";
import { MAX_COURSE_SLIDES } from "@/lib/play/course/slides-public";
const inputSchema = z
  .object({
    level: z.number().int().min(1).max(9),
    index: z
      .number()
      .int()
      .min(0)
      .max(MAX_COURSE_SLIDES - 1),
    lastViewedIndex: z
      .number()
      .int()
      .min(0)
      .max(MAX_COURSE_SLIDES - 1)
      .optional(),
  })
  .strict();
export const POST = playEndpoint(
  "/api/play/slides",
  async (request, userId) => {
    const input = inputSchema.safeParse(await readJsonBody(request, 1024));
    if (!input.success)
      return Response.json({ error: "Choose a valid slide." }, { status: 400 });
    return Response.json(
      await seeCourseSlide(
        userId,
        input.data.level,
        input.data.index,
        input.data.lastViewedIndex,
      ),
    );
  },
);
export const GET = playEndpoint("/api/play/slides", async (request, userId) => {
  const level = z.coerce
    .number()
    .int()
    .min(1)
    .max(9)
    .safeParse(new URL(request.url).searchParams.get("level"));
  if (!level.success)
    return Response.json({ error: "Choose a valid topic." }, { status: 400 });
  return Response.json(await courseLesson(userId, level.data));
});
