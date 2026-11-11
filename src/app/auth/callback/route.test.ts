import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.hoisted(() => vi.resetModules());
const { exchange, invite } = vi.hoisted(() => ({
  exchange: vi.fn(),
  invite: vi.fn(),
}));
vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: async () => ({ auth: { exchangeCodeForSession: exchange } }),
}));
vi.mock("@/lib/candidate-invites", async (original) => ({
  ...(await original<typeof import("@/lib/candidate-invites")>()),
  requireCandidateInvite: invite,
}));
import { GET } from "@/app/auth/callback/route";
import { CandidateInviteError } from "@/lib/candidate-invites";
import { CandidateAuthError } from "@/lib/supabase-config";
beforeEach(() => {
  exchange.mockResolvedValue({
    data: { user: { id: "person", email: "person@example.test" } },
    error: null,
  });
  invite.mockResolvedValue(undefined);
});
afterEach(() => vi.resetAllMocks());
it("waits for database authorization before redirecting into an interview", async () => {
  const r = await GET(
    new Request("https://mockmeai.test/auth/callback?code=fixture"),
  );
  expect(r.headers.get("location")).toBe("https://mockmeai.test/play");
  expect(invite).toHaveBeenCalledOnce();
});
it("redirects an unapproved account to the invitation notice", async () => {
  invite.mockRejectedValue(new CandidateInviteError());
  const r = await GET(
    new Request(
      "https://mockmeai.test/auth/callback?code=fixture&next=https://attacker.test",
    ),
  );
  expect(r.headers.get("location")).toBe("https://mockmeai.test/not-invited");
});
it("does not grant access or falsely report uninvited status on a database outage", async () => {
  invite.mockRejectedValue(new CandidateAuthError(503));
  const r = await GET(
    new Request("https://mockmeai.test/auth/callback?code=fixture"),
  );
  expect(r.headers.get("location")).toContain("/sign-in?error=");
  expect(r.headers.get("Cache-Control")).toBe("private, no-store");
});
