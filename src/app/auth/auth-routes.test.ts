import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.hoisted(() => vi.resetModules());
const auth = vi.hoisted(() => ({
  exchange: vi.fn(),
  signOut: vi.fn(),
  removeCookie: vi.fn(),
}));
vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: async () => ({
    auth: { exchangeCodeForSession: auth.exchange, signOut: auth.signOut },
  }),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => [
      { name: "inteliprep-auth", value: "fixture" },
      { name: "inteliprep-auth.0", value: "fixture" },
      { name: "preferences", value: "keep" },
    ],
    delete: auth.removeCookie,
  }),
}));
import { GET as callback } from "@/app/auth/callback/route";
import { POST as signOut } from "@/app/auth/sign-out/route";

beforeEach(() => {
  auth.exchange.mockResolvedValue({ error: null });
});
afterEach(() => {
  auth.exchange.mockReset();
  auth.signOut.mockReset();
  auth.removeCookie.mockReset();
});
describe("authentication callbacks", () => {
  it("exchanges the PKCE code and uses only a fixed same-origin return URL", async () => {
    const response = await callback(
      new Request(
        "https://beta.example/auth/callback?code=fixture-code&next=https://attacker.example",
      ),
    );
    expect(auth.exchange).toHaveBeenCalledWith("fixture-code");
    expect(response.headers.get("location")).toBe(
      "https://beta.example/interview",
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("handles missing, rejected and disconnected callbacks without reflecting private errors", async () => {
    for (const mode of ["missing", "rejected", "offline"]) {
      auth.exchange.mockResolvedValue({
        error: { message: "private provider data" },
      });
      if (mode === "offline")
        auth.exchange.mockRejectedValue(new Error("private provider data"));
      const response = await callback(
        new Request(
          `https://beta.example/auth/callback${mode === "missing" ? "" : "?code=fixture-code"}`,
        ),
      );
      expect(response.headers.get("location")).toBe(
        "https://beta.example/sign-in?error=1",
      );
      expect(await response.text()).not.toContain("private provider data");
    }
  });
  it("reports unavailable exchanges separately and logs no code, cookie or provider message", async () => {
    const diagnostic = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      auth.exchange.mockResolvedValue({
        error: {
          name: "AuthRetryableFetchError",
          status: 0,
          message: "private-provider-message",
        },
      });
      const response = await callback(
        new Request(
          "https://beta.example/auth/callback?code=private-auth-code",
        ),
      );
      expect(response.headers.get("location")).toBe(
        "https://beta.example/sign-in?error=connection",
      );
      expect(response.headers.get("X-Request-Id")).toMatch(/^[a-f0-9-]{36}$/);
      const logs = diagnostic.mock.calls.flat().join(" ");
      expect(logs).toContain("auth_exchange_connection");
      expect(logs).not.toContain("private-auth-code");
      expect(logs).not.toContain("private-provider-message");
    } finally {
      diagnostic.mockRestore();
    }
  });
  it("rejects foreign and missing origins before signing out", async () => {
    for (const origin of [undefined, "https://attacker.example"]) {
      const response = await signOut(
        new Request("https://beta.example/auth/sign-out", {
          method: "POST",
          headers: origin ? { origin } : {},
        }),
      );
      expect(response.status).toBe(403);
    }
    expect(auth.signOut).not.toHaveBeenCalled();
    expect(auth.removeCookie).not.toHaveBeenCalled();
  });
  it("clears only this app's auth cookies even if remote revocation fails", async () => {
    auth.signOut.mockRejectedValue(new Error("offline"));
    const response = await signOut(
      new Request("https://beta.example/auth/sign-out", {
        method: "POST",
        headers: { origin: "https://beta.example" },
      }),
    );
    expect(response.status).toBe(200);
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(auth.removeCookie.mock.calls.map((call) => call[0])).toEqual([
      "inteliprep-auth",
      "inteliprep-auth.0",
    ]);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
});
