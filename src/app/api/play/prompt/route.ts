import { z } from "zod";
import { readJsonBody } from "@/lib/api-request";
import { playEndpoint } from "@/lib/play/api";
import { markMockPromptSeen } from "@/lib/play/readiness-store";
const inputSchema = z
  .object({ topic: z.string().regex(/^[a-z0-9-]{1,80}$/u) })
  .strict();
export const POST = playEndpoint(
  "/api/play/prompt",
  async (request, userId) => {
    const input = inputSchema.safeParse(await readJsonBody(request, 1024));
    if (!input.success)
      return Response.json({ error: "Choose a valid topic." }, { status: 400 });
    return Response.json(await markMockPromptSeen(userId, input.data.topic));
  },
);
