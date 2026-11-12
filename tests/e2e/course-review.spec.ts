import { expect, test } from "@playwright/test";
import { signIn } from "./fixture-auth";
import {
  openPlayLevel,
  playView,
  fillPlayAnswer,
  dismissLevelUp,
} from "./play-helpers";
import { mkdirSync } from "node:fs";
test("a quiz can review slides at its last position without losing a choice or counting reading time", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  await signIn(context, "courseReview");
  await page.emulateMedia({ reducedMotion: "reduce" });
  mkdirSync("artifacts/rag-course-2", { recursive: true });
  await openPlayLevel(page, 1);
  await page.getByRole("radio").nth(1).check();
  const selected = page.getByRole("radio").nth(1);
  await page.screenshot({
    path: "artifacts/rag-course-2/quiz-slides-button.png",
    fullPage: true,
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
  await expect(overlay.getByLabel("Slide counter")).toHaveText("5 / 5");
  expect((await paused).status()).toBe(200);
  const time = await page
    .getByLabel("Time on this drill", { exact: true })
    .textContent();
  await page.waitForTimeout(2100);
  await expect(
    page.getByLabel("Time on this drill", { exact: true }),
  ).toHaveText(time ?? "");
  await overlay.getByRole("button", { name: "Back", exact: true }).click();
  await expect(overlay.getByLabel("Slide counter")).toHaveText("4 / 5");
  await page.screenshot({
    path: "artifacts/rag-course-2/slides-overlay.png",
    fullPage: true,
  });
  await overlay
    .getByRole("button", { name: "Close slides", exact: true })
    .click();
  await expect(selected).toBeChecked();
  await page.getByRole("button", { name: "Slides", exact: true }).click();
  await expect(overlay.getByLabel("Slide counter")).toHaveText("4 / 5");
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
  await page.screenshot({
    path: "artifacts/rag-course-2/result-review-slides.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Back to topics", exact: true }).click();
  await page.locator('[data-topic-review="1"] summary').click();
  await expect(
    page
      .locator('[data-topic-review="1"]')
      .getByRole("link", { name: "Review slides", exact: true }),
  ).toBeVisible();
});
