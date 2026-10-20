import "server-only";
import { randomUUID } from "node:crypto";
import { assertBetaReady, BetaUnavailableError } from "@/lib/beta-config";
import { checkRequestLimit, type RequestKind } from "@/lib/request-limits";
import { logServerEvent, withServerContext } from "@/lib/server-events";
import { InterviewSessionError } from "@/lib/interview-session-store";
import { withInterviewSessionContext } from "@/lib/interview-session-context";

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

/** Enforce the actual byte limit even with a missing or dishonest Content-Length. */
export async function readJsonBody(
  request: Request,
  maxBytes: number,
): Promise<unknown> {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    throw new ApiRequestError("Content-Type must be application/json", 415);
  if (Number(request.headers.get("content-length")) > maxBytes)
    throw new ApiRequestError("Request is too large", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new ApiRequestError("Body must be valid JSON", 400);
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > maxBytes) {
        void reader.cancel().catch(() => {});
        throw new ApiRequestError("Request is too large", 413);
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } catch (cause) {
    if (cause instanceof ApiRequestError) throw cause;
    throw new ApiRequestError("Body must be valid JSON", 400);
  } finally {
    reader.releaseLock();
  }
}

export function withApiRequest(
  kind: RequestKind,
  route: string,
  handler: (request: Request, requestId: string) => Promise<Response>,
) {
  return async (request: Request): Promise<Response> => {
    const requestId = randomUUID();
    const startedAt = Date.now();
    let response: Response;
    let failure: unknown;
    try {
      const origin = request.headers.get("origin");
      if (origin && origin !== new URL(request.url).origin)
        throw new ApiRequestError(
          "This request must come from the interview site",
          403,
        );
      assertBetaReady();
      const retry = await checkRequestLimit(request, kind);
      response = retry
        ? Response.json(
            { error: "Too many requests. Please wait before trying again." },
            { status: 429, headers: { "Retry-After": String(retry) } },
          )
        : await withServerContext(requestId, route, () =>
            withInterviewSessionContext(() => handler(request, requestId)),
          );
    } catch (cause) {
      failure = cause;
      const status =
        cause instanceof ApiRequestError ||
        cause instanceof InterviewSessionError
          ? cause.status
          : cause instanceof BetaUnavailableError
            ? 503
            : 500;
      response = Response.json(
        {
          error:
            status === 500 || !(cause instanceof Error)
              ? "The server couldn't complete this request. Please try again."
              : cause.message,
        },
        { status },
      );
    }
    response.headers.set("X-Request-Id", requestId);
    response.headers.set("Cache-Control", "no-store");
    logServerEvent(
      {
        event: response.status >= 500 ? "api_failure" : "api_request",
        requestId,
        route,
        status: response.status,
        durationMs: Date.now() - startedAt,
      },
      failure,
    );
    return response;
  };
}
