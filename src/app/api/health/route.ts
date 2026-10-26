import { randomUUID } from "node:crypto";
import { supabaseConfiguration } from "@/lib/supabase-config";
import { isPrivateBeta, missingBetaSettings } from "@/lib/beta-config";
import { hasApiKey } from "@/lib/openai-client";
import { redisCommand } from "@/lib/redis-rest";
import { logServerEvent } from "@/lib/server-events";

export const runtime = "nodejs";

/** Checks configuration and coordination, without making a paid model request. */
export async function GET(): Promise<Response> {
  const requestId = randomUUID();
  const configured = isPrivateBeta()
    ? missingBetaSettings().length === 0 && Boolean(supabaseConfiguration())
    : hasApiKey() && Boolean(supabaseConfiguration());
  let sharedStore = !isPrivateBeta();
  if (configured && isPrivateBeta()) {
    try {
      sharedStore = (await redisCommand(["PING"])) === "PONG";
    } catch {
      sharedStore = false;
    }
  }
  const ready = configured && sharedStore;
  const status = ready ? 200 : 503;
  logServerEvent({
    event: ready ? "api_request" : "api_failure",
    route: "/api/health",
    requestId,
    status,
  });
  return Response.json(
    {
      status: ready ? "ok" : "unavailable",
      checks: { configuration: configured, sharedStore },
    },
    {
      status,
      headers: { "Cache-Control": "no-store", "X-Request-Id": requestId },
    },
  );
}
