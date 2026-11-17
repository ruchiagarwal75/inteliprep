import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.hoisted(() => vi.resetModules());
const { exchange, invite, jar, upgraded } = vi.hoisted(() => ({
  exchange: vi.fn(),
  invite: vi.fn(),
  jar: new Map<string, string>(),
  upgraded: vi.fn(),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      jar.has(name) ? { name, value: jar.get(name) } : undefined,
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
    set: (name: string, value: string) => {
      jar.set(name, value);
    },
    delete: (name: string) => {
      jar.delete(name);
    },
  }),
}));
vi.mock("@/lib/play/guest-events", () => ({ recordGuestUpgrade: upgraded }));
vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: async () => ({ auth: { exchangeCodeForSession: exchange } }),
}));
vi.mock("@/lib/candidate-invites", async (original) => ({
  ...(await original<typeof import("@/lib/candidate-invites")>()),
  requireCandidateInvite: invite,
}));
import { GET } from "@/app/auth/callback/route";
import { CandidateInviteError } from "@/lib/candidate-invites";
import { CandidateAuthError } from "@/lib/supabase-config";
beforeEach(() => {
  jar.clear();
  upgraded.mockResolvedValue(undefined);
  exchange.mockResolvedValue({
    data: { user: { id: "person", email: "person@example.test" } },
    error: null,
  });
  invite.mockResolvedValue(undefined);
});
afterEach(() => vi.resetAllMocks());
it("waits for database authorization before redirecting into an interview", async () => {
  const r = await GET(
    new Request("https://mockmeai.test/auth/callback?code=fixture"),
  );
  expect(r.headers.get("location")).toBe("https://mockmeai.test/play");
  expect(invite).toHaveBeenCalledOnce();
});
it("redirects an unapproved account to the invitation notice", async () => {
  invite.mockRejectedValue(new CandidateInviteError());
  const r = await GET(
    new Request(
      "https://mockmeai.test/auth/callback?code=fixture&next=https://attacker.test",
    ),
  );
  expect(r.headers.get("location")).toBe("https://mockmeai.test/not-invited");
});
it("does not grant access or falsely report uninvited status on a database outage", async () => {
  invite.mockRejectedValue(new CandidateAuthError(503));
  const r = await GET(
    new Request("https://mockmeai.test/auth/callback?code=fixture"),
  );
  expect(r.headers.get("location")).toContain("/sign-in?error=");
  expect(r.headers.get("Cache-Control")).toBe("private, no-store");
});

it.each(["shardling.com", "www.shardling.com", "beta.example.test"])(
  "keeps the callback on %s after code exchange",
  async (host) => {
    const response = await GET(
      new Request(`https://${host}/auth/callback?code=fixture`),
    );
    expect(response.headers.get("location")).toBe(`https://${host}/play`);
  },
);

const guestId = "11111111-1111-4111-8111-111111111111";
async function guestLink() {
  const { sealGuestCookie, GUEST_LINK_COOKIE } =
    await import("@/lib/play/guest-cookie");
  jar.set(GUEST_LINK_COOKIE, sealGuestCookie(guestId, "link"));
  jar.set("inteliprep-auth", "original-guest-session");
}
it("upgrades the same guest UUID and keeps progress ownership unchanged", async () => {
  await guestLink();
  exchange.mockResolvedValue({
    data: {
      user: { id: guestId, email: "new@example.test", is_anonymous: false },
    },
    error: null,
  });
  const r = await GET(
    new Request("https://beta.example.test/auth/callback?code=linked"),
  );
  expect(r.headers.get("location")).toBe("https://beta.example.test/play");
  expect(upgraded).toHaveBeenCalledExactlyOnceWith(guestId);
  expect(invite).toHaveBeenCalledWith(
    guestId,
    "new@example.test",
    expect.anything(),
  );
  expect(jar.has("shardling-guest-link")).toBe(false);
});
it("keeps the guest session when Google identity belongs to another account", async () => {
  await guestLink();
  const r = await GET(
    new Request(
      "https://beta.example.test/auth/callback?error=access_denied&error_code=identity_already_exists",
    ),
  );
  expect(r.headers.get("location")).toBe(
    "https://beta.example.test/sign-in?guest=1&error=link_exists",
  );
  expect(jar.get("inteliprep-auth")).toBe("original-guest-session");
  expect(exchange).not.toHaveBeenCalled();
  expect(upgraded).not.toHaveBeenCalled();
});
it("restores the original guest if an exchange returns a different user", async () => {
  await guestLink();
  exchange.mockImplementation(async () => {
    jar.set("inteliprep-auth", "different-user-cookie");
    jar.set("inteliprep-auth.0", "different-user-chunk");
    return {
      data: {
        user: {
          id: "22222222-2222-4222-8222-222222222222",
          is_anonymous: false,
        },
      },
      error: null,
    };
  });
  const r = await GET(
    new Request("https://beta.example.test/auth/callback?code=wrong-user"),
  );
  expect(r.headers.get("location")).toContain("error=link_failed");
  expect(jar.get("inteliprep-auth")).toBe("original-guest-session");
  expect(jar.has("inteliprep-auth.0")).toBe(false);
  expect(upgraded).not.toHaveBeenCalled();
  expect(invite).not.toHaveBeenCalled();
});
