import { afterEach, expect, it, vi } from "vitest";
import { adminQuery } from "@/lib/admin-query";
import { excludedUserIds } from "@/lib/admin-config";
afterEach(() => vi.unstubAllEnvs());
it("defaults to a bounded first page, excluding admin and tests", () => {
  expect(adminQuery(new URLSearchParams())).toEqual({
    search: "",
    page: 1,
    includeExcluded: false,
  });
  expect(
    adminQuery(
      new URLSearchParams(
        "search=a%25b%40example.com&page=2&includeExcluded=1",
      ),
    ),
  ).toEqual({ search: "a%b@example.com", page: 2, includeExcluded: true });
  for (const query of [
    "page=0",
    "page=NaN",
    "page=10000000",
    "search=" + "x".repeat(121),
  ])
    expect(() => adminQuery(new URLSearchParams(query))).toThrow();
});
it("excludes only server-configured valid account IDs", () => {
  vi.stubEnv("ADMIN_USER_ID", "99999999-9999-4999-8999-999999999999");
  vi.stubEnv(
    "ADMIN_TEST_USER_IDS",
    "11111111-1111-4111-8111-111111111111, invalid,99999999-9999-4999-8999-999999999999",
  );
  expect(excludedUserIds()).toEqual([
    "99999999-9999-4999-8999-999999999999",
    "11111111-1111-4111-8111-111111111111",
  ]);
});
