import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { signIn } from "./fixture-auth";
import { modelCalls } from "./course-evidence";
import {
  openPlayLevel,
  playView,
  fillPlayAnswer,
  dismissLevelUp,
} from "./play-helpers";
import { roundViewSchema } from "../../src/lib/play/public";
test.use({ actionTimeout: 15000 });
// This traversal persists progress. A fresh worker cannot replay it from question 0.
test.describe.configure({ retries: 0 });
test("all course questions keep one-line options above Check at short desktop size", async ({
  page,
  context,
}) => {
  test.setTimeout(300000);
  await signIn(context, "fixes4Quiz");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const before = await modelCalls(page);
  mkdirSync("artifacts/course-fixes-4", { recursive: true });
  let queue = Promise.resolve();
  await page.route("**/api/play/**", async (route) => {
    queue = queue.then(
      () => new Promise<void>((resolve) => setTimeout(resolve, 800)),
    );
    await queue;
    await route.continue();
  });
  let checked = 0;
  for (const level of [0, 1, 2, 3]) {
    await openPlayLevel(page, level);
    for (
      let ordinal = 0;
      ordinal < (level === 0 ? 8 : level === 1 ? 7 : 10);
      ordinal++
    ) {
      const view = await playView(page);
      expect(view.question.ordinal).toBe(ordinal);
      for (const theme of ["light", "dark"] as const) {
        if ((await page.locator("html").getAttribute("data-theme")) !== theme)
          await page
            .getByRole("button", {
              name: `Switch to ${theme} mode`,
              exact: true,
            })
            .click();
        for (const size of [
          { width: 1440, height: 640 },
          { width: 1440, height: 669 },
          { width: 375, height: 812 },
        ]) {
          await page.setViewportSize(size);
          await page.evaluate(() => document.fonts.ready);
          await page.evaluate(() => window.scrollTo(0, 0));
          await expect(page.locator("[data-drill-card] h1")).toHaveCSS(
            "font-size",
            "32px",
          );
          const options = page.locator("form label");
          await expect(options).toHaveCount(4);
          const lineCounts = await options
            .locator("span")
            .evaluateAll((nodes) =>
              nodes.map(
                (node) =>
                  node.getBoundingClientRect().height /
                  parseFloat(getComputedStyle(node).lineHeight),
              ),
            );
          const check = await page
            .getByRole("button", { name: "Check answer", exact: true })
            .boundingBox();
          if (!check) throw Error("Missing Check button");
          if (lineCounts.every((count) => count < 1.1)) {
            checked++;
            for (const option of await options.all()) {
              const box = await option.boundingBox();
              if (!box) throw Error("Missing option");
              expect(box.y).toBeGreaterThanOrEqual(0);
              expect(box.y + box.height).toBeLessThanOrEqual(check.y - 8);
            }
            expect(check.y + check.height).toBeLessThanOrEqual(size.height);
          }
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          ).toBe(true);
          if (ordinal === 0 && level === 0)
            await page.screenshot({
              path: `artifacts/course-fixes-4/quiz-${theme}-${size.width}.png`,
            });
        }
      }
      await page.setViewportSize({ width: 1440, height: 669 });
      await fillPlayAnswer(page, view);
      const submitted = page.waitForResponse(
        (r) =>
          r.url().endsWith("/api/play/submit") &&
          r.request().method() === "POST",
      );
      await page
        .getByRole("button", { name: "Check answer", exact: true })
        .click();
      expect((await submitted).status()).toBe(200);
      await dismissLevelUp(page);
      const result = page.getByLabel("Drill result", { exact: true });
      await expect(result).toBeVisible();
      await dismissLevelUp(page);
      if (ordinal < view.question.total - 1) {
        const next = page.waitForResponse(
          (r) =>
            r.url().endsWith("/api/play/next") &&
            r.request().method() === "POST",
        );
        await result
          .getByRole("button", { name: "Continue", exact: true })
          .click();
        const response = await next;
        expect(response.status()).toBe(200);
        const latest = roundViewSchema.parse(await response.json());
        await expect(
          page.getByRole("heading", {
            name: latest.question.title,
            exact: true,
          }),
        ).toBeVisible();
      } else {
        await result
          .getByRole("button", { name: "Continue", exact: true })
          .click();
        await expect(
          page.getByRole("heading", { name: "Topic passed", exact: true }),
        ).toBeVisible();
      }
    }
  }
  expect(checked).toBeGreaterThanOrEqual(40);
  expect(await modelCalls(page)).toBe(before);
});
