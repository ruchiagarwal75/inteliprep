import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
import { ApiRequestError } from "@/lib/api-request";
import { CandidateAuthError } from "@/lib/supabase-config";
import { CandidateInviteError } from "@/lib/candidate-invites";
import { requireCandidateIdentity } from "@/lib/candidate-auth";
const h = vi.hoisted(() => ({ save: vi.fn(), status: vi.fn() }));
vi.mock("@/lib/play/topic-rating-store", () => ({
  saveTopicRating: h.save,
  topicRatingStatus: h.status,
}));
const sessionId = "11111111-1111-4111-8111-111111111111";
function request(body: unknown, origin = "https://mockmeai.test") {
  return new Request("https://mockmeai.test/api/play/topic-rating", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  h.save.mockReset().mockResolvedValue({ handled: true });
  h.status.mockReset().mockResolvedValue({ eligible: true });
});
afterEach(() => vi.clearAllMocks());
it.each([new CandidateAuthError(), new CandidateInviteError()])(
  "requires sign-in and access",
  async (cause) => {
    vi.mocked(requireCandidateIdentity).mockRejectedValue(cause);
    expect((await POST(request({ sessionId, action: "skip" }))).status).toBe(
      cause.status,
    );
    expect(
      (
        await GET(
          new Request(
            `https://mockmeai.test/api/play/topic-rating?sessionId=${sessionId}`,
          ),
        )
      ).status,
    ).toBe(cause.status);
    expect(h.save).not.toHaveBeenCalled();
    expect(h.status).not.toHaveBeenCalled();
  },
);
it("rejects foreign origins, malformed ratings and oversized bodies", async () => {
  expect(
    (
      await POST(
        request({ sessionId, action: "skip" }, "https://attacker.test"),
      )
    ).status,
  ).toBe(403);
  expect(
    (await POST(request({ sessionId, action: "rate", stars: 6 }))).status,
  ).toBe(400);
  expect(
    (await POST(request({ sessionId, action: "skip", text: "x".repeat(2000) })))
      .status,
  ).toBe(413);
  expect(h.save).not.toHaveBeenCalled();
});
it("uses the verified owner for both rating and skip", async () => {
  for (const input of [
    { sessionId, action: "rate", stars: 4 },
    { sessionId, action: "skip" },
  ]) {
    const response = await POST(request(input));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(h.save).toHaveBeenLastCalledWith(sessionId, input);
  }
});
it.each([404, 409])(
  "preserves ownership/completion refusal %i",
  async (status) => {
    h.save.mockRejectedValueOnce(
      new ApiRequestError("Quiz unavailable.", status),
    );
    expect((await POST(request({ sessionId, action: "skip" }))).status).toBe(
      status,
    );
  },
);
it("uses the feedback quota and keeps refresh checks separate", async () => {
  for (let n = 0; n < 5; n++)
    expect((await POST(request({ sessionId, action: "skip" }))).status).toBe(
      200,
    );
  const limited = await POST(request({ sessionId, action: "skip" }));
  expect(limited.status).toBe(429);
  expect(Number(limited.headers.get("Retry-After"))).toBeGreaterThan(0);
  expect(
    (
      await GET(
        new Request(
          `https://mockmeai.test/api/play/topic-rating?sessionId=${sessionId}`,
        ),
      )
    ).status,
  ).toBe(200);
});
