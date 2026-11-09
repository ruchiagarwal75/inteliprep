import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/feedback/route";
import { ApiRequestError } from "@/lib/api-request";
import { CandidateAuthError } from "@/lib/supabase-config";
import { CandidateInviteError } from "@/lib/candidate-invites";
import { requireCandidateIdentity } from "@/lib/candidate-auth";
const { save, handled } = vi.hoisted(() => ({
  save: vi.fn(),
  handled: vi.fn(),
}));
vi.mock("@/lib/feedback-store", () => ({
  savePracticeFeedback: save,
  feedbackHandled: handled,
}));
const id = "11111111-1111-4111-8111-111111111111";
function request(body: unknown, origin = "https://mockmeai.test") {
  return new Request("https://mockmeai.test/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  save.mockResolvedValue({ id });
  handled.mockResolvedValue(true);
});
afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});
it.each([new CandidateAuthError(), new CandidateInviteError()])(
  "rejects auth/invite failure before saving",
  async (cause) => {
    vi.mocked(requireCandidateIdentity).mockRejectedValue(cause);
    expect(
      (await POST(request({ source: "menu", skipped: false, liked: "okay" })))
        .status,
    ).toBe(cause.status);
    expect(
      (
        await GET(
          new Request(`https://mockmeai.test/api/feedback?interviewId=${id}`),
        )
      ).status,
    ).toBe(cause.status);
    expect(save).not.toHaveBeenCalled();
    expect(handled).not.toHaveBeenCalled();
  },
);
it("returns 404 for an interview owned by someone else", async () => {
  save.mockRejectedValueOnce(new ApiRequestError("Interview not found.", 404));
  expect(
    (
      await POST(
        request({ source: "interview_end", interviewId: id, skipped: true }),
      )
    ).status,
  ).toBe(404);
});
it("rejects foreign origins, oversized comments and oversized bodies", async () => {
  expect(
    (
      await POST(
        request({ source: "menu", skipped: true }, "https://attacker.test"),
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await POST(
        request({ source: "menu", skipped: false, comment: "x".repeat(2001) }),
      )
    ).status,
  ).toBe(400);
  expect(
    (
      await POST(
        request({ source: "menu", skipped: false, comment: "x".repeat(5000) }),
      )
    ).status,
  ).toBe(413);
  expect(save).not.toHaveBeenCalled();
});
it("records skips and returns no-store without echoing the comment", async () => {
  const input = { source: "interview_end", interviewId: id, skipped: true };
  const response = await POST(request(input));
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(save).toHaveBeenCalledWith(input);
  expect(await response.json()).toEqual({ id });
});
it("enforces five feedback sends per minute with Retry-After", async () => {
  vi.useFakeTimers();
  for (let i = 0; i < 5; i++)
    expect(
      (await POST(request({ source: "menu", skipped: false, liked: "okay" })))
        .status,
    ).toBe(200);
  const response = await POST(
    request({ source: "menu", skipped: false, liked: "okay" }),
  );
  expect(response.status).toBe(429);
  expect(response.headers.get("Retry-After")).toBe("60");
  expect(save).toHaveBeenCalledTimes(5);
});
it("checks dismissal separately from send limits and never exposes another user's comment", async () => {
  const response = await GET(
    new Request(`https://mockmeai.test/api/feedback?interviewId=${id}`),
  );
  expect(await response.json()).toEqual({ handled: true });
  expect(handled).toHaveBeenCalledWith(id);
  expect(
    (
      await GET(
        new Request("https://mockmeai.test/api/feedback?interviewId=wrong"),
      )
    ).status,
  ).toBe(400);
});
