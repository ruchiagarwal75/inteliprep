import { beforeEach, expect, it, vi } from "vitest";
import { adminTopicRatings } from "./admin-topic-ratings";
import { adminQuery } from "./admin-query";
const h = vi.hoisted(() => ({ auth: vi.fn(), sql: vi.fn() }));
vi.mock("./admin-auth", () => ({ requireAdminIdentity: h.auth }));
vi.mock("./reporting-db", () => ({ reportingDb: () => h.sql }));
beforeEach(() => {
  h.auth.mockReset();
  h.sql.mockReset();
});
it("requires admin identity before any rating data access", async () => {
  h.auth.mockRejectedValue(new Error("restricted"));
  await expect(
    adminTopicRatings(adminQuery(new URLSearchParams())),
  ).rejects.toThrow("restricted");
  expect(h.sql).not.toHaveBeenCalled();
});
