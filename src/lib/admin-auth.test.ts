import { afterEach, describe, expect, it, vi } from "vitest";
import { requireAdminIdentity } from "@/lib/admin-auth";
import { adminRead } from "@/lib/admin-api";
const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: async () => ({ auth: { getUser } }),
}));
const owner = "99999999-9999-4999-8999-999999999999";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});
describe("private admin authorization", () => {
  it("fails closed when the single configured account is missing or invalid", async () => {
    vi.stubEnv("ADMIN_USER_ID", "");
    await expect(requireAdminIdentity()).rejects.toMatchObject({ status: 403 });
    vi.stubEnv("ADMIN_USER_ID", "*");
    await expect(requireAdminIdentity()).rejects.toMatchObject({ status: 403 });
    expect(getUser).not.toHaveBeenCalled();
  });
  it("uses a fresh Auth user and ignores user-editable admin claims", async () => {
    vi.stubEnv("ADMIN_USER_ID", owner);
    getUser.mockResolvedValue({
      data: {
        user: {
          id: "11111111-1111-4111-8111-111111111111",
          user_metadata: { admin: true, role: "admin" },
        },
      },
    });
    await expect(requireAdminIdentity()).rejects.toMatchObject({ status: 403 });
    getUser.mockResolvedValue({
      data: { user: { id: owner, is_anonymous: false } },
    });
    expect(await requireAdminIdentity()).toBe(owner);
  });
  it.each([
    { user: null, status: 401 },
    { user: { id: owner, is_anonymous: true }, status: 401 },
  ])("rejects missing/anonymous identities (%j)", async (fixture) => {
    vi.stubEnv("ADMIN_USER_ID", owner);
    getUser.mockResolvedValue({ data: { user: fixture.user } });
    await expect(requireAdminIdentity()).rejects.toMatchObject({
      status: fixture.status,
    });
  });
  it("does not read data through a direct API call by another account", async () => {
    vi.stubEnv("ADMIN_USER_ID", owner);
    getUser.mockResolvedValue({ data: { user: { id: "other" } } });
    const read = vi.fn();
    const response = await adminRead(read)(
      new Request("http://localhost/api/admin/users?includeExcluded=1"),
    );
    expect(response.status).toBe(403);
    expect(read).not.toHaveBeenCalled();
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
  it("returns unavailable on an Auth outage, never authorizing from a cached cookie", async () => {
    vi.stubEnv("ADMIN_USER_ID", owner);
    getUser.mockRejectedValue(new Error("secret auth details"));
    const response = await adminRead(vi.fn())(
      new Request("http://localhost/api/admin/overview"),
    );
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("secret");
  });
});
