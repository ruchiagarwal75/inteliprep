import { afterEach, expect, it, vi } from "vitest";
import { APIError } from "openai";
import { upstreamChatError } from "@/lib/chat-api-error";
afterEach(() => vi.restoreAllMocks());
it.each([401, 403, 429, 500])(
  "replaces provider diagnostics with a generic client code (%s)",
  async (status) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const cause = new APIError(
      status,
      { code: "expired_secret_key", message: "private provider details" },
      "private key diagnostic",
      new Headers(),
    );
    const response = upstreamChatError(cause, "request-reference");
    const body = await response.json();
    expect(body).toEqual({
      error: "Interviewer unavailable. Please try again.",
      code: "INTERVIEWER_UNAVAILABLE",
    });
    expect(JSON.stringify(body)).not.toMatch(
      /expired_secret|private|diagnostic/u,
    );
  },
);
