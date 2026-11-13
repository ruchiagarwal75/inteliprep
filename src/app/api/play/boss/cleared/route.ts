import { z } from "zod";
import { readJsonBody } from "@/lib/api-request";
import { playEndpoint } from "@/lib/play/api";
import { claimBossWorldCleared } from "@/lib/boss-cleared";
export const runtime = "nodejs";
export const POST = playEndpoint(
  "/api/play/boss/cleared",
  async (request, userId) => {
    if (
      !z.strictObject({}).safeParse(await readJsonBody(request, 1024)).success
    )
      return Response.json({ error: "Invalid request." }, { status: 400 });
    return Response.json(await claimBossWorldCleared(userId));
  },
);
