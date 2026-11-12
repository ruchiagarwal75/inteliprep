import { expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
export async function modelCalls(page: Page) {
  const response = await page.request.get(
    "https://127.0.0.1:4444/fixture/stats",
  );
  expect(response.status()).toBe(200);
  const data: { modelCalls: number } = await response.json();
  return data.modelCalls;
}
export async function captureCourse(page: Page, name: string, fullPage = true) {
  mkdirSync("artifacts/rag-course", { recursive: true });
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      window.scrollTo(0, 0);
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/rag-course/${name}-${width}.png`,
      fullPage,
    });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}
