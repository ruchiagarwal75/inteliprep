import { expect, it } from "vitest";
import { BRAND } from "./brand";
it("keeps product identity together and derives its URL from the domain", () => {
  expect(BRAND.url).toBe(`https://${BRAND.domain}`);
  expect(BRAND.tagline).toBe("Level up for the AI engineer interview.");
  expect(BRAND.pitch).toBe(
    "Train in 5-minute rounds, watch your readiness map fill in, then prove it in a real mock interview.",
  );
});
