import { APIError } from "openai";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { POST } from "@/app/api/interview/end/route";
import { createCandidateBrowserScope } from "@/lib/candidate-browser-scope";
import { CANDIDATE_AUTH_ERROR_HEADER } from "@/lib/candidate-api-error";
import { savedFixture } from "@/lib/fixtures/saved-interview-test";
import { scorecardFixture } from "@/lib/fixtures/scorecard-test";
import { captureScene } from "@/lib/scene-snapshot";

const mocks = vi.hoisted(() => ({ grade: vi.fn() }));
vi.mock("@/lib/interview-grading", () => ({ gradeInterview: mocks.grade }));
beforeEach(() => {
  vi.stubGlobal("indexedDB", new IDBFactory());
  vi.stubEnv("OPENAI_KEY", "test-key");
  mocks.grade
    .mockReset()
    .mockRejectedValue(
      new APIError(
        401,
        { code: "expired_secret_key" },
        "Private provider detail",
        undefined,
      ),
    );
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
it("keeps an ended interview and frozen scorecard evidence available after provider authentication fails", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn<typeof fetch>()
      .mockImplementation((input, init) =>
        POST(new Request(new URL(String(input), "http://localhost"), init)),
      ),
  );
  const unauthorized = vi.fn();
  const scope = createCandidateBrowserScope(
    "11111111-1111-4111-8111-111111111111",
    unauthorized,
  );
  const saved = savedFixture();
  const payload = {
    ...saved.interview,
    messages: [
      ...saved.messages,
      {
        role: "user" as const,
        content: "I would measure CPU and test a server failure.",
      },
    ],
    scene: captureScene(saved.whiteboard.elements),
  };
  await scope.storage.saveInterview({ ...saved, endRequest: payload });
  const response = await scope.request("/api/interview/end", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  expect(response.status).toBe(502);
  expect(response.headers.get(CANDIDATE_AUTH_ERROR_HEADER)).toBeNull();
  expect(await response.json()).toMatchObject({
    ended: true,
    error: expect.stringContaining("saved evidence"),
  });
  expect(unauthorized).not.toHaveBeenCalled();
  expect(
    (await scope.storage.readInterview(saved.id))?.endRequest,
  ).toBeDefined();
  mocks.grade.mockResolvedValueOnce(scorecardFixture());
  const retried = await scope.request("/api/interview/end", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  expect(retried.status).toBe(200);
  expect(mocks.grade.mock.calls[1][2]).toEqual(mocks.grade.mock.calls[0][2]);
  expect(unauthorized).not.toHaveBeenCalled();
});
