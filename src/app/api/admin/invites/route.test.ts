import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/admin/invites/route";
import { AdminAccessError } from "@/lib/admin-auth";
import { betaInviteChange } from "@/lib/beta-invite-input";
const { verify, list, save } = vi.hoisted(() => ({
  verify: vi.fn(),
  list: vi.fn(),
  save: vi.fn(),
}));
vi.mock("@/lib/admin-auth", async (original) => ({
  ...(await original<typeof import("@/lib/admin-auth")>()),
  requireAdminIdentity: verify,
}));
vi.mock("@/lib/admin-invites", () => ({
  adminInvites: list,
  setBetaInvite: save,
}));
beforeEach(() => {
  verify.mockResolvedValue("owner");
  save.mockImplementation(async (input) => ({
    invite: betaInviteChange.parse(input),
  }));
});
afterEach(() => vi.resetAllMocks());
function request(
  body: unknown,
  origin: string | null = "https://mockmeai.test",
) {
  return new Request("https://mockmeai.test/api/admin/invites", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(origin ? { origin } : {}),
    },
    body: JSON.stringify(body),
  });
}
it.each([401, 403, 503] as const)(
  "denies reads and writes before database work on admin failure %s",
  async (status) => {
    verify.mockRejectedValue(new AdminAccessError(status));
    expect(
      (await GET(new Request("https://mockmeai.test/api/admin/invites")))
        .status,
    ).toBe(status);
    expect(
      (await POST(request({ email: "person@example.test", approved: true })))
        .status,
    ).toBe(status);
    expect(save).not.toHaveBeenCalled();
    expect(list).not.toHaveBeenCalled();
  },
);
it.each([null, "https://attacker.test"])(
  "rejects a missing/foreign origin (%s)",
  async (origin) => {
    expect(
      (
        await POST(
          request({ email: "person@example.test", approved: true }, origin),
        )
      ).status,
    ).toBe(403);
    expect(save).not.toHaveBeenCalled();
  },
);
it("normalizes exact emails and returns no-store responses", async () => {
  const response = await POST(
    request({ email: " Person@Example.test ", approved: true }),
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    invite: { email: "person@example.test", approved: true },
  });
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
});
it.each([
  { email: "*", approved: true },
  { email: "person@example.test", approved: "true" },
  { email: "person@example.test", approved: true, admin: true },
])("rejects invalid input %j", async (body) => {
  expect((await POST(request(body))).status).toBe(400);
});
it("enforces body limits and rejects malformed JSON", async () => {
  expect(
    (await POST(request({ email: "x".repeat(2000), approved: true }))).status,
  ).toBe(413);
  expect(
    (
      await POST(
        new Request("https://mockmeai.test/api/admin/invites", {
          method: "POST",
          headers: {
            origin: "https://mockmeai.test",
            "Content-Type": "application/json",
          },
          body: "{",
        }),
      )
    ).status,
  ).toBe(400);
  expect(save).not.toHaveBeenCalled();
});
