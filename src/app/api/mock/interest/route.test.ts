import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "./route";
import { requireCandidateIdentity } from "@/lib/candidate-auth";
import { CandidateAuthError } from "@/lib/supabase-config";
import { CandidateInviteError } from "@/lib/candidate-invites";
const save = vi.hoisted(() => vi.fn());
vi.mock("@/lib/mock-access-store", () => ({ recordProInterest: save }));
beforeEach(() => save.mockReset().mockResolvedValue({ saved: true }));
const request = (body: unknown = {}, origin = "http://localhost") =>
  new Request("http://localhost/api/mock/interest", {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
it("protects Pro interest with sign-in, invitation and same-origin checks", async () => {
  vi.mocked(requireCandidateIdentity).mockRejectedValueOnce(
    new CandidateAuthError(),
  );
  expect((await POST(request())).status).toBe(401);
  vi.mocked(requireCandidateIdentity).mockRejectedValueOnce(
    new CandidateInviteError(),
  );
  expect((await POST(request())).status).toBe(403);
  expect((await POST(request({}, "https://unrelated.invalid"))).status).toBe(
    403,
  );
  expect(save).not.toHaveBeenCalled();
});
it("accepts only the verified owner and a small empty command", async () => {
  expect((await POST(request({ userId: crypto.randomUUID() }))).status).toBe(
    400,
  );
  expect((await POST(request({ comment: "x".repeat(1500) }))).status).toBe(413);
  expect((await POST(request())).status).toBe(200);
  expect(save).toHaveBeenCalledExactlyOnceWith(
    "11111111-1111-4111-8111-111111111111",
  );
});
it("limits interest requests without sending any email", async () => {
  for (let n = 0; n < 5; n++) expect((await POST(request())).status).toBe(200);
  const limited = await POST(request());
  expect(limited.status).toBe(429);
  expect(Number(limited.headers.get("Retry-After"))).toBeGreaterThan(0);
  expect(save).toHaveBeenCalledTimes(5);
});
