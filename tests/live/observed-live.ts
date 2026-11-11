import { z } from "zod";
import { vi } from "vitest";
import type {
  Response,
  ResponseCreateParamsNonStreaming,
  ResponseCreateParamsStreaming,
  ResponseStreamEvent,
} from "openai/resources/responses/responses";
import { recordCall } from "./model-meter";

type Operation = "reply" | "assessment" | "question_review" | "feedback";
type Options = { signal?: AbortSignal; timeout?: number; maxRetries?: number };
export function observedModelRequest(
  operation: Operation,
  params: ResponseCreateParamsStreaming,
  options?: Options,
): Promise<AsyncIterable<ResponseStreamEvent>>;
export function observedModelRequest(
  operation: Operation,
  params: ResponseCreateParamsNonStreaming,
  options?: Options,
): Promise<Response>;
export async function observedModelRequest(
  operation: Operation,
  params: ResponseCreateParamsStreaming | ResponseCreateParamsNonStreaming,
  options?: Options,
): Promise<Response | AsyncIterable<ResponseStreamEvent>> {
  const actual = await vi.importActual<
    typeof import("@/lib/observed-model-request")
  >("@/lib/observed-model-request");
  const started = performance.now();
  try {
    if (!params.stream) {
      const response = await actual.observedModelRequest(
        operation,
        params,
        options,
      );
      recordCall(operation, started, response);
      return response;
    }
    const stream = await actual.observedModelRequest(
      operation,
      params,
      options,
    );
    return (async function* () {
      let terminal: Response | undefined;
      let streamFailure: unknown;
      try {
        for await (const event of stream) {
          if (
            [
              "response.completed",
              "response.incomplete",
              "response.failed",
            ].includes(event.type) &&
            "response" in event
          )
            terminal = event.response;
          yield event;
        }
      } catch (cause) {
        streamFailure = cause;
        throw cause;
      } finally {
        recordCall(
          operation,
          started,
          terminal,
          failedUsage(params.model, streamFailure),
        );
      }
    })();
  } catch (cause) {
    recordCall(operation, started, undefined, failedUsage(params.model, cause));
    throw cause;
  }
}

function failedUsage(model: string | undefined, cause: unknown) {
  const value = z
    .object({
      usage: z.unknown().optional(),
      error: z.object({ usage: z.unknown().optional() }).optional(),
    })
    .safeParse(cause);
  return {
    model: model ?? "unavailable",
    usage: value.success
      ? (value.data.usage ?? value.data.error?.usage)
      : undefined,
  };
}
