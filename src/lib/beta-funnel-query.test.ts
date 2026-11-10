import { expect, it } from "vitest";
import { betaFunnelQuery, FUNNEL_STEPS } from "@/lib/beta-funnel-query";
it("offers exactly seven steps and inclusive UTC calendar-date filters", () => {
  expect(FUNNEL_STEPS).toHaveLength(7);
  const query = betaFunnelQuery(
    new URLSearchParams({ from: "2026-11-01", to: "2026-11-09" }),
  );
  expect(query.until).toBe("2026-11-10T00:00:00.000Z");
  expect(
    betaFunnelQuery(new URLSearchParams(), Date.parse("2026-11-09T23:00:00Z")),
  ).toMatchObject({ from: "2026-11-03", to: "2026-11-09" });
});
it.each([
  { from: "bad" },
  { from: "2026-11-10", to: "2026-11-01" },
  { page: "0" },
])("rejects invalid filters %j", (input) => {
  expect(() =>
    betaFunnelQuery(
      new URLSearchParams(
        Object.entries(input).map(([key, value]) => [key, String(value)]),
      ),
    ),
  ).toThrow();
});
