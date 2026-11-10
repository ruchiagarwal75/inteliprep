import { randomUUID } from "node:crypto";
import { supabaseConfiguration } from "@/lib/supabase-config";
import { usesSharedStore, missingBetaSettings } from "@/lib/beta-config";
import { hasApiKey } from "@/lib/openai-client";
import { redisCommand } from "@/lib/redis-rest";
import { logServerEvent } from "@/lib/server-events";

export const runtime = "nodejs";

/** Checks configuration and coordination, without making a paid model request. */
export async function GET(): Promise<Response> {
  const requestId = randomUUID();
  const configured = usesSharedStore()
    ? missingBetaSettings().length === 0 && Boolean(supabaseConfiguration())
    : hasApiKey() && Boolean(supabaseConfiguration());
  let sharedStore = !usesSharedStore();
  if (configured && usesSharedStore()) {
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
    checks: { configuration: configured, sharedStore },
  });
  return Response.json(
    {
      status: ready ? "ok" : "unavailable",
    },
    {
      status,
      headers: { "Cache-Control": "no-store", "X-Request-Id": requestId },
    },
  );
}
