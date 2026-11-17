import { afterEach, expect, it, vi } from "vitest";
import { beginGoogleSignIn } from "./google-sign-in";
afterEach(() => vi.unstubAllGlobals());

it.each([
  { mode: "sign-in", route: "/auth/google" },
  { mode: "save-guest", route: "/api/play/guest/link" },
] satisfies { mode: "sign-in" | "save-guest"; route: string }[])(
  "uses the explicit $mode intent without falling back to the other operation",
  async ({ mode, route }) => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        Response.json({ url: "https://auth.example.test/authorize" }),
      );
    vi.stubGlobal("fetch", fetcher);
    expect(await beginGoogleSignIn({ mode })).toBe(
      "https://auth.example.test/authorize",
    );
    expect(fetcher).toHaveBeenCalledWith(
      route,
      expect.objectContaining({ method: "POST", body: "{}" }),
    );
    fetcher.mockResolvedValue(Response.json({}, { status: 409 }));
    await expect(beginGoogleSignIn({ mode })).rejects.toThrow();
    expect(fetcher.mock.calls.every(([path]) => path === route)).toBe(true);
  },
);
it("passes the fixed admin return destination and rejects unsafe provider URLs", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(Response.json({ url: "http://unsafe.example.test" }));
  vi.stubGlobal("fetch", fetcher);
  await expect(
    beginGoogleSignIn({ mode: "sign-in", returnTo: "/admin" }),
  ).rejects.toThrow();
  expect(fetcher).toHaveBeenCalledWith(
    "/auth/google",
    expect.objectContaining({ body: '{"next":"/admin"}' }),
  );
});
