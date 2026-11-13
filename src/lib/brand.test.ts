import { afterEach, expect, it, vi } from "vitest";
import { BRAND } from "./brand";
afterEach(() => vi.unstubAllEnvs());
it("keeps product identity together and derives its URL from the domain", () => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
  expect(BRAND.name).toBe("Shardling");
  expect(BRAND.url).toBe(`https://${BRAND.domain}`);
  expect(BRAND.tagline).toBe("Level up for the AI engineer interview.");
  expect(BRAND.pitch).toBe(
    "Train in 5-minute rounds, watch your readiness map fill in, then prove it in a real mock interview.",
  );
});
it("uses a configured canonical origin without changing the brand or OAuth host", () => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://shardling.com/");
  expect(BRAND.url).toBe("https://shardling.com");
  expect(BRAND.domain).toBe("shardling.com");
});
it.each([
  "javascript:alert(1)",
  "https://user:pass@example.test",
  "https://example.test/path",
  "https://example.test/?query=1",
  "https://example.test/#hash",
])("rejects a non-origin site URL: %s", (value) => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", value);
  expect(() => BRAND.url).toThrow();
});
