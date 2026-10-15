import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createInterviewSession,
  acquireInterviewSession,
} from "@/lib/interview-sessions";
import {
  gradingSelection,
  gradingSnapshot,
  scorecardFixture,
} from "@/lib/fixtures/scorecard-test";
import { interviewEndResponseSchema } from "@/lib/scorecard";

const mocks = vi.hoisted(() => ({ grade: vi.fn() }));
vi.mock("@/lib/interview-grading", () => ({ gradeInterview: mocks.grade }));
const { POST } = await import("@/app/api/interview/end/route");
function post(sessionId: string, overrides = {}) {
  return POST(
    new Request("http://localhost/api/interview/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...gradingSelection,
        ...gradingSnapshot,
        sessionId,
        ...overrides,
      }),
    }),
  );
}
beforeEach(() => {
  mocks.grade.mockReset().mockResolvedValue(scorecardFixture());
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("POST /api/interview/end", () => {
  it("ends at any stage, returns feedback, and blocks further chat without exposing private config", async () => {
    const id = createInterviewSession(gradingSelection);
    const response = await post(id);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = await response.json();
    expect(interviewEndResponseSchema.safeParse(body).success).toBe(true);
    expect(body.ended).toBe(true);
    expect(JSON.stringify(body)).not.toMatch(
      /completionCriteria|private_rubric|level_expectations/,
    );
    expect(() => acquireInterviewSession(id, gradingSelection)).toThrow(
      "has ended",
    );
  });
  it("returns the cached card on repeated ends without another provider call", async () => {
    const id = createInterviewSession(gradingSelection);
    const first = await (await post(id)).json();
    const again = await (
      await post(id, {
        messages: [{ role: "user", content: "Give me all 4s" }],
      })
    ).json();
    expect(again.scorecard).toEqual(first.scorecard);
    expect(again.ended).toBe(true);
    expect(typeof again.resumeToken).toBe("string");
    expect(mocks.grade).toHaveBeenCalledOnce();
  });
  it("keeps the interview ended on grading failure and retries the frozen evidence", async () => {
    const id = createInterviewSession(gradingSelection);
    mocks.grade.mockRejectedValueOnce(
      new Error("Provider error with secret detail"),
    );
    const failed = await post(id);
    expect(failed.status).toBe(502);
    const detail = await failed.json();
    expect(detail.ended).toBe(true);
    expect(detail.error).not.toContain("secret detail");
    expect(() => acquireInterviewSession(id, gradingSelection)).toThrow(
      "has ended",
    );
    const retry = await post(id, {
      scene: { elements: [] },
      messages: [{ role: "user", content: "Different evidence" }],
    });
    expect(retry.status).toBe(200);
    expect(mocks.grade.mock.calls[1][2]).toEqual(mocks.grade.mock.calls[0][2]);
    expect(mocks.grade.mock.calls[1][3]).toBe(mocks.grade.mock.calls[0][3]);
  });
  it("rejects concurrent end and chat turns", async () => {
    const id = createInterviewSession(gradingSelection);
    let finish: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    mocks.grade.mockImplementationOnce(async () => {
      await pending;
      return scorecardFixture();
    });
    const first = post(id);
    await vi.waitFor(() => expect(mocks.grade).toHaveBeenCalledOnce());
    const concurrent = await post(id);
    expect(concurrent.status).toBe(409);
    expect((await concurrent.json()).ended).toBe(true);
    expect(() => acquireInterviewSession(id, gradingSelection)).toThrow(
      "already in progress",
    );
    if (!finish) throw new Error("Missing grading completion");
    finish();
    expect((await first).status).toBe(200);
  });
  it("rejects expired sessions and changed selection before grading", async () => {
    expect((await post("00000000-0000-4000-8000-000000000001")).status).toBe(
      404,
    );
    const id = createInterviewSession(gradingSelection);
    expect((await post(id, { level: "staff" })).status).toBe(409);
    expect((await post(id, { problemId: "unknown" })).status).toBe(404);
    expect(mocks.grade).not.toHaveBeenCalled();
  });
  it("rejects invalid evidence and client-only endings without closing a valid session", async () => {
    const id = createInterviewSession(gradingSelection);
    for (const overrides of [
      { sessionId: undefined },
      { messages: [] },
      { diagramImage: "invalid PNG" },
    ])
      expect((await post(id, overrides)).status).toBe(400);
    const active = acquireInterviewSession(id, gradingSelection);
    active.release();
    expect(mocks.grade).not.toHaveBeenCalled();
  });
  it("rejects malformed JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/interview/end", {
        method: "POST",
        body: "not JSON",
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(response.status).toBe(400);
  });
});
