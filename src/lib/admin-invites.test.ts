import { expect, it } from "vitest";
import { adminInviteQuery } from "@/lib/admin-invites";
it("keeps pending-account and invitation pages independent with a shared search", () => {
  expect(adminInviteQuery(new URLSearchParams())).toMatchObject({
    search: "",
    page: 1,
    pendingPage: 1,
  });
  expect(
    adminInviteQuery(
      new URLSearchParams({
        search: " person@example.test ",
        page: "2",
        pendingPage: "3",
      }),
    ),
  ).toMatchObject({ search: "person@example.test", page: 2, pendingPage: 3 });
});
it.each(["0", "-1", "100001", "invalid"])(
  "rejects an invalid pending page %s",
  (page) => {
    expect(() =>
      adminInviteQuery(new URLSearchParams({ pendingPage: page })),
    ).toThrow();
  },
);
