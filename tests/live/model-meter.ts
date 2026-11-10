import { AsyncLocalStorage } from "node:async_hooks";
import type { Response } from "openai/resources/responses/responses";
import { estimatedAiCost, tokenUsage } from "@/lib/reporting-cost";

const scope = new AsyncLocalStorage<string>();
export const calls: {
  label: string;
  operation: string;
  model: string;
  durationMs: number;
  status: string | null;
  usage: Response["usage"] | null;
  estimatedUsd: number | null;
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
    model: response?.model ?? "unavailable",
    durationMs: Date.now() - started,
    status: response?.status ?? "failed_without_usage",
    usage: response?.usage ?? null,
    estimatedUsd: response
      ? estimatedAiCost(response.model, tokenUsage(response.usage))
      : null,
  });
}
