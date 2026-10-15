import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createOpenAIClient,
  hasApiKey,
  interviewerModel,
} from "@/lib/openai-client";

afterEach(() => vi.unstubAllEnvs());
describe("bounded provider client", () => {
  it("bounds provider waiting and disables retries so route deadlines remain meaningful", () => {
    vi.stubEnv("OPENAI_KEY", "test-key");
    const client = createOpenAIClient();
    expect(client.timeout).toBe(45_000);
    expect(client.maxRetries).toBe(0);
  });
  it("reads configuration lazily and preserves the selected model", () => {
    vi.stubEnv("OPENAI_KEY", "");
    vi.stubEnv("OPENAI_MODEL", "gpt-4o");
    expect(hasApiKey()).toBe(false);
    expect(() => createOpenAIClient()).toThrow("not set");
    expect(interviewerModel()).toBe("gpt-4o");
  });
});
