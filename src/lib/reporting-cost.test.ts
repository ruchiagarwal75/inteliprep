import { describe, expect, it } from "vitest";
import { estimatedAiCost, tokenUsage } from "@/lib/reporting-cost";
describe("AI usage estimates", () => {
  it("prices the Terra interactive model using its verified standard rates", () => {
    expect(
      estimatedAiCost("gpt-6.1-terra", {
        inputTokens: 1000,
        cachedTokens: 200,
        cacheWriteTokens: 100,
        outputTokens: 300,
      }),
    ).toBeCloseTo(0.002335);
  });
  it("prices Sol input, cache reads/writes and reasoning-inclusive output without double counting", () => {
    const usage = tokenUsage({
      input_tokens: 1000,
      output_tokens: 300,
      output_tokens_details: { reasoning_tokens: 200 },
      input_tokens_details: { cached_tokens: 200, cache_write_tokens: 100 },
    });
    expect(estimatedAiCost("gpt-6.1-sol", usage)).toBeCloseTo(0.00467);
  });
  it("rejects overlapping cached and written counts larger than total input", () => {
    expect(
      tokenUsage({
        input_tokens: 10,
        output_tokens: 1,
        input_tokens_details: { cached_tokens: 7, cache_write_tokens: 5 },
      }),
    ).toBeNull();
  });
  it("prices cached input once, separately from uncached input and output", () => {
    const usage = tokenUsage({
      input_tokens: 1000,
      output_tokens: 100,
      input_tokens_details: { cached_tokens: 200 },
    });
    expect(estimatedAiCost("gpt-4o", usage)).toBeCloseTo(0.00325);
  });
  it("keeps missing, malformed and unsupported usage unavailable", () => {
    expect(tokenUsage(undefined)).toBeNull();
    expect(tokenUsage({ input_tokens: 1000 })).toBeNull();
    expect(
      tokenUsage({
        input_tokens: 10,
        output_tokens: 10,
        input_tokens_details: { cached_tokens: 20 },
      }),
    ).toBeNull();
    expect(estimatedAiCost("gpt-4o", null)).toBeNull();
    expect(
      estimatedAiCost("unpriced", {
        inputTokens: 10,
        outputTokens: 10,
        cachedTokens: 0,
      }),
    ).toBeNull();
  });
  it("honors explicitly configured model pricing, including actual zero usage", () => {
    const rates = JSON.stringify({
      custom: { input: 2, cached: 1, output: 4 },
    });
    expect(
      estimatedAiCost(
        "custom",
        { inputTokens: 100, outputTokens: 100, cachedTokens: 0 },
        rates,
      ),
    ).toBe(0.0006);
    expect(
      estimatedAiCost(
        "custom",
        { inputTokens: 0, outputTokens: 0, cachedTokens: 0 },
        rates,
      ),
    ).toBe(0);
    expect(
      estimatedAiCost(
        "custom",
        { inputTokens: 1, outputTokens: 1, cachedTokens: 0 },
        "broken",
      ),
    ).toBeNull();
  });
  it("does not guess pricing when a new model reports unconfigured cache writes", () => {
    expect(
      estimatedAiCost("gpt-4o", {
        inputTokens: 100,
        outputTokens: 1,
        cachedTokens: 0,
        cacheWriteTokens: 20,
      }),
    ).toBeNull();
  });
});
