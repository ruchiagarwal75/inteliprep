import { beforeEach, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
import { POST as views } from "../views/route";
import { requireCandidateIdentity } from "@/lib/candidate-auth";
import { CandidateAuthError } from "@/lib/supabase-config";
import { CandidateInviteError } from "@/lib/candidate-invites";
const store = vi.hoisted(() => ({
  mockTrials: vi.fn(),
  requestMockTrial: vi.fn(),
  recordMockViews: vi.fn(),
}));
vi.mock("@/lib/mock-trial-store", () => store);
beforeEach(() => {
  store.mockTrials.mockResolvedValue([]);
  store.requestMockTrial.mockResolvedValue([]);
  store.recordMockViews.mockResolvedValue({ saved: true });
});
const request = (body: unknown, origin = "http://localhost") =>
  new Request("http://localhost/api/mock/requests", {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
it("checks authentication, invitation and same-origin ownership", async () => {
  vi.mocked(requireCandidateIdentity).mockRejectedValueOnce(
    new CandidateAuthError(),
  );
  expect((await POST(request({ problemId: "url-shortener" }))).status).toBe(
    401,
  );
  vi.mocked(requireCandidateIdentity).mockRejectedValueOnce(
    new CandidateInviteError(),
  );
  expect(
    (await GET(new Request("http://localhost/api/mock/requests"))).status,
  ).toBe(403);
  expect(
    (
      await POST(
        request({ problemId: "url-shortener" }, "https://wrong.invalid"),
      )
    ).status,
  ).toBe(403);
});
it("accepts known problems and rejects smuggled owners, unknown IDs and oversized bodies", async () => {
  expect((await POST(request({ problemId: "not-a-problem" }))).status).toBe(
    404,
  );
  expect(
    (
      await POST(
        request({ problemId: "url-shortener", userId: crypto.randomUUID() }),
      )
    ).status,
  ).toBe(400);
  expect((await POST(request({ problemId: "x".repeat(2000) }))).status).toBe(
    413,
  );
  expect((await POST(request({ problemId: "url-shortener" }))).status).toBe(
    200,
  );
  expect(store.requestMockTrial).toHaveBeenCalledWith(
    "11111111-1111-4111-8111-111111111111",
    "url-shortener",
  );
  expect(
    (await views(request({ problemIds: ["url-shortener", "file-storage"] })))
      .status,
  ).toBe(200);
  expect((await views(request({ problemIds: ["not-a-problem"] }))).status).toBe(
    404,
  );
  expect(
    (await views(request({ problemIds: Array(21).fill("url-shortener") })))
      .status,
  ).toBe(400);
});
it("limits batches and requests with a retry time", async () => {
  for (let n = 0; n < 20; n++)
    expect((await POST(request({ problemId: "url-shortener" }))).status).toBe(
      200,
    );
  const response = await POST(request({ problemId: "url-shortener" }));
  expect(response.status).toBe(429);
  expect(Number(response.headers.get("Retry-After"))).toBeGreaterThan(0);
});
