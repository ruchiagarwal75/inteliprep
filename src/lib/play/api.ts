import "server-only";
import { ApiRequestError, withApiRequest } from "@/lib/api-request";
import { currentCandidateId } from "@/lib/candidate-context";
import { logServerEvent } from "@/lib/server-events";
import { PlayError } from "./errors";
export function playEndpoint(
  route: string,
  handler: (request: Request, userId: string) => Promise<Response>,
) {
  return withApiRequest("play", route, async (request) => {
    const userId = currentCandidateId();
    if (!userId)
      return Response.json({ error: "Sign in to practice." }, { status: 401 });
    try {
      return await handler(request, userId);
    } catch (cause) {
      const known =
          cause instanceof PlayError || cause instanceof ApiRequestError,
        status = known ? cause.status : 503;
      if (!known)
        logServerEvent(
          { event: "api_failure", route, status, kind: "play" },
          cause,
        );
      return Response.json(
        {
          error: known
            ? cause.message
            : "Practice is unavailable right now. Your saved answers are safe. Please retry.",
        },
        {
          status,
          headers:
            cause instanceof PlayError && cause.retryAfter
              ? { "Retry-After": String(cause.retryAfter) }
              : undefined,
        },
      );
    }
  });
}
