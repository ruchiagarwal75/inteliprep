import { readJsonBody } from "@/lib/api-request";
import { playEndpoint } from "@/lib/play/api";
import { chestInputSchema } from "@/lib/play/public";
import { openChest } from "@/lib/play/chests";
export const runtime = "nodejs";
export const POST = playEndpoint("/api/play/chest", async (request, userId) => {
  const input = chestInputSchema.safeParse(await readJsonBody(request, 2048));
  if (!input.success)
    return Response.json({ error: "Choose a valid chest." }, { status: 400 });
  return Response.json(
    await openChest(userId, input.data.topic, input.data.afterLevel),
  );
});
