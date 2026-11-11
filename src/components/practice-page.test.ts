import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
vi.mock("@/lib/candidate-auth", () => ({
  candidateIdentity: async () => undefined,
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
import { PracticePage } from "@/components/practice-page";
it("gives a fresh signed-out browser Home without opening a session", async () => {
  const html = renderToStaticMarkup(await PracticePage({ view: "home" }));
  expect(html).toContain("MockMeAI");
  expect(html).toContain("Start free");
  expect(html).toContain("Level up for the AI engineer interview.");
  expect(html).toContain('href="/sign-in"');
  expect(html).not.toContain("Time left");
  expect(html).not.toContain("Stage 1");
});
it("keeps interview and result routes protected by sign-in", async () => {
  await expect(
    PracticePage({ view: "interview", sessionId: crypto.randomUUID() }),
  ).rejects.toThrow("redirect:/sign-in");
  await expect(
    PracticePage({ view: "results", sessionId: crypto.randomUUID() }),
  ).rejects.toThrow("redirect:/sign-in");
});
