import { expect, it, vi } from "vitest";
import { POST } from "./route";
import { AdminAccessError, requireAdminIdentity } from "@/lib/admin-auth";
const change = vi.hoisted(() => vi.fn(async () => ({ saved: true })));
vi.mock("@/lib/admin-mock-trial-write", () => ({ changeMockTrial: change }));
vi.mock("@/lib/admin-auth", async (original) => ({
  ...(await original<typeof import("@/lib/admin-auth")>()),
  requireAdminIdentity: vi.fn(),
}));
const request = (origin = "http://localhost") =>
  new Request("http://localhost/api/admin/mock-requests", {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: "{}",
  });
it("rejects signed-out and non-admin requests, plus cross-origin admin writes", async () => {
  vi.mocked(requireAdminIdentity).mockRejectedValueOnce(
    new AdminAccessError(401),
  );
  expect((await POST(request())).status).toBe(401);
  vi.mocked(requireAdminIdentity).mockRejectedValueOnce(
    new AdminAccessError(403),
  );
  expect((await POST(request())).status).toBe(403);
  vi.mocked(requireAdminIdentity).mockResolvedValue(
    "99999999-9999-4999-8999-999999999999",
  );
  expect((await POST(request("https://wrong.invalid"))).status).toBe(403);
  expect(change).not.toHaveBeenCalled();
  expect((await POST(request())).status).toBe(200);
  expect(change).toHaveBeenCalledOnce();
});
