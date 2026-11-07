import { randomUUID } from "node:crypto";
import { z } from "zod";
import { candidateIdentity } from "@/lib/candidate-auth";
import { readJsonBody, ApiRequestError } from "@/lib/api-request";
import { checkRequestLimit } from "@/lib/request-limits";
import { deferReporting } from "@/lib/reporting-write";
import { trackAppViewer } from "@/lib/viewer-tracking";
import { logServerEvent, withServerContext } from "@/lib/server-events";
export const runtime = "nodejs";
const input = z.object({ visitorId: z.uuid() }).strict();

/** Public first-party write only. Read access remains restricted to the configured admin. */
export async function POST(request: Request) {
  const requestId = randomUUID();
  const path = "/api/monitoring/viewer";
  return withServerContext(requestId, path, async () => {
    const headers = { "Cache-Control": "no-store", "X-Request-Id": requestId };
    let response: Response;
    try {
      const url = new URL(request.url);
      const origin = request.headers.get("origin");
      if (
        (origin && origin !== url.origin) ||
        request.headers.get("sec-fetch-site") === "cross-site"
      )
        throw new ApiRequestError("Same-origin request required", 403);
      const parsed = input.safeParse(await readJsonBody(request, 256));
      if (!parsed.success)
        throw new ApiRequestError("Invalid visitor record", 400);
      const retry = await checkRequestLimit(request, "viewer");
      if (retry)
        response = new Response(null, {
          status: 429,
          headers: { ...headers, "Retry-After": String(retry) },
        });
      else {
        const userId = await candidateIdentity();
        const local = ["localhost", "127.0.0.1", "[::1]"].includes(
          url.hostname,
        );
        deferReporting(() =>
          trackAppViewer(parsed.data.visitorId, userId, local),
        );
        response = new Response(null, { status: 204, headers });
      }
    } catch (cause) {
      response = Response.json(
        { error: "Visitor tracking unavailable" },
        {
          status: cause instanceof ApiRequestError ? cause.status : 503,
          headers,
        },
      );
    }
    logServerEvent({
      event: response.ok ? "api_request" : "api_failure",
      requestId,
      route: path,
      status: response.status,
    });
    return response;
  });
}
