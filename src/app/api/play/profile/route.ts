import { readJsonBody, withApiRequest } from "@/lib/api-request";
import { currentCandidateId } from "@/lib/candidate-context";
import { profileInputSchema, updatePlayer } from "@/lib/play/player";
export const runtime = "nodejs";
export const POST = withApiRequest(
  "resume",
  "/api/play/profile",
  async (request) => {
    const parsed = profileInputSchema.safeParse(
      await readJsonBody(request, 2048),
    );
    if (!parsed.success)
      return Response.json(
        {
          error: parsed.error.issues[0]?.message ?? "Invalid practice settings",
        },
        { status: 400 },
      );
    const userId = currentCandidateId();
    if (!userId)
      return Response.json({ error: "Sign in to practice" }, { status: 401 });
    return Response.json(await updatePlayer(userId, parsed.data));
  },
);
