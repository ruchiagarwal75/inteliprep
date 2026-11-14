import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { signIn } from "./fixture-auth";
import { modelCalls } from "./course-evidence";
import { playView, fillPlayAnswer, dismissLevelUp } from "./play-helpers";
import { roundViewSchema } from "../../src/lib/play/public";
test("a fresh player reads and passes both ten-question topics, reviewing the matching slide after a mistake", async ({
  page,
  context,
}) => {
  test.setTimeout(240000);
  await signIn(context, "content2Quiz");
  await page.setViewportSize({ width: 1440, height: 669 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const before = await modelCalls(page);
  mkdirSync("artifacts/course-content-2", { recursive: true });
  let queue = Promise.resolve();
  await page.route("**/api/play/**", async (route) => {
    queue = queue.then(
      () => new Promise<void>((resolve) => setTimeout(resolve, 600)),
    );
    await queue;
    await route.continue();
  });
  for (const [level, slides, reference] of [
    [2, 13, 3],
    [3, 12, 2],
  ]) {
    await page.goto(`/play/rag/topics/${level}`);
    for (let number = 1; number <= slides; number++) {
      await expect(
        page.getByLabel("Slide counter").filter({ visible: true }),
      ).toHaveText(`${number} / ${slides}`);
      if (number < slides)
        await page.getByRole("button", { name: "Next", exact: true }).click();
    }
    await page
      .getByRole("button", { name: "Start quiz", exact: true })
      .last()
      .click();
    await expect(
      page.getByRole("button", { name: "Check answer", exact: true }),
    ).toBeVisible({ timeout: 30000 });
    for (let index = 0; index < 10; index++) {
      const view = await playView(page);
      expect(view.question.total).toBe(10);
      expect(view.question.ordinal).toBe(index);
      await fillPlayAnswer(page, view, index !== 0 && index !== 9);
      const checked = page.waitForResponse(
        (r) =>
          r.url().endsWith("/api/play/submit") &&
          r.request().method() === "POST",
      );
      await page
        .getByRole("button", { name: "Check answer", exact: true })
        .click();
      expect((await checked).status()).toBe(200);
      await dismissLevelUp(page);
      const result = page.getByLabel("Drill result", { exact: true });
      await expect(result).toBeVisible();
      await dismissLevelUp(page);
      if (index === 0) {
        await result
          .getByRole("button", { name: `See slide ${reference}`, exact: true })
          .click();
        const overlay = page.getByRole("dialog", {
          name: `Topic ${level} slides`,
          exact: true,
        });
        await expect(
          overlay.getByLabel("Slide counter").filter({ visible: true }),
        ).toHaveText(`${reference} / ${slides}`);
        await overlay
          .getByRole("button", { name: "Close slides", exact: true })
          .click();
      }
      if (index < 9) {
        const advanced = page.waitForResponse(
          (r) =>
            r.url().endsWith("/api/play/next") &&
            r.request().method() === "POST",
        );
        await result
          .getByRole("button", { name: "Continue", exact: true })
          .click();
        const next = roundViewSchema.parse(await (await advanced).json());
        await expect(
          page.getByRole("heading", { name: next.question.title, exact: true }),
        ).toBeVisible();
      } else
        await result
          .getByRole("button", { name: "Continue", exact: true })
          .click();
    }
    await expect(
      page.getByRole("heading", { name: "Topic passed", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("8 of 10 correct", { exact: true }),
    ).toBeVisible();
    for (const theme of ["light", "dark"] as const) {
      if ((await page.locator("html").getAttribute("data-theme")) !== theme)
        await page
          .getByRole("button", { name: `Switch to ${theme} mode`, exact: true })
          .click();
      for (const size of [
        { width: 1440, height: 669 },
        { width: 375, height: 812 },
      ]) {
        await page.setViewportSize(size);
        await page.screenshot({
          path: `artifacts/course-content-2/T${level}-passed-${theme}-${size.width}.png`,
        });
      }
    }
  }
  expect(await modelCalls(page)).toBe(before);
});
