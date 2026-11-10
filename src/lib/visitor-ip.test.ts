import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { requestVisitorIpHash, visitorIpConfigured } from "@/lib/visitor-ip";
const request = (ip: string, header = "x-vercel-forwarded-for") =>
  new Request("https://mockmeai.com/api/monitoring/viewer", {
    headers: { [header]: ip },
  });
beforeEach(() => {
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("VISITOR_IP_HASH_SECRET", "fixture-only-key-".repeat(3));
});
afterEach(() => vi.unstubAllEnvs());
it("uses stable keyed pseudonyms without exposing the IP or reusing a provider/resume key", () => {
  const first = requestVisitorIpHash(request("192.0.2.1"));
  expect(first).toMatch(/^[a-f0-9]{64}$/u);
  expect(first).not.toContain("192.0.2.1");
  expect(requestVisitorIpHash(request("192.0.2.1"))).toBe(first);
  expect(requestVisitorIpHash(request("192.0.2.2"))).not.toBe(first);
  vi.stubEnv("INTERVIEW_RESUME_SECRET", "another-resume-key");
  vi.stubEnv("OPENAI_KEY", "another-provider-key");
  expect(requestVisitorIpHash(request("192.0.2.1"))).toBe(first);
  vi.stubEnv("VISITOR_IP_HASH_SECRET", "another-ip-key-".repeat(3));
  expect(requestVisitorIpHash(request("192.0.2.1"))).not.toBe(first);
});
it("normalizes equivalent IPv6 representations and IPv4-mapped IPv6", () => {
  expect(requestVisitorIpHash(request("2001:0DB8:0:0:0:0:0:1"))).toBe(
    requestVisitorIpHash(request("2001:db8::1")),
  );
  expect(requestVisitorIpHash(request("::ffff:192.0.2.1"))).toBe(
    requestVisitorIpHash(request("192.0.2.1")),
  );
});
it.each(["", "not-an-ip", "192.0.2.1, 192.0.2.2", "fe80::1%eth0"])(
  "skips invalid/non-public-platform formats (%s) without throwing",
  (ip) => {
    expect(requestVisitorIpHash(request(ip))).toBeUndefined();
  },
);
it("ignores forwarded headers outside Vercel and does not invent an address", () => {
  expect(
    requestVisitorIpHash(request("192.0.2.1", "x-forwarded-for")),
  ).toBeUndefined();
  vi.stubEnv("VERCEL", "");
  expect(visitorIpConfigured()).toBe(false);
  expect(requestVisitorIpHash(request("192.0.2.1"))).toBeUndefined();
});
it.each(["", "short"])(
  "does not fall back to other credentials when its own secret is missing (%s)",
  (key) => {
    vi.stubEnv("VISITOR_IP_HASH_SECRET", key);
    vi.stubEnv("INTERVIEW_RESUME_SECRET", "s".repeat(40));
    vi.stubEnv("OPENAI_KEY", "provider-key");
    expect(visitorIpConfigured()).toBe(false);
    expect(requestVisitorIpHash(request("192.0.2.1"))).toBeUndefined();
  },
);
