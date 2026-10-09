import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { INTERVIEWER_INSTRUCTIONS } from "@/lib/interviewer-input";

const mocks = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("openai", () => ({
  default: class {
    responses = { create: mocks.create };
  },
}));
const { hasApiKey, MissingApiKeyError, streamInterviewerReply } =
  await import("@/lib/llm");

beforeEach(() => {
  vi.stubEnv("OPENAI_KEY", "test-key");
  vi.stubEnv("OPENAI_MODEL", "test-model");
  mocks.create.mockReset();
  mocks.create.mockImplementation(async function* () {
    yield { type: "response.created" };
    yield { type: "response.output_text.delta", delta: "Your API" };
    yield {
      type: "response.output_text.delta",
      delta: " connects to the database.",
    };
  });
});
afterEach(() => vi.unstubAllEnvs());

describe("streamInterviewerReply", () => {
  it("sends current diagram context in user input, forwards cancellation, and streams only text deltas", async () => {
    const signal = new AbortController().signal;
    const messages = [{ role: "user" as const, content: "Here's my design" }];
    const diagram = '"API" -> "Database"';
    const chunks = [];
    for await (const chunk of streamInterviewerReply(
      messages,
      diagram,
      "No diagram changes.",
      signal,
    ))
      chunks.push(chunk);
    expect(chunks.join("")).toBe("Your API connects to the database.");
    const [request, options] = mocks.create.mock.calls[0];
    expect(request).toMatchObject({
      model: "test-model",
      instructions: INTERVIEWER_INSTRUCTIONS,
      stream: true,
    });
    expect(request.input[0].role).toBe("user");
    expect(JSON.parse(request.input[0].content)).toEqual({
      candidate_message: "Here's my design",
      current_whiteboard_snapshot: diagram,
      whiteboard_changes: "No diagram changes.",
    });
    expect(options.signal).toBe(signal);
  });

  it("reports a missing key before making a provider request", async () => {
    vi.stubEnv("OPENAI_KEY", "");
    expect(hasApiKey()).toBe(false);
    await expect(
      streamInterviewerReply(
        [{ role: "user", content: "hello" }],
        "empty",
        "Initial diagram",
      ).next(),
    ).rejects.toBeInstanceOf(MissingApiKeyError);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it.each(["response.failed", "response.incomplete"])(
    "surfaces %s events so the client does not commit a failed turn",
    async (type) => {
      mocks.create.mockImplementation(async function* () {
        yield { type: "response.output_text.delta", delta: "Partial reply" };
        yield { type };
      });
      const stream = streamInterviewerReply(
        [{ role: "user", content: "Hello" }],
        "empty",
        "Initial diagram",
      );
      await expect(stream.next()).resolves.toMatchObject({
        value: "Partial reply",
      });
      await expect(stream.next()).rejects.toThrow("did not complete");
    },
  );
});
