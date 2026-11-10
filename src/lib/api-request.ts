import "server-only";
import { randomUUID } from "node:crypto";
import { setReportingUser } from "@/lib/reporting-context";
import { requireCandidateIdentity } from "@/lib/candidate-auth";
import { withCandidateIdentity } from "@/lib/candidate-context";
import { CandidateAuthError } from "@/lib/supabase-config";
import { CandidateInviteError } from "@/lib/candidate-invites";
import { assertBetaReady, BetaUnavailableError } from "@/lib/beta-config";
import { checkRequestLimit, type RequestKind } from "@/lib/request-limits";
import { logServerEvent, withServerContext } from "@/lib/server-events";
import { InterviewSessionError } from "@/lib/interview-session-store";
import { withInterviewSessionContext } from "@/lib/interview-session-context";
import {
  CANDIDATE_AUTH_ERROR_HEADER,
  CANDIDATE_AUTH_REQUIRED,
  CANDIDATE_ACCOUNT_CHANGED,
} from "@/lib/candidate-api-error";

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
  options?: { deferLimit?: boolean },
) {
  return async (request: Request): Promise<Response> => {
    const requestId = randomUUID();
    return withServerContext(requestId, route, async () => {
      const startedAt = Date.now();
      let response: Response;
      let failure: unknown;
      let accountChanged = false;
      let failureStage:
        "configuration" | "identity_or_invite" | "request_limit" | "handler" =
        "configuration";
      try {
        const origin = request.headers.get("origin");
        if (origin && origin !== new URL(request.url).origin)
          throw new ApiRequestError(
            "This request must come from the interview site",
            403,
          );
        assertBetaReady();
        failureStage = "identity_or_invite";
        const candidateId =
          kind === "clientError"
            ? undefined
            : await requireCandidateIdentity({
                revalidateUser: kind === "start" || kind === "end",
              });
        setReportingUser(candidateId);
        const expectedAccount = request.headers.get("X-Interview-Account");
        if (expectedAccount && candidateId !== expectedAccount) {
          accountChanged = Boolean(candidateId);
          throw new ApiRequestError(
            "Your signed-in account changed. Please reopen the interview.",
            403,
          );
        }
        const run = async () => {
          failureStage = "request_limit";
          const retry = options?.deferLimit
            ? 0
            : await checkRequestLimit(request, kind);
          if (!retry) failureStage = "handler";
          return retry
            ? Response.json(
                {
                  error: "Too many requests. Please wait before trying again.",
                },
                { status: 429, headers: { "Retry-After": String(retry) } },
              )
            : await withInterviewSessionContext(() =>
                handler(request, requestId),
              );
        };
        response = candidateId
          ? await withCandidateIdentity(candidateId, run)
          : await run();
      } catch (cause) {
        failure = cause;
        const authError =
          cause instanceof CandidateAuthError && cause.status === 401
            ? CANDIDATE_AUTH_REQUIRED
            : accountChanged
              ? CANDIDATE_ACCOUNT_CHANGED
              : undefined;
        const status =
          cause instanceof ApiRequestError ||
          cause instanceof CandidateAuthError ||
          cause instanceof CandidateInviteError ||
          cause instanceof InterviewSessionError
            ? cause.status
            : cause instanceof BetaUnavailableError
              ? 503
              : 500;
        response = Response.json(
          {
            code:
              authError ??
              (cause instanceof CandidateInviteError
                ? "INVITE_REQUIRED"
                : undefined) ??
              (cause instanceof InterviewSessionError ? cause.code : undefined),
            error:
              status === 500 || !(cause instanceof Error)
                ? "The server couldn't complete this request. Please try again."
                : cause.message,
          },
          {
            status,
            headers: authError
              ? { [CANDIDATE_AUTH_ERROR_HEADER]: authError }
              : undefined,
          },
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
          ...(response.status >= 500 ? { failureStage } : {}),
        },
        failure,
      );
      return response;
    });
  };
}
