import { expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
import LegacyInterview from "@/app/interview/page";
it("redirects old query links to the new interview URL and bare interview links home", async () => {
  const id = crypto.randomUUID();
  await expect(
    LegacyInterview({ searchParams: Promise.resolve({ session: id }) }),
  ).rejects.toThrow(`redirect:/interview/${id}`);
  await expect(
    LegacyInterview({ searchParams: Promise.resolve({}) }),
  ).rejects.toThrow("redirect:/");
  await expect(
    LegacyInterview({
      searchParams: Promise.resolve({ session: "not-a-session" }),
    }),
  ).rejects.toThrow("redirect:/");
});
