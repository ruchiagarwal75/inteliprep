import { beforeEach, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => ({ oauth: vi.fn(), remove: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: async () => ({ auth: { signInWithOAuth: auth.oauth } }),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ delete: auth.remove }),
}));
import { POST } from "./route";
function request(
  body: unknown = {},
  origin: string | null = "https://shardling.com",
) {
  return new Request("https://shardling.com/auth/google", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(origin ? { origin } : {}),
    },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  auth.oauth.mockResolvedValue({
    data: { url: "https://auth.example.test/authorize" },
    error: null,
  });
});
it("starts normal Google OAuth and clears only a stale guest-link marker", async () => {
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    url: "https://auth.example.test/authorize",
  });
  expect(auth.oauth).toHaveBeenCalledWith({
    provider: "google",
    options: {
      redirectTo: "https://shardling.com/auth/callback",
      scopes: "openid email profile",
      skipBrowserRedirect: true,
    },
  });
  expect(auth.remove.mock.calls).toEqual([["shardling-guest-link"]]);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
});
it.each([null, "https://foreign.example.test"])(
  "rejects an untrusted origin %s before changing cookies",
  async (origin) => {
    expect((await POST(request({}, origin))).status).toBe(403);
    expect(auth.oauth).not.toHaveBeenCalled();
    expect(auth.remove).not.toHaveBeenCalled();
  },
);
it("allowlists the admin destination and rejects external or unknown input", async () => {
  expect((await POST(request({ next: "/admin" }))).status).toBe(200);
  expect(auth.oauth).toHaveBeenLastCalledWith(
    expect.objectContaining({
      options: expect.objectContaining({
        redirectTo: "https://shardling.com/auth/callback?next=%2Fadmin",
      }),
    }),
  );
  auth.oauth.mockClear();
  for (const body of [
    { next: "https://foreign.example.test" },
    { userId: "someone" },
    { guest: true },
  ])
    expect((await POST(request(body))).status).toBe(400);
  expect(auth.oauth).not.toHaveBeenCalled();
});
it("keeps the guest marker and session untouched when OAuth cannot start", async () => {
  auth.oauth.mockResolvedValue({
    data: { url: null },
    error: { message: "private-provider-error" },
  });
  const response = await POST(request());
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("private-provider-error");
  expect(auth.remove).not.toHaveBeenCalled();
});
