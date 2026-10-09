import { APIError } from "openai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  streamInterviewerReply: vi.fn(),
  hasApiKey: vi.fn(),
}));

vi.mock("@/lib/llm", () => mocks);

const { POST } = await import("@/app/api/chat/route");

function post(body: unknown): Promise<Response> {
  return POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

async function* deltasOf(...chunks: string[]) {
  for (const chunk of chunks) yield chunk;
}

const messages = [{ role: "user", content: "Hello" }];

beforeEach(() => {
  mocks.hasApiKey.mockReturnValue(true);
  mocks.streamInterviewerReply.mockImplementation(() =>
    deltasOf("Hi", " there"),
  );
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/chat", () => {
  it("streams the reply as plain text", async () => {
    const response = await post({ messages });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "text/plain; charset=utf-8",
    );
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.text()).resolves.toBe("Hi there");
  });

  it("forwards only the validated messages to the model", async () => {
    await post({ messages, scene: { elements: [] } });

    expect(mocks.streamInterviewerReply).toHaveBeenCalledWith(
      [{ role: "user", content: "Hello" }],
      expect.any(AbortSignal),
    );
  });

  it("rejects a malformed body", async () => {
    const response = await post("not json");

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Body must be valid JSON",
    });
  });

  it("rejects an invalid message list", async () => {
    expect((await post({ messages: [] })).status).toBe(400);
  });

  it("reports a missing API key without calling the model", async () => {
    mocks.hasApiKey.mockReturnValue(false);

    const response = await post({ messages });

    expect(response.status).toBe(500);
    expect(mocks.streamInterviewerReply).not.toHaveBeenCalled();
  });

  it("maps an upstream failure to its status and code", async () => {
    mocks.streamInterviewerReply.mockImplementation(async function* () {
      throw new APIError(
        429,
        { code: "credit_balance_exhausted" },
        "no credits",
        undefined,
      );
      yield "";
    });

    const response = await post({ messages });

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({
      code: "credit_balance_exhausted",
    });
  });

  it("does not leak provider detail in the error body", async () => {
    mocks.streamInterviewerReply.mockImplementation(async function* () {
      throw new APIError(
        429,
        { code: "credit_balance_exhausted" },
        "Add credits at https://platform.openai.com/settings/billing",
        undefined,
      );
      yield "";
    });

    const body = await (await post({ messages })).text();

    expect(body).not.toContain("platform.openai.com");
  });
});
