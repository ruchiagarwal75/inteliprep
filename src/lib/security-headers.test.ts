import { afterEach, expect, it, vi } from "vitest";
import {
  pageContentSecurityPolicy,
  securityHeaders,
} from "@/lib/security-headers";
afterEach(() => vi.unstubAllEnvs());
it("denies framing and dangerous browser capabilities on every route", () => {
  const headers = Object.fromEntries(
    securityHeaders().map(({ key, value }) => [key, value]),
  );
  expect(headers["X-Frame-Options"]).toBe("DENY");
  expect(headers["Permissions-Policy"]).toContain("microphone=()");
  expect(headers["Content-Security-Policy"]).toContain("object-src 'none'");
});
it("requires the server nonce for scripts and restricts network origins in production", () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://auth.example.test");
  const policy = pageContentSecurityPolicy("random-request-nonce");
  const script = policy
    .split(";")
    .find((value) => value.trim().startsWith("script-src"));
  expect(script).toContain("'nonce-random-request-nonce'");
  expect(script).not.toContain("'unsafe-inline'");
  expect(script).not.toContain("'unsafe-eval'");
  expect(policy).toContain(
    "connect-src 'self' https://auth.example.test https://esm.sh",
  );
  expect(policy).toContain("frame-src 'none'");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "not-an-origin; connect-src *");
  expect(pageContentSecurityPolicy("n")).not.toContain("connect-src *");
});
