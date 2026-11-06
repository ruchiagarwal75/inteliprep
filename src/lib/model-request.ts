import { assertModelTextBudget } from "@/lib/model-budget";
import type { ResponseCreateParamsBase } from "openai/resources/responses/responses";

/** Check every provider call, including assessment, review rewrites, and grading retries. */
export function boundedModelRequest<const T extends ResponseCreateParamsBase>(
  request: T,
): T {
  const input = JSON.stringify(request.input, (key, value: unknown) =>
    key === "image_url" ? "[validated bounded whiteboard image]" : value,
  );
  assertModelTextBudget(request.instructions ?? "", input ?? "");
  return request;
}
