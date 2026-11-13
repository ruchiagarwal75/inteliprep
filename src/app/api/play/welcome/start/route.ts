import { readJsonBody } from "@/lib/api-request";
import { playEndpoint } from "@/lib/play/api";
import { welcomeStartSchema } from "@/lib/play/welcome-public";
import { openWelcome } from "@/lib/play/welcome-store";
export const runtime = "nodejs";
export const POST = playEndpoint(
  "/api/play/welcome/start",
  async (request, userId) => {
    const parsed = welcomeStartSchema.safeParse(
      await readJsonBody(request, 2048),
    );
    if (!parsed.success)
      return Response.json(
        { error: "Please reopen the intro and try again." },
        { status: 400 },
      );
    return Response.json({
      runId: await openWelcome(
        userId,
        parsed.data.replay,
        parsed.data.requestId,
      ),
    });
  },
);
