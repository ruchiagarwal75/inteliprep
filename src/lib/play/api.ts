import { roundGuardComplete, withRoundTiming } from "./round-timing";
import { PlayGradingError, playFailureDetails } from "./grading-error";
import "server-only";
import { AiBudgetError } from "@/lib/ai-budget-config";
import { ApiRequestError, withApiRequest } from "@/lib/api-request";
import { currentCandidateId } from "@/lib/candidate-context";
import { logServerEvent } from "@/lib/server-events";
import { PlayError } from "./errors";
export function playEndpoint(
  route: string,
  handler: (request: Request, userId: string) => Promise<Response>,
) {
  const guarded = withApiRequest("play", route, async (request) => {
    roundGuardComplete();
    const userId = currentCandidateId();
    if (!userId)
      return Response.json({ error: "Sign in to practice." }, { status: 401 });
    try {
      return await handler(request, userId);
    } catch (cause) {
      const known =
          cause instanceof AiBudgetError ||
          cause instanceof PlayError ||
          cause instanceof ApiRequestError,
        status = known ? cause.status : 503;
      if (!known) {
        const details = playFailureDetails(cause);
        logServerEvent(
          {
            event: "api_failure",
            route,
            status,
            kind: "play",
            ...details.fields,
          },
          details.original,
        );
      }
      return Response.json(
        {
          error:
            known || cause instanceof PlayGradingError
              ? cause.message
              : "Practice is unavailable right now. Your saved answers are safe. Please retry.",
        },
        {
          status,
          headers:
            (cause instanceof PlayError || cause instanceof AiBudgetError) &&
            cause.retryAfter
              ? { "Retry-After": String(cause.retryAfter) }
              : undefined,
        },
      );
    }
  });
  return route === "/api/play/round"
    ? (request: Request) =>
        request.method === "POST"
          ? withRoundTiming(() => guarded(request))
          : guarded(request)
    : guarded;
}
