import { expect, it } from "vitest";
import { isAutomatedViewer } from "@/lib/viewer-automation";

it.each([
  "Mozilla/5.0 HeadlessChrome/130.0.0.0 Safari/537.36",
  "vercel-screenshot/1.0",
  "Mozilla/5.0 (compatible; Googlebot/2.1)",
  "ChatGPT-User/1.0",
  "Playwright",
  "facebookexternalhit/1.1",
])("excludes identifiable automation: %s", (agent) => {
  expect(isAutomatedViewer(agent)).toBe(true);
});
it("keeps ordinary browser traffic and allows webdriver to identify automation", () => {
  expect(isAutomatedViewer("Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36")).toBe(
    false,
  );
  expect(isAutomatedViewer(null)).toBe(false);
  expect(
    isAutomatedViewer("Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36", true),
  ).toBe(true);
});
