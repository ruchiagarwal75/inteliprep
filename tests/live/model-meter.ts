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
  factSelection?: z.infer<typeof selectionSchema>;
}[] = [];
export const metered = <T>(label: string, work: () => Promise<T>) =>
  scope.run(label, work);
export function recordCall(
  operation: string,
  started: number,
  response?: Response,
) {
  calls.push({
    label: scope.getStore() ?? "unassigned",
    operation,
    factSelection: selection(response),
    model: response?.model ?? "unavailable",
    durationMs: Date.now() - started,
    status: response?.status ?? "failed_without_usage",
    usage: response?.usage ?? null,
    estimatedUsd: response
      ? estimatedAiCost(response.model, tokenUsage(response.usage))
      : null,
  });
}
