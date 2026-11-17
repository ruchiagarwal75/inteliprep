import { beforeEach, expect, it, vi } from "vitest";
import { candidateSession } from "@/lib/candidate-auth";
import { guestPlayPage } from "./access";
import { welcomeRequired } from "./welcome-store";

vi.mock("./welcome-store", () => ({ welcomeRequired: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));
const guest = {
  id: "f0770000-0000-4000-8000-000000000004",
  kind: "guest",
} as const;
beforeEach(() => {
  vi.mocked(candidateSession).mockResolvedValue(guest);
  vi.mocked(welcomeRequired).mockReset().mockResolvedValue(true);
});
it.each(["/play", "/play/rag", "/play/rag/topics/0", "/play/rag/topics/1"])(
  "shows the intro on first guest entry to %s",
  async (path) => {
    await expect(guestPlayPage(path)).rejects.toThrow("redirect:/play/welcome");
    expect(welcomeRequired).toHaveBeenCalledWith(guest.id);
  },
);
it("opens welcome without redirecting the guest back to itself", async () => {
  expect(await guestPlayPage("/play/welcome")).toEqual(guest);
  expect(welcomeRequired).not.toHaveBeenCalled();
});
it("lets returning guests resume after completing, skipping or starting practice", async () => {
  vi.mocked(welcomeRequired).mockResolvedValue(false);
  expect(await guestPlayPage("/play")).toEqual(guest);
});
it("keeps later topics and paid pages gated before onboarding", async () => {
  await expect(guestPlayPage("/play/rag/topics/2")).rejects.toThrow(
    "redirect:/sign-in?guest=limit",
  );
  expect(welcomeRequired).not.toHaveBeenCalled();
});
it("does not create intro state before anonymous sign-in", async () => {
  vi.mocked(candidateSession).mockResolvedValue(undefined);
  expect(await guestPlayPage("/play")).toBeUndefined();
  expect(welcomeRequired).not.toHaveBeenCalled();
});
it("leaves registered-account onboarding on its existing path", async () => {
  const account = { ...guest, kind: "account" } as const;
  vi.mocked(candidateSession).mockResolvedValue(account);
  expect(await guestPlayPage("/play")).toEqual(account);
  expect(welcomeRequired).not.toHaveBeenCalled();
});
