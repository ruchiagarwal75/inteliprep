import { logServerEvent } from "@/lib/server-events";
import "server-only";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { AdminAccessError, requireAdminIdentity } from "@/lib/admin-auth";
import { ApiRequestError } from "@/lib/api-request";

function adminRequest(
  handler: (request: Request) => Promise<unknown>,
  write = false,
) {
  return async (request: Request) => {
    const requestId = randomUUID();
    const headers = {
      "Cache-Control": "private, no-store",
      "X-Request-Id": requestId,
    };
    try {
      await requireAdminIdentity();
      if (
        write &&
        request.headers.get("origin") !== new URL(request.url).origin
      )
        throw new ApiRequestError(
          "This request must come from the admin site.",
          403,
        );
      return Response.json(await handler(request), { headers });
    } catch (cause) {
      const status =
        cause instanceof AdminAccessError
          ? cause.status
          : cause instanceof ApiRequestError
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
            cause instanceof ApiRequestError
              ? cause.message
              : status === 400
                ? "Invalid admin input."
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
export function adminRead(handler: (request: Request) => Promise<unknown>) {
  return adminRequest(handler);
}
export function adminWrite(handler: (request: Request) => Promise<unknown>) {
  return adminRequest(handler, true);
}
