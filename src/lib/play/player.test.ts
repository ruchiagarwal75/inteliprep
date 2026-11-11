import { expect, it } from "vitest";
import { profileInputSchema } from "./player";
it("accepts an IANA zone and a chosen bar without any score fields", () => {
  expect(
    profileInputSchema.safeParse({
      timeZone: "America/Los_Angeles",
      level: "staff",
    }).success,
  ).toBe(true);
  expect(profileInputSchema.safeParse({ timeZone: "not/a-zone" }).success).toBe(
    false,
  );
  expect(
    profileInputSchema.safeParse({ timeZone: "UTC", points: 100 }).success,
  ).toBe(false);
});
