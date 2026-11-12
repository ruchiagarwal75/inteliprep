import { z } from "zod";
import { playEndpoint } from "@/lib/play/api";
import { readJsonBody } from "@/lib/api-request";
import { seeCourseSlide } from "@/lib/play/course/visits";
const inputSchema = z
  .object({
    level: z.number().int().min(1).max(9),
    index: z.number().int().min(0).max(5),
  })
  .strict();
export const POST = playEndpoint(
  "/api/play/slides",
  async (request, userId) => {
    const input = inputSchema.safeParse(await readJsonBody(request, 1024));
    if (!input.success)
      return Response.json({ error: "Choose a valid slide." }, { status: 400 });
    return Response.json(
      await seeCourseSlide(userId, input.data.level, input.data.index),
    );
  },
);
