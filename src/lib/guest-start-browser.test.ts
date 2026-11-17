import { afterEach, beforeEach, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  signInAnonymously: vi.fn(),
}));
vi.mock("./supabase-browser", () => ({ supabaseBrowser: () => ({ auth }) }));
import { startGuest } from "./guest-start-browser";
beforeEach(() => {
  auth.getSession.mockResolvedValue({ data: { session: null } });
  auth.signInAnonymously.mockResolvedValue({
    data: { session: {}, user: { is_anonymous: true } },
    error: null,
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});
it("creates only one anonymous session across concurrent React starts", async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({ ready: true }));
  vi.stubGlobal("fetch", fetcher);
  await Promise.all([startGuest("captcha"), startGuest("captcha")]);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(auth.signInAnonymously).toHaveBeenCalledExactlyOnceWith({
    options: { captchaToken: "captcha" },
  });
});
it("stops at the creation rate limit and leaves existing sessions unchanged", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({}, { status: 429 })),
  );
  await expect(startGuest()).rejects.toThrow(/wait/);
  expect(auth.signInAnonymously).not.toHaveBeenCalled();
  auth.getSession.mockResolvedValue({
    data: { session: { user: { id: "same-user" } } },
  });
  await startGuest();
  expect(auth.signInAnonymously).not.toHaveBeenCalled();
});
