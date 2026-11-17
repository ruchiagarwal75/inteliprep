import { afterEach, expect, it, vi } from "vitest";
const oauth = vi.hoisted(() => vi.fn());
vi.mock("./supabase-browser", () => ({
  supabaseBrowser: () => ({ auth: { signInWithOAuth: oauth } }),
}));
import { beginGoogleSignIn } from "./google-sign-in";
afterEach(() => {
  vi.unstubAllGlobals();
  oauth.mockReset();
});
it("links a guest and never falls back to a different OAuth user", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      Response.json({ url: "https://auth.example.test/authorize" }),
    );
  vi.stubGlobal("fetch", fetcher);
  expect(
    await beginGoogleSignIn({
      origin: "https://beta.example.test",
      guest: true,
    }),
  ).toBe("https://auth.example.test/authorize");
  expect(fetcher).toHaveBeenCalledWith(
    "/api/play/guest/link",
    expect.objectContaining({ method: "POST", body: "{}" }),
  );
  fetcher.mockResolvedValue(Response.json({}, { status: 409 }));
  await expect(
    beginGoogleSignIn({ origin: "https://beta.example.test", guest: true }),
  ).rejects.toThrow();
  expect(oauth).not.toHaveBeenCalled();
});
it("keeps ordinary OAuth on the host where sign-in started", async () => {
  oauth.mockResolvedValue({ error: null });
  await beginGoogleSignIn({
    origin: "https://beta.example.test",
    guest: false,
  });
  expect(oauth).toHaveBeenCalledWith(
    expect.objectContaining({
      options: expect.objectContaining({
        redirectTo: "https://beta.example.test/auth/callback",
      }),
    }),
  );
});
