import "server-only";
import { randomUUID } from "node:crypto";
import type {
  Response,
  ResponseCreateParamsNonStreaming,
  ResponseCreateParamsStreaming,
  ResponseStreamEvent,
} from "openai/resources/responses/responses";
type RequestOptions = {
  signal?: AbortSignal;
  timeout?: number;
  maxRetries?: number;
};
import { APIError } from "openai";
import { z } from "zod";
import { createOpenAIClient } from "@/lib/openai-client";
import { reportingContext } from "@/lib/reporting-context";
import { recordAiCall, type AiObservation } from "@/lib/reporting-ai";
import { recordFailure, failureCategory } from "@/lib/reporting-failures";
import { logServerEvent } from "@/lib/server-events";
import { cacheableInterviewerRequest } from "@/lib/interviewer-cache";

type Operation = "reply" | "assessment" | "question_review" | "feedback";
export function observedModelRequest(
  operation: Operation,
  params: ResponseCreateParamsStreaming,
  options?: RequestOptions,
): Promise<AsyncIterable<ResponseStreamEvent>>;
export function observedModelRequest(
  operation: Operation,
  params: ResponseCreateParamsNonStreaming,
  options?: RequestOptions,
): Promise<Response>;
export async function observedModelRequest(
  operation: Operation,
  params: ResponseCreateParamsStreaming | ResponseCreateParamsNonStreaming,
  options?: RequestOptions,
): Promise<Response | AsyncIterable<ResponseStreamEvent>> {
  const context = reportingContext();
  const started = Date.now();
  if (context) context.failureReferenceId = undefined;
  const call: AiObservation | undefined = context
    ? {
        id: randomUUID(),
        context: { ...context },
        operation,
        model: params.model ?? "unknown",
        startedAt: new Date().toISOString(),
        status: "pending",
      }
    : undefined;
  if (call) await recordAiCall(call);
  const finish = async (
    status: AiObservation["status"],
    response?: Response,
    errorUsage?: unknown,
    providerRequestId?: string,
  ) => {
    logServerEvent({
      event: "model_call_complete",
      kind: operation + ":" + status,
      model: response?.model ?? params.model ?? "unknown",
      durationMs: Date.now() - started,
      inputTokens: response?.usage?.input_tokens,
      outputTokens: response?.usage?.output_tokens,
      cachedTokens: response?.usage?.input_tokens_details?.cached_tokens,
      reasoningTokens: response?.usage?.output_tokens_details?.reasoning_tokens,
    });
    if (!call) return;
    await recordAiCall({
      ...call,
      status,
      finishedAt: new Date().toISOString(),
      model: response?.model ?? call.model,
      usage: response?.usage ?? errorUsage,
      providerRequestId: response?.id ?? providerRequestId,
    });
  };
  const failure = async (cause: unknown) => {
    if (!call) return;
    const referenceId =
      cause instanceof APIError ? (cause.requestID ?? call.id) : call.id;
    if (context) context.failureReferenceId = referenceId;
    await recordFailure(
      {
        operation: operation === "feedback" ? "feedback" : "ai_response",
        category: failureCategory(cause),
        referenceId,
      },
      call.context,
    );
  };
  try {
    const client = createOpenAIClient();
    if (!params.stream) {
      const response = await client.responses.create(
        operation === "reply" || operation === "question_review"
          ? cacheableInterviewerRequest(params)
          : params,
        options,
      );
      await finish(
        response.status === "completed" ? "completed" : "failed",
        response,
      );
      if (response.status !== "completed")
        await failure(new Error("Incomplete model output"));
      return response;
    }
    const stream = await client.responses.create(
      operation === "reply" || operation === "question_review"
        ? cacheableInterviewerRequest(params)
        : params,
      options,
    );
    return (async function* () {
      let response: Response | undefined;
      let status: AiObservation["status"] = "cancelled";
      try {
        for await (const event of stream) {
          if (
            event.type === "response.completed" ||
            event.type === "response.failed" ||
            event.type === "response.incomplete"
          ) {
            response = event.response;
            status =
              event.type === "response.completed" ? "completed" : "failed";
          }
          if (status === "failed")
            await failure(new Error("Incomplete model output"));
          yield event;
        }
        if (!response) {
          status = "failed";
          await failure(new Error("Incomplete model stream"));
        }
      } catch (cause) {
        status = options?.signal?.aborted ? "cancelled" : "failed";
        await failure(cause);
        throw cause;
      } finally {
        await finish(status, response);
      }
    })();
  } catch (cause) {
    if (!call) throw cause;
    const body = z
      .object({
        usage: z.unknown().optional(),
        error: z.object({ usage: z.unknown().optional() }).optional(),
      })
      .safeParse(cause);
    await finish(
      options?.signal?.aborted ? "cancelled" : "failed",
      undefined,
      body.success ? (body.data.usage ?? body.data.error?.usage) : undefined,
      cause instanceof APIError ? (cause.requestID ?? undefined) : undefined,
    );
    await failure(cause);
    throw cause;
  }
}
