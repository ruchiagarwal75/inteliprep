import { expect, it, vi } from "vitest";
vi.unmock("@/lib/candidate-context");
import { anonymousIpNetwork, canonicalIp } from "@/lib/ip-address";
import { requestIdentity, REQUEST_LIMITS } from "@/lib/request-limits";
it("groups anonymous IPv6 /64 hosts, keeping IPv4 and mapped IPv4 equivalent", () => {
  expect(anonymousIpNetwork("2001:db8:abcd:1234::1")).toBe(
    anonymousIpNetwork("2001:0db8:abcd:1234:ffff:ffff:ffff:ffff"),
  );
  expect(anonymousIpNetwork("2001:db8:abcd:1235::1")).not.toBe(
    anonymousIpNetwork("2001:db8:abcd:1234::1"),
  );
  expect(anonymousIpNetwork("::1")).toBe("0000:0000:0000:0000::/64");
  expect(anonymousIpNetwork("192.0.2.1")).toBe("192.0.2.1");
  expect(anonymousIpNetwork("::ffff:192.0.2.1")).toBe("192.0.2.1");
  expect(canonicalIp("2001:db8::1")).not.toBe(canonicalIp("2001:db8::2"));
  expect(anonymousIpNetwork("not an address")).toBeUndefined();
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("INTERVIEW_RESUME_SECRET", "test-only-key".repeat(3));
  const identity = (ip: string) =>
    requestIdentity(
      new Request("https://example.test", {
        headers: { "x-vercel-forwarded-for": ip },
      }),
    );
  try {
    expect(identity("2001:db8:1:2::a")).toBe(identity("2001:db8:1:2::b"));
    expect(identity("192.0.2.1")).toBe(identity("::ffff:192.0.2.1"));
    expect(REQUEST_LIMITS.viewer[2]).toBe(50);
  } finally {
    vi.unstubAllEnvs();
  }
});
