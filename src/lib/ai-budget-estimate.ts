import "server-only";
import type { ResponseCreateParams } from "openai/resources/responses/responses";
import { aiModelRate } from "@/lib/reporting-cost";
import { AiBudgetError } from "@/lib/ai-budget-config";

/** Deliberately upper-bound uncached input, cache writes and reasoning/output.
 * Text UTF-8 bytes bound text tokens. App images are validated PNGs <=1280px;
 * 65,536 tokens per image gives headroom over their high-detail image budgets.
 * This is a reservation, never a replacement for reported usage/cost.
 */
export function modelCostReservation(params: ResponseCreateParams) {
  const rate = aiModelRate(
    params.model ?? "unknown",
    process.env.AI_MODEL_RATES_USD_PER_MILLION,
  );
  if (!rate) throw new AiBudgetError(503);
  let images = 0;
  const text = JSON.stringify(params, (key: string, value: unknown) => {
    if (key === "image_url") {
      images++;
      return "[image]";
    }
    return value;
  });
  const tokens = Buffer.byteLength(text, "utf8") + images * 65_536;
  const output = params.max_output_tokens ?? 16_384;
  if (!Number.isInteger(output) || output <= 0 || output > 32_768)
    throw new AiBudgetError(503);
  return (
    Math.ceil(
      tokens * Math.max(rate.input, rate.cached, rate.cacheWrite ?? 0) +
        output * rate.output,
    ) / 1_000_000
  );
}
