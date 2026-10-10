import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import basicScene from "@/lib/fixtures/basic-system.json";

const mocks = vi.hoisted(() => ({
  streamInterviewerReply: vi.fn(),
  hasApiKey: vi.fn(),
}));
vi.mock("@/lib/llm", () => mocks);
const { POST } = await import("@/app/api/chat/route");
const messages = [{ role: "user", content: "Hello" }];
function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body:
        typeof body === "string"
          ? body
          : JSON.stringify({
              problemId: "url-shortener",
              level: "senior",
              ...(typeof body === "object" && body !== null ? body : {}),
            }),
    }),
  );
}
beforeEach(() => {
  mocks.streamInterviewerReply.mockReset();
  mocks.hasApiKey.mockReturnValue(true);
});
afterEach(() => vi.restoreAllMocks());

describe("POST /api/chat validation", () => {
  it("rejects a missing selection, invalid level, or unknown problem before contacting the provider", async () => {
    for (const overrides of [
      { problemId: undefined },
      { level: "expert" },
      { level: undefined },
    ]) {
      expect((await post({ messages, ...overrides })).status).toBe(400);
    }
    expect((await post({ messages, problemId: "missing" })).status).toBe(404);
    expect(mocks.streamInterviewerReply).not.toHaveBeenCalled();
  });

  it("rejects an invalid previous scene before calling the model", async () => {
    const response = await post({
      messages,
      scene: basicScene,
      previousScene: { elements: [{ id: "bad" }] },
    });
    expect(response.status).toBe(400);
    expect(mocks.streamInterviewerReply).not.toHaveBeenCalled();
  });

  it.each(["https://example.com/image.png", "data:image/png;base64,notvalid"])(
    "rejects an invalid image before contacting the model",
    async (diagramImage) => {
      const response = await post({
        messages,
        scene: basicScene,
        diagramImage,
      });
      expect(response.status).toBe(400);
      expect(mocks.streamInterviewerReply).not.toHaveBeenCalled();
    },
  );

  it("rejects an invalid scene before calling the provider", async () => {
    const response = await post({
      messages,
      scene: { elements: [{ id: "bad", type: "arrow" }] },
    });
    expect(response.status).toBe(400);
    expect(mocks.streamInterviewerReply).not.toHaveBeenCalled();
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
});
