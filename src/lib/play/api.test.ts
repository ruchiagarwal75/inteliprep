import { expect, it, vi } from "vitest";
import { APIError } from "openai";
const log = vi.hoisted(() => vi.fn());
vi.mock("@/lib/server-events", () => ({ logServerEvent: log }));
vi.mock("@/lib/candidate-context", () => ({
  currentCandidateId: () => "test-user",
}));
vi.mock("@/lib/api-request", async (original) => ({
  ...(await original<typeof import("@/lib/api-request")>()),
  withApiRequest: (
    _kind: unknown,
    _route: unknown,
    handler: (request: Request) => Promise<Response>,
  ) => handler,
}));
import { playEndpoint } from "./api";
import { PlayGradingError } from "./grading-error";
it("keeps provider authentication separate from candidate login and logs a safe code", async () => {
  const cause = new APIError(
    401,
    { code: "expired_secret_key" },
    "secret provider message",
    new Headers(),
  );
  const endpoint = playEndpoint("/api/play/submit", async () => {
    throw new PlayGradingError("provider", cause);
  });
  const response = await endpoint(
    new Request("https://mockmeai.test/api/play/submit", { method: "POST" }),
  );
  expect(response.status).toBe(503);
  expect(response.headers.has("X-Interview-Auth-Error")).toBe(false);
  expect(await response.json()).toEqual({
    error:
      "AI grading is unavailable right now. Your answer is saved. Please try again later.",
  });
  expect(log).toHaveBeenCalledWith(
    expect.objectContaining({
      providerCode: "expired_secret_key",
      kind: "play:provider_authentication",
      playGradingStage: "provider",
    }),
    cause,
  );
});
