import { readJsonBody } from "@/lib/api-request";
import { playEndpoint } from "@/lib/play/api";
import { welcomeFinishSchema } from "@/lib/play/welcome-public";
import { finishWelcome } from "@/lib/play/welcome-store";
export const runtime = "nodejs";
export const POST = playEndpoint(
  "/api/play/welcome",
  async (request, userId) => {
    const parsed = welcomeFinishSchema.safeParse(
      await readJsonBody(request, 2048),
    );
    if (!parsed.success)
      return Response.json(
        { error: "Please reopen the intro and try again." },
        { status: 400 },
      );
    await finishWelcome(userId, parsed.data);
    return Response.json({ saved: true });
  },
);
