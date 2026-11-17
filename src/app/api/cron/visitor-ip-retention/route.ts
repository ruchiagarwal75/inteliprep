import { randomUUID, timingSafeEqual } from "node:crypto";
import { purgeExpiredVisitorIps } from "@/lib/ip-visitor-tracking";
import { logServerEvent } from "@/lib/server-events";
import { visitorIpRetentionSecret } from "@/lib/visitor-ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = randomUUID();
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Request-Id": requestId,
  };
  const secret = visitorIpRetentionSecret();
  if (!secret)
    return Response.json(
      { error: "Retention job is not configured." },
      { status: 503, headers },
    );
  const expected = Buffer.from(`Bearer ${secret}`);
  const supplied = Buffer.from(request.headers.get("authorization") ?? "");
  if (
    expected.length !== supplied.length ||
    !timingSafeEqual(expected, supplied)
  )
    return Response.json({ error: "Unauthorized." }, { status: 401, headers });
  try {
    const cleared = await purgeExpiredVisitorIps();
    return Response.json({ cleared }, { headers });
  } catch (cause) {
    logServerEvent(
      {
        event: "framework_failure",
        route: "/api/cron/visitor-ip-retention",
        requestId,
        status: 503,
        kind: "visitor_ip_retention_failed",
      },
      cause,
    );
    return Response.json(
      { error: "Retention job unavailable." },
      { status: 503, headers },
    );
  }
}
