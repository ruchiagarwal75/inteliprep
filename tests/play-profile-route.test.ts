import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "@/app/api/play/profile/route";
import { requireCandidateIdentity } from "@/lib/candidate-auth";
import { CandidateAuthError } from "@/lib/supabase-config";
import { CandidateInviteError } from "@/lib/candidate-invites";
const update = vi.hoisted(() => vi.fn());
vi.mock("@/lib/play/player", async (original) => ({
  ...(await original<typeof import("@/lib/play/player")>()),
  updatePlayer: update,
}));
beforeEach(() => update.mockReset().mockResolvedValue({ points: 0 }));
const request = (body: unknown) =>
  new Request("http://localhost/api/play/profile", {
    method: "POST",
    headers: { origin: "http://localhost", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
it("rejects signed-out and uninvited users before writing", async () => {
  vi.mocked(requireCandidateIdentity).mockRejectedValueOnce(
    new CandidateAuthError(),
  );
  expect((await POST(request({ timeZone: "UTC" }))).status).toBe(401);
  vi.mocked(requireCandidateIdentity).mockRejectedValueOnce(
    new CandidateInviteError(),
  );
  expect((await POST(request({ timeZone: "UTC" }))).status).toBe(403);
  expect(update).not.toHaveBeenCalled();
});
it("uses the verified account and rejects forged outcomes", async () => {
  expect(
    (
      await POST(
        request({ timeZone: "UTC", userId: crypto.randomUUID(), points: 500 }),
      )
    ).status,
  ).toBe(400);
  expect((await POST(request({ timeZone: "UTC" }))).status).toBe(200);
  expect(update).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111", {
    timeZone: "UTC",
  });
});
