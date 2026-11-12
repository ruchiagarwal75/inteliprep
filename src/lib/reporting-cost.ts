import { z } from "zod";
const rateSchema = z.object({
  input: z.number().nonnegative(),
  cached: z.number().nonnegative(),
  cacheWrite: z.number().nonnegative().optional(),
  output: z.number().nonnegative(),
});
export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  cacheWriteTokens?: number;
};
const usageSchema = z.object({
  input_tokens: z.number().int().nonnegative(),
  output_tokens: z.number().int().nonnegative(),
  input_tokens_details: z.object({
    cached_tokens: z.number().int().nonnegative(),
    cache_write_tokens: z.number().int().nonnegative().optional(),
  }),
});
export function tokenUsage(value: unknown): TokenUsage | null {
  const result = usageSchema.safeParse(value);
  if (
    !result.success ||
    result.data.input_tokens_details.cached_tokens +
      (result.data.input_tokens_details.cache_write_tokens ?? 0) >
      result.data.input_tokens
  )
    return null;
  return {
    inputTokens: result.data.input_tokens,
    outputTokens: result.data.output_tokens,
    cachedTokens: result.data.input_tokens_details.cached_tokens,
    cacheWriteTokens: result.data.input_tokens_details.cache_write_tokens,
  };
}
/** No inferred tokens or zero-cost stand-ins for missing usage/pricing. Rates are USD / million. */
export function estimatedAiCost(
  model: string,
  usage: TokenUsage | null,
  configuredRates?: string,
) {
  if (!usage) return null;
  try {
    const rates = z.record(z.string(), rateSchema).parse(
      JSON.parse(
        configuredRates ??
          JSON.stringify({
            "gpt-6-luna": {
              input: 0.1,
              cached: 0.01,
              cacheWrite: 0.125,
              output: 0.5,
            },
            "gpt-6.1-terra": {
              input: 1,
              cached: 0.05,
              cacheWrite: 1.25,
              output: 5,
            },
            "gpt-6.1-sol": {
              input: 2,
              cached: 0.1,
              cacheWrite: 2.5,
              output: 10,
            },
            "gpt-4o": { input: 2.5, cached: 1.25, output: 10 },
            "gpt-4o-2024-08-06": { input: 2.5, cached: 1.25, output: 10 },
            "gpt-4o-2024-11-20": { input: 2.5, cached: 1.25, output: 10 },
          }),
      ),
    );
    const rate = rates[model];
    if (!rate) return null;
    const writes = usage.cacheWriteTokens ?? 0;
    if (writes && rate.cacheWrite === undefined) return null;
    return (
      ((usage.inputTokens - usage.cachedTokens - writes) * rate.input +
        usage.cachedTokens * rate.cached +
        writes * (rate.cacheWrite ?? 0) +
        usage.outputTokens * rate.output) /
      1_000_000
    );
  } catch {
    return null;
  }
}
