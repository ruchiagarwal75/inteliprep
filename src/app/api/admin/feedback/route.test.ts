import { afterEach, expect, it, vi } from "vitest";
import { GET } from "@/app/api/admin/feedback/route";
import { AdminAccessError } from "@/lib/admin-auth";
const { verify, list } = vi.hoisted(() => ({ verify: vi.fn(), list: vi.fn() }));
vi.mock("@/lib/admin-auth", async (original) => ({
  ...(await original<typeof import("@/lib/admin-auth")>()),
  requireAdminIdentity: verify,
}));
vi.mock("@/lib/admin-practice-feedback", () => ({
  adminPracticeFeedback: list,
}));
afterEach(() => vi.resetAllMocks());
it.each([401, 403] as const)(
  "protects direct admin feedback reads (%s)",
  async (status) => {
    verify.mockRejectedValue(new AdminAccessError(status));
    expect(
      (await GET(new Request("https://mockmeai.test/api/admin/feedback")))
        .status,
    ).toBe(status);
    expect(list).not.toHaveBeenCalled();
  },
);
it("validates search and pagination and disables caching", async () => {
  verify.mockResolvedValue("owner");
  list.mockResolvedValue({ entries: [] });
  const response = await GET(
    new Request(
      "https://mockmeai.test/api/admin/feedback?search=hello&includeExcluded=1&page=2",
    ),
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(list).toHaveBeenCalledWith({
    search: "hello",
    includeExcluded: true,
    page: 2,
  });
  expect(
    (await GET(new Request("https://mockmeai.test/api/admin/feedback?page=0")))
      .status,
  ).toBe(400);
});
