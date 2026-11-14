import { expect, test } from "@playwright/test";
import { signIn } from "./fixture-auth";
import {
  openPlayLevel,
  playView,
  fillPlayAnswer,
  dismissLevelUp,
} from "./play-helpers";
import { mkdirSync } from "node:fs";
import { modelCalls } from "./course-evidence";
test("a quiz can review slides at its question reference without losing a choice or counting reading time", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  await signIn(context, "courseReview");
  const before = await modelCalls(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  mkdirSync("artifacts/rag-course-2", { recursive: true });
  await openPlayLevel(page, 1);
  await page.getByRole("radio").nth(1).check();
  const selected = page.getByRole("radio").nth(1);
  await captureReview("quiz-slides-button");
  let loads = 0;
  await page.route("**/api/play/slides?level=1", async (route) => {
    if (++loads === 1)
      await route.fulfill({ status: 503, json: { error: "Try again" } });
    else await route.continue();
  });
  const paused = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/play/activity") &&
      response.request().postDataJSON()?.visible === false,
  );
  await page.getByRole("button", { name: "Slides", exact: true }).click();
  const overlay = page.getByRole("dialog", {
    name: "Topic 1 slides",
    exact: true,
  });
  await expect(overlay).toBeVisible();
  await expect(overlay.getByRole("alert")).toContainText(
    "Could not load the slides. Your answer is kept.",
  );
  await overlay.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(overlay.getByLabel("Slide counter")).toHaveText("6 / 13");
  expect((await paused).status()).toBe(200);
  const time = await page
    .getByLabel("Time on this drill", { exact: true })
    .textContent();
  await page.waitForTimeout(2100);
  await expect(
    page.getByLabel("Time on this drill", { exact: true }),
  ).toHaveText(time ?? "");
  await overlay.getByRole("button", { name: "Back", exact: true }).click();
  await expect(overlay.getByLabel("Slide counter")).toHaveText("5 / 13");
  await captureReview("slides-overlay");
  await overlay
    .getByRole("button", { name: "Close slides", exact: true })
    .click();
  await expect(selected).toBeChecked();
  await page.getByRole("button", { name: "Slides", exact: true }).click();
  await expect(overlay.getByLabel("Slide counter")).toHaveText("6 / 13");
  await page.keyboard.press("Escape");
  await expect(overlay).toHaveCount(0);
  await expect(selected).toBeChecked();
  for (let index = 0; index < 7; index++) {
    await fillPlayAnswer(page, await playView(page), false);
    await page
      .getByRole("button", { name: "Check answer", exact: true })
      .click();
    await dismissLevelUp(page);
    await expect(
      page.getByLabel("Drill result", { exact: true }),
    ).toBeVisible();
    await page
      .getByLabel("Drill result", { exact: true })
      .getByRole("button", { name: "Continue", exact: true })
      .click();
  }
  await expect(
    page.getByRole("heading", { name: "Keep practicing", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Review slides", exact: true }),
  ).toBeVisible();
  await captureReview("result-review-slides");
  await page.getByRole("link", { name: "Back to topics", exact: true }).click();
  await page.getByRole("link", { name: "Detailed path", exact: true }).click();
  await page.locator('[data-topic-review="1"] summary').click();
  await expect(
    page
      .locator('[data-topic-review="1"]')
      .getByRole("link", { name: "Review slides", exact: true }),
  ).toBeVisible();
  expect(await modelCalls(page)).toBe(before);

  async function captureReview(name: string) {
    for (const width of [1440, 375]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(async () => document.fonts.ready);
      if (name === "slides-overlay") {
        const box = await overlay.boundingBox();
        expect(box).not.toBeNull();
        expect(box?.x).toBeGreaterThanOrEqual(8);
        expect(box?.y).toBeGreaterThanOrEqual(8);
        expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(892);
        expect(
          Math.abs((box?.x ?? 0) + (box?.width ?? 0) / 2 - width / 2),
        ).toBeLessThan(2);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `artifacts/rag-course-2/${name}-${width}.png`,
        fullPage: true,
      });
    }
    await page.setViewportSize({ width: 1440, height: 900 });
  }
});
