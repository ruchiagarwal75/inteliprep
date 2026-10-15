import { APIError } from "openai";
import { afterEach, describe, expect, it, vi } from "vitest";
import { logServerEvent, withServerContext } from "@/lib/server-events";

afterEach(() => vi.restoreAllMocks());
describe("server event privacy", () => {
  it("preserves independent request IDs through async provider work", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await Promise.all(
      ["first", "second"].map((id) =>
        withServerContext(id, "/api/chat", async () => {
          await Promise.resolve();
          logServerEvent({ event: "stage_assessment_failure" });
        }),
      ),
    );
    expect(log.mock.calls.map(([line]) => JSON.parse(line).requestId)).toEqual([
      "first",
      "second",
    ]);
  });
  it("omits provider bodies, headers, messages and stacks", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    logServerEvent(
      { event: "grading_failure", requestId: "test-id" },
      new APIError(
        401,
        { message: "private evidence", code: "secret-code" },
        "private provider body",
        new Headers({ Authorization: "secret-token" }),
      ),
    );
    const record = JSON.parse(log.mock.calls[0][0]);
    expect(record).toMatchObject({
      event: "grading_failure",
      providerStatus: 401,
    });
    expect(JSON.stringify(record)).not.toMatch(/private|secret/);
  });
  it("records a request without headers or candidate data", () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    logServerEvent({
      event: "api_request",
      route: "/api/chat",
      status: 200,
      durationMs: 20,
    });
    expect(JSON.parse(log.mock.calls[0][0])).toMatchObject({
      status: 200,
      durationMs: 20,
    });
  });
});
