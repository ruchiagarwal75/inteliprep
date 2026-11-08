import { afterEach, expect, it, vi } from "vitest";
import { requireCandidateInvite } from "@/lib/candidate-invites";
afterEach(() => vi.unstubAllEnvs());
it("fails closed with a missing list and accepts only the configured admin ID", () => {
  vi.stubEnv("MOCKMEAI_INVITED_EMAILS", "");
  vi.stubEnv("ADMIN_USER_ID", "99999999-9999-4999-8999-999999999999");
  expect(() => requireCandidateInvite("other", "owner@example.test")).toThrow(
    "not invited",
  );
  expect(() =>
    requireCandidateInvite("99999999-9999-4999-8999-999999999999", undefined),
  ).not.toThrow();
});
it("matches exact verified emails with case normalization, never domains or metadata", () => {
  vi.stubEnv(
    "MOCKMEAI_INVITED_EMAILS",
    " Invited@Example.test, second@example.test\nthird@example.test",
  );
  expect(() =>
    requireCandidateInvite("other", "invited@example.test"),
  ).not.toThrow();
  for (const value of [
    "other@example.test",
    "invited@example.test.attacker.test",
    { email: "invited@example.test" },
    undefined,
  ])
    expect(() => requireCandidateInvite("other", value)).toThrow("not invited");
});
