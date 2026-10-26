import { afterEach, describe, expect, it, vi } from "vitest";
vi.hoisted(() => vi.resetModules());
import type { CookieOptions } from "@supabase/ssr";
const refreshed = vi.hoisted(() => vi.fn());
vi.mock("@supabase/ssr", () => ({
  createServerClient: (
    _url: string,
    _key: string,
    options: {
      cookies: {
        setAll: (
          changes: { name: string; value: string; options: CookieOptions }[],
          headers: Record<string, string>,
        ) => void;
      };
    },
  ) => ({
    auth: {
      getClaims: async () => {
        options.cookies.setAll(
          [
            {
              name: "inteliprep-auth",
              value: "refreshed-fixture",
              options: { path: "/" },
            },
          ],
          { expires: "0", pragma: "no-cache" },
        );
        refreshed();
        return { data: { claims: { sub: "fixture" } }, error: null };
      },
    },
  }),
}));
import { NextRequest } from "next/server";
import { proxy, config } from "@/proxy";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";

afterEach(() => {
  refreshed.mockReset();
  vi.unstubAllEnvs();
});
describe("authentication cookie refresh", () => {
  it("passes refreshed cookies to both the handler and browser, with cache protection", async () => {
    const request = new NextRequest("https://beta.example/interview");
    const response = await proxy(request);
    expect(refreshed).toHaveBeenCalledOnce();
    expect(request.cookies.get("inteliprep-auth")?.value).toBe(
      "refreshed-fixture",
    );
    expect(response.cookies.get("inteliprep-auth")?.value).toBe(
      "refreshed-fixture",
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("pragma")).toBe("no-cache");
  });
  it("matches every interview/auth resource but leaves static assets and public health alone", () => {
    for (const path of [
      "/interview",
      "/sign-in",
      "/auth/callback",
      "/auth/sign-out",
      "/api/chat",
      "/api/interview/start",
      "/api/interview/end",
      "/api/interview/resume",
    ])
      expect(
        unstable_doesMiddlewareMatch({
          config,
          url: `https://beta.example${path}`,
        }),
      ).toBe(true);
    for (const path of [
      "/_next/static/app.js",
      "/favicon.ico",
      "/api/health",
      "/api/problems",
    ])
      expect(
        unstable_doesMiddlewareMatch({
          config,
          url: `https://beta.example${path}`,
        }),
      ).toBe(false);
  });
});
