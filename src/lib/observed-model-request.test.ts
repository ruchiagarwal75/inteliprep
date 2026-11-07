import { afterEach, describe, expect, it, vi } from "vitest";
import { APIError } from "openai";
import { observedModelRequest } from "@/lib/observed-model-request";
import { withReportingContext } from "@/lib/reporting-context";
import { recordAiCall } from "@/lib/reporting-ai";
import { recordFailure } from "@/lib/reporting-failures";
const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@/lib/openai-client", () => ({
  createOpenAIClient: () => ({ responses: { create } }),
}));
vi.mock("@/lib/reporting-ai", () => ({ recordAiCall: vi.fn(async () => {}) }));
vi.mock("@/lib/reporting-failures", async (original) => ({
  ...(await original<typeof import("@/lib/reporting-failures")>()),
  recordFailure: vi.fn(async () => {}),
}));
const context = {
  requestId: "request-fixture",
  route: "/api/chat",
  userId: "11111111-1111-4111-8111-111111111111",
  interviewId: "22222222-2222-4222-8222-222222222222",
};
const usage = {
  input_tokens: 100,
  output_tokens: 20,
  input_tokens_details: { cached_tokens: 10 },
};
const response = {
  id: "response-reference",
  status: "completed",
  model: "gpt-4o",
  usage,
  output_text: "reply",
};
afterEach(() => vi.clearAllMocks());
describe("per-attempt model observability", () => {
  it("records only metadata and usage, without copying prompts or answers", async () => {
    create.mockResolvedValueOnce(response);
    const result = await withReportingContext(context, () =>
      observedModelRequest("assessment", {
        model: "gpt-4o",
        input: "private candidate answer",
      }),
    );
    expect(result).toBe(response);
    expect(recordAiCall).toHaveBeenCalledTimes(2);
    expect(vi.mocked(recordAiCall).mock.calls[1][0]).toMatchObject({
      operation: "assessment",
      status: "completed",
      usage,
      context,
    });
    expect(JSON.stringify(vi.mocked(recordAiCall).mock.calls)).not.toContain(
      "private candidate answer",
    );
  });
  it("keeps failed usage and separate retry attempts traceable to one interview", async () => {
    const error = new APIError(
      503,
      { message: "private provider payload", usage },
      "private diagnostic",
      new Headers({ "x-request-id": "provider-request-503" }),
    );
    create.mockRejectedValueOnce(error).mockResolvedValueOnce(response);
    await withReportingContext(context, async () => {
      await expect(
        observedModelRequest("feedback", {
          model: "gpt-4o",
          input: "private answer",
        }),
      ).rejects.toBe(error);
      await observedModelRequest("feedback", {
        model: "gpt-4o",
        input: "private answer",
      });
    });
    const calls = vi.mocked(recordAiCall).mock.calls.map(([call]) => call);
    expect(calls).toHaveLength(4);
    expect(calls[1]).toMatchObject({
      status: "failed",
      usage,
      providerRequestId: "provider-request-503",
    });
    expect(calls[3].id).not.toBe(calls[1].id);
    expect(recordFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: "feedback",
        category: "provider_unavailable",
        referenceId: "provider-request-503",
      }),
      expect.objectContaining({
        requestId: context.requestId,
        userId: context.userId,
        interviewId: context.interviewId,
      }),
    );
    expect(
      JSON.stringify([...calls, ...vi.mocked(recordFailure).mock.calls]),
    ).not.toMatch(/private/);
  });
  it("collects terminal usage from a streamed response", async () => {
    create.mockResolvedValueOnce(
      (async function* () {
        yield { type: "response.output_text.delta", delta: "reply" };
        yield { type: "response.completed", response };
      })(),
    );
    await withReportingContext(context, async () => {
      const stream = await observedModelRequest("reply", {
        model: "gpt-4o",
        input: "private",
        stream: true,
      });
      const events = [];
      for await (const event of stream) events.push(event);
      expect(events).toHaveLength(2);
    });
    expect(vi.mocked(recordAiCall).mock.calls.at(-1)?.[0]).toMatchObject({
      status: "completed",
      usage,
    });
  });
  it("does not turn missing usage on a provider failure into zero tokens", async () => {
    create.mockRejectedValueOnce(
      new APIError(503, {}, "unavailable", new Headers()),
    );
    await withReportingContext(context, async () => {
      await expect(
        observedModelRequest("reply", { model: "gpt-4o", input: "x" }),
      ).rejects.toThrow();
    });
    expect(
      vi.mocked(recordAiCall).mock.calls.at(-1)?.[0].usage,
    ).toBeUndefined();
  });
});
