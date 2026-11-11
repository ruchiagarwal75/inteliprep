import { z } from "zod";
import { AsyncLocalStorage } from "node:async_hooks";
import type { Response } from "openai/resources/responses/responses";
import { estimatedAiCost, tokenUsage } from "@/lib/reporting-cost";

const selectionSchema = z.object({
  intent: z.string(),
  factIds: z.array(z.string()),
  hasUnspecified: z.boolean(),
});
function selection(response?: Response) {
  try {
    const parsed = selectionSchema.safeParse(
      JSON.parse(response?.output_text ?? ""),
    );
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}
const scope = new AsyncLocalStorage<string>();
export const calls: {
  label: string;
  operation: string;
  model: string;
  durationMs: number;
  status: string | null;
  usage: Response["usage"] | null;
  estimatedUsd: number | null;
  normalizedUsage: ReturnType<typeof tokenUsage>;
  factSelection?: z.infer<typeof selectionSchema>;
}[] = [];
export const metered = <T>(label: string, work: () => Promise<T>) =>
  scope.run(label, work);
export function recordCall(
  operation: string,
  started: number,
  response?: Response,
  failure?: { model: string; usage?: unknown },
) {
  const normalizedUsage = tokenUsage(response?.usage ?? failure?.usage);
  calls.push({
    label: scope.getStore() ?? "unassigned",
    operation,
    factSelection: selection(response),
    model: response?.model ?? failure?.model ?? "unavailable",
    durationMs: performance.now() - started,
    status:
      response?.status ??
      (normalizedUsage ? "failed_with_usage" : "failed_without_usage"),
    usage: response?.usage ?? null,
    normalizedUsage,
    estimatedUsd: estimatedAiCost(
      response?.model ?? failure?.model ?? "unavailable",
      normalizedUsage,
    ),
  });
}
