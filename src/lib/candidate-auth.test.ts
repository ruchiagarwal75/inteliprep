import { afterEach, describe, expect, it, vi } from "vitest";
vi.hoisted(() => vi.resetModules());
vi.unmock("@/lib/candidate-auth");
const claims = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: async () => ({ auth: { getClaims: claims } }),
}));
import {
  candidateIdentity,
  requireCandidateIdentity,
} from "@/lib/candidate-auth";
import {
  authCookieOptions,
  supabaseConfiguration,
} from "@/lib/supabase-config";

afterEach(() => {
  claims.mockReset();
  vi.unstubAllEnvs();
});
describe("verified candidate identity", () => {
  it("uses secure, host-only cookies for deployed builds and supports local HTTP development", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(authCookieOptions()).toEqual({
      name: "inteliprep-auth",
      path: "/",
      sameSite: "lax",
      secure: true,
    });
    vi.stubEnv("NODE_ENV", "development");
    expect(authCookieOptions().secure).toBe(false);
  });
  it("uses the verified subject, ignoring editable metadata", async () => {
    claims.mockResolvedValue({
      data: {
        claims: {
          sub: "11111111-1111-4111-8111-111111111111",
          user_metadata: { ownerUserId: "another-user" },
        },
      },
      error: null,
    });
    expect(await requireCandidateIdentity()).toBe(
      "11111111-1111-4111-8111-111111111111",
    );
  });
  it("rejects missing, forged and anonymous identities", async () => {
    for (const response of [
      { data: null, error: { status: 400 } },
      { data: null, error: { status: 401 } },
      {
        data: {
          claims: {
            sub: "11111111-1111-4111-8111-111111111111",
            is_anonymous: true,
          },
        },
        error: null,
      },
      {
        data: {
          claims: {
            user_metadata: { sub: "11111111-1111-4111-8111-111111111111" },
          },
        },
        error: null,
      },
    ]) {
      claims.mockResolvedValue(response);
      expect(await candidateIdentity()).toBeUndefined();
      await expect(requireCandidateIdentity()).rejects.toMatchObject({
        status: 401,
      });
    }
  });
  it("fails closed during provider outages without returning provider details", async () => {
    claims.mockRejectedValue(new Error("private provider response"));
    await expect(requireCandidateIdentity()).rejects.toMatchObject({
      status: 503,
    });
    await expect(requireCandidateIdentity()).rejects.not.toThrow(
      "private provider",
    );
    claims.mockResolvedValue({ data: null, error: { status: 503 } });
    await expect(requireCandidateIdentity()).rejects.toMatchObject({
      status: 503,
    });
  });
  it("only accepts public configuration with an HTTPS project origin", () => {
    expect(supabaseConfiguration()).toBeDefined();
    for (const key of ["", "sb_secret_private", "legacy-service-role-jwt"]) {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", key);
      expect(supabaseConfiguration()).toBeUndefined();
    }
    vi.stubEnv(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "sb_publishable_example",
    );
    for (const url of [
      "http://example.supabase.co",
      "https://secret@example.supabase.co",
      "https://example.supabase.co/path",
      "https://example.supabase.co?token=x",
    ]) {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);
      expect(supabaseConfiguration()).toBeUndefined();
    }
  });
});
