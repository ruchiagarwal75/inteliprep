import { logServerEvent } from "@/lib/server-events";
import "server-only";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { AdminAccessError, requireAdminIdentity } from "@/lib/admin-auth";
export function adminRead(handler: (request: Request) => Promise<unknown>) {
  return async (request: Request) => {
    const requestId = randomUUID();
    const headers = {
      "Cache-Control": "private, no-store",
      "X-Request-Id": requestId,
    };
    try {
      await requireAdminIdentity();
      return Response.json(await handler(request), { headers });
    } catch (cause) {
      const status =
        cause instanceof AdminAccessError
          ? cause.status
          : cause instanceof z.ZodError
            ? 400
            : 503;
      if (status === 503)
        logServerEvent(
          {
            event: "framework_failure",
            requestId,
            route: new URL(request.url).pathname,
            status: 503,
          },
          cause,
        );
      return Response.json(
        {
          error:
            status === 400
              ? "Invalid admin filter."
              : status === 503
                ? "Reporting unavailable. Check server configuration and logs."
                : "Admin access is restricted.",
          referenceId: requestId,
        },
        { status, headers },
      );
    }
  };
}
