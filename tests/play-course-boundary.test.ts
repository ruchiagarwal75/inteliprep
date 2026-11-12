import { beforeEach, expect, it, vi } from "vitest";
import { POST as start } from "@/app/api/play/round/route";
import { POST as submit } from "@/app/api/play/submit/route";
import { POST as slides } from "@/app/api/play/slides/route";
import { requireCandidateIdentity } from "@/lib/candidate-auth";
import { CandidateAuthError } from "@/lib/supabase-config";
import { CandidateInviteError } from "@/lib/candidate-invites";
const calls = vi.hoisted(() => ({
  start: vi.fn(),
  submit: vi.fn(),
  slides: vi.fn(),
  guard: vi.fn(),
}));
vi.mock("@/lib/play/rounds", () => ({
  startRound: calls.start,
  getRound: vi.fn(),
}));
vi.mock("@/lib/play/submit", () => ({ submitRoundAnswer: calls.submit }));
vi.mock("@/lib/play/course/visits", () => ({ seeCourseSlide: calls.slides }));
vi.mock("@/lib/play/course/access", async (original) => ({
  ...(await original<typeof import("@/lib/play/course/access")>()),
  requireCourseAttempt: calls.guard,
}));
beforeEach(() => {
  vi.clearAllMocks();
  calls.guard.mockResolvedValue(undefined);
  calls.slides.mockResolvedValue({ complete: false, seenThrough: 0 });
});
function request(path: string, body: unknown) {
  return new Request(`http://localhost/api/play/${path}`, {
    method: "POST",
    headers: { origin: "http://localhost", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
it("retired topics cannot start written or math-entry rounds", async () => {
  const response = await start(
    request("round", {
      topic: "rag",
      mode: "level",
      level: 1,
      requestId: crypto.randomUUID(),
      timeZone: "UTC",
    }),
  );
  expect(response.status).toBe(410);
  expect(calls.start).not.toHaveBeenCalled();
});
it("checks stored course ownership before any grade command", async () => {
  const { PlayError } = await import("@/lib/play/errors");
  calls.guard.mockRejectedValueOnce(
    new PlayError("Those rounds are retired.", 410),
  );
  expect(
    (
      await submit(
        request("submit", {
          attemptId: crypto.randomUUID(),
          answer: { type: "pick_probe", text: "A retired answer" },
        }),
      )
    ).status,
  ).toBe(410);
  expect(calls.submit).not.toHaveBeenCalled();
});
it("requires sign-in, invitation and same origin on slide writes", async () => {
  vi.mocked(requireCandidateIdentity).mockRejectedValueOnce(
    new CandidateAuthError(),
  );
  expect((await slides(request("slides", { level: 1, index: 0 }))).status).toBe(
    401,
  );
  vi.mocked(requireCandidateIdentity).mockRejectedValueOnce(
    new CandidateInviteError(),
  );
  expect((await slides(request("slides", { level: 1, index: 0 }))).status).toBe(
    403,
  );
  const foreign = request("slides", { level: 1, index: 0 });
  foreign.headers.set("origin", "https://foreign.test");
  expect((await slides(foreign)).status).toBe(403);
  expect(calls.slides).not.toHaveBeenCalled();
});
it("accepts only slide position, never a claimed score or unlock", async () => {
  expect(
    (await slides(request("slides", { level: 1, index: 0, points: 100 })))
      .status,
  ).toBe(400);
  expect((await slides(request("slides", { level: 1, index: 0 }))).status).toBe(
    200,
  );
  expect(calls.slides).toHaveBeenCalledWith(
    "11111111-1111-4111-8111-111111111111",
    1,
    0,
  );
});
