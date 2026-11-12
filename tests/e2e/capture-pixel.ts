import { expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
const scenes: Record<string, string> = {
  "rag-world-path": "world-path",
  "answer-selected": "drill-selected",
  "correct-sheet": "correct-sheet",
  "wrong-sheet": "wrong-sheet",
  checking: "checking",
  "level-complete-3-stars": "level-complete",
  "level-failed": "level-failed",
  "player-level-up": "level-up",
  "chest-opened": "chest-open",
  "topic-map": "topic-map",
  poses: "poses",
};
export async function capturePixel(
  page: Page,
  name: string,
  _folder?: string,
  fullPage = true,
) {
  void _folder;
  const scene = scenes[name];
  if (!scene) return;
  const original = await page.evaluate(
    () => document.documentElement.dataset.theme ?? "light",
  );
  const viewport = page.viewportSize();
  mkdirSync("artifacts/play-game-pixel", { recursive: true });
  for (const theme of ["light", "dark"]) {
    await page.evaluate((theme) => {
      document.documentElement.dataset.theme = theme;
      localStorage.setItem("mockmeai:theme", theme);
      document.cookie = `mockmeai-theme=${theme}; Path=/; SameSite=Lax`;
      window.dispatchEvent(new Event("mockmeai-theme-change"));
    }, theme);
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
      expect(
        await page
          .locator("[data-game-label]")
          .evaluateAll((rows) =>
            rows
              .filter((row) => row.getClientRects().length)
              .every((row) => parseFloat(getComputedStyle(row).fontSize) >= 9),
          ),
      ).toBe(true);
      await expect(page.locator("main[data-pixel-play]")).toHaveCSS(
        "background-color",
        theme === "light" ? "rgb(241, 237, 255)" : "rgb(23, 20, 58)",
      );
      for (const button of await page
        .locator("main[data-pixel-play] .practice-primary")
        .all())
        await expect(button).toHaveCSS("border-radius", "0px");
      for (const card of await page
        .locator("main[data-pixel-play] article.practice-surface")
        .all())
        await expect(card).toHaveCSS(
          "background-color",
          theme === "light" ? "rgb(232, 226, 252)" : "rgb(34, 29, 79)",
        );
      await page.screenshot({
        path: `artifacts/play-game-pixel/${scene}-${theme}-${width}.png`,
        fullPage,
      });
    }
  }
  await page.evaluate((theme) => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("mockmeai:theme", theme);
    document.cookie = `mockmeai-theme=${theme}; Path=/; SameSite=Lax`;
    window.dispatchEvent(new Event("mockmeai-theme-change"));
  }, original);
  if (viewport) await page.setViewportSize(viewport);
}
