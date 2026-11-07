import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import SignInPage from "@/app/sign-in/page";
const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  claims: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error("redirect:" + path);
  }),
}));
vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: async () => ({ auth: { getUser: mocks.getUser } }),
}));
vi.mock("@/lib/candidate-auth", () => ({
  candidateIdentity: mocks.claims,
  requireCandidateIdentity: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
afterEach(() => vi.clearAllMocks());
it("shows login instead of redirecting a revoked admin session on its stale claims", async () => {
  mocks.claims.mockResolvedValue("stale-user");
  mocks.getUser.mockResolvedValue({
    data: { user: null },
    error: { status: 401 },
  });
  const result = await SignInPage({
    searchParams: Promise.resolve({ next: "/admin" }),
  });
  expect(renderToStaticMarkup(createElement(() => result))).toContain(
    "Continue with Google",
  );
  expect(mocks.redirect).not.toHaveBeenCalled();
  expect(mocks.claims).not.toHaveBeenCalled();
});
it("returns a freshly authenticated user only to the fixed admin route", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: { id: "verified-owner" } } });
  await expect(
    SignInPage({ searchParams: Promise.resolve({ next: "/admin" }) }),
  ).rejects.toThrow("redirect:/admin");
  expect(mocks.redirect).toHaveBeenCalledWith("/admin");
});
it("does not accept an external sign-in destination", async () => {
  mocks.claims.mockResolvedValue("verified-user");
  await expect(
    SignInPage({
      searchParams: Promise.resolve({ next: "https://attacker.example" }),
    }),
  ).rejects.toThrow("redirect:/interview");
  expect(mocks.getUser).not.toHaveBeenCalled();
});
