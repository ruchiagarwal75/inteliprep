import { afterEach, expect, it, vi } from "vitest";
import { unstable_getResponseFromNextConfig } from "next/experimental/testing/server";
import { domainRedirects } from "./domain-redirects";
import { oauthCallbackUrl } from "./oauth-callback";
afterEach(() => vi.unstubAllEnvs());
const response = (host: string, path = "/play/rag?topic=rag&tag=a") =>
  unstable_getResponseFromNextConfig({
    url: `https://${host}${path}`,
    nextConfig: { redirects: async () => domainRedirects() },
  });
it("redirects www to the apex with path and query values intact", async () => {
  const r = await response("www.shardling.com");
  expect(r.status).toBe(308);
  expect(r.headers.get("location")).toBe(
    "https://shardling.com/play/rag?topic=rag&tag=a",
  );
});
it.each(["", "0", "false"])(
  "keeps legacy host redirects off for %s",
  async (flag) => {
    vi.stubEnv("MOCKMEAI_REDIRECT_ENABLED", flag);
    for (const host of ["mockmeai.com", "www.mockmeai.com"])
      expect((await response(host)).headers.get("location")).toBeNull();
  },
);
it.each(["mockmeai.com", "www.mockmeai.com"])(
  "only redirects %s after explicit opt-in",
  async (host) => {
    vi.stubEnv("MOCKMEAI_REDIRECT_ENABLED", "1");
    const r = await response(host, "/interview/new?track=genai");
    expect(r.status).toBe(308);
    expect(r.headers.get("location")).toBe(
      "https://shardling.com/interview/new?track=genai",
    );
  },
);
it.each([
  "shardling.com",
  "www.shardling.com",
  "mockmeai.com",
  "www.mockmeai.com",
  "beta.example.test",
])("finishes OAuth on %s even when cutover is enabled", async (host) => {
  vi.stubEnv("MOCKMEAI_REDIRECT_ENABLED", "1");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://shardling.com");
  expect(
    (
      await response(host, "/auth/callback?code=test&next=%2Fadmin")
    ).headers.get("location"),
  ).toBeNull();
  expect(oauthCallbackUrl(`https://${host}`, "/admin")).toBe(
    `https://${host}/auth/callback?next=%2Fadmin`,
  );
});
it("never redirects unrelated hosts", async () => {
  vi.stubEnv("MOCKMEAI_REDIRECT_ENABLED", "1");
  expect(
    (await response("www.shardling.com.attacker.test")).headers.get("location"),
  ).toBeNull();
  expect((await response("shardling.com")).headers.get("location")).toBeNull();
});
