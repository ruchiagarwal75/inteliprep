import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.hoisted(() => vi.resetModules());
import { requireCandidateInvite } from "@/lib/candidate-invites";
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: async () => ({ rpc }),
}));
beforeEach(() => rpc.mockResolvedValue({ data: false, error: null }));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});
it("fails closed without database approval and always permits the configured admin", async () => {
  vi.stubEnv("ADMIN_USER_ID", "99999999-9999-4999-8999-999999999999");
  await expect(
    requireCandidateInvite("other", "owner@example.test"),
  ).rejects.toMatchObject({ status: 403 });
  rpc.mockClear();
  await expect(
    requireCandidateInvite("99999999-9999-4999-8999-999999999999", undefined),
  ).resolves.toBeUndefined();
  expect(rpc).not.toHaveBeenCalled();
});
it("checks the signed-in user without accepting an email RPC parameter", async () => {
  rpc.mockResolvedValue({ data: true, error: null });
  await expect(
    requireCandidateInvite("other", " Invited@Example.test "),
  ).resolves.toBeUndefined();
  expect(rpc).toHaveBeenCalledExactlyOnceWith("is_beta_invited");
});
it("rechecks every time so revocation needs no deployment or token refresh", async () => {
  rpc
    .mockResolvedValueOnce({ data: true, error: null })
    .mockResolvedValueOnce({ data: false, error: null });
  await requireCandidateInvite("other", "invited@example.test");
  await expect(
    requireCandidateInvite("other", "invited@example.test"),
  ).rejects.toMatchObject({ status: 403 });
  expect(rpc).toHaveBeenCalledTimes(2);
});
it("never uses the old environment list or editable metadata as approval", async () => {
  vi.stubEnv("MOCKMEAI_INVITED_EMAILS", "invited@example.test");
  await expect(
    requireCandidateInvite("other", "invited@example.test"),
  ).rejects.toMatchObject({ status: 403 });
  rpc.mockClear();
  for (const email of [
    undefined,
    { email: "invited@example.test" },
    "*",
    "not an email",
  ])
    await expect(requireCandidateInvite("other", email)).rejects.toMatchObject({
      status: 403,
    });
  expect(rpc).not.toHaveBeenCalled();
});
it("reports database outages as unavailable without exposing details", async () => {
  for (const result of [
    { data: null, error: { message: "private detail" } },
    { data: "true", error: null },
    { data: null, error: null },
  ]) {
    rpc.mockResolvedValue(result);
    await expect(
      requireCandidateInvite("other", "invited@example.test"),
    ).rejects.toMatchObject({ status: 503 });
  }
  rpc.mockRejectedValue(new Error("private database detail"));
  await expect(
    requireCandidateInvite("other", "invited@example.test"),
  ).rejects.not.toThrow("private");
});
