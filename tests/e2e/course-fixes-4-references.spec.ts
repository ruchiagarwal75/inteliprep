import { rendered } from "./rendered";
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
test.use({ actionTimeout: 15000 });
test("quiz review and wrong answers open the teaching slide, not the previous reading cursor", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  await signIn(context, "fixes4Learn");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const before = await modelCalls(page);
  mkdirSync("artifacts/course-fixes-4", { recursive: true });
  for (const [level, expected, total] of [
    [0, 1, 10],
    [1, 6, 13],
    [2, 3, 13],
    [3, 2, 12],
  ]) {
    await openPlayLevel(page, level);
    const view = await playView(page);
    expect(view.question.courseSlide).toBe(expected);
    await page.getByRole("button", { name: "Slides", exact: true }).click();
    const overlay = page.getByRole("dialog", {
      name: `Topic ${level} slides`,
      exact: true,
    });
    await expect(
      overlay.getByLabel("Slide counter").filter({ visible: true }),
    ).toHaveText(`${expected} / ${total}`);
    await overlay.getByRole("button", { name: "Next", exact: true }).click();
    await overlay
      .getByRole("button", { name: "Close slides", exact: true })
      .click();
    await page.getByRole("button", { name: "Slides", exact: true }).click();
    await expect(
      overlay.getByLabel("Slide counter").filter({ visible: true }),
    ).toHaveText(`${expected} / ${total}`);
    await overlay
      .getByRole("button", { name: "Close slides", exact: true })
      .click();
    await fillPlayAnswer(page, view, false);
    const checked = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/play/submit") && r.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Check answer", exact: true })
      .click();
    expect((await checked).status()).toBe(200);
    await dismissLevelUp(page);
    const result = rendered(page.getByLabel("Drill result", { exact: true }));
    await expect(result).toHaveAttribute("data-correct", "false");
    await result
      .getByRole("button", { name: `See slide ${expected}`, exact: true })
      .click();
    await expect(
      overlay.getByLabel("Slide counter").filter({ visible: true }),
    ).toHaveText(`${expected} / ${total}`);
    for (const theme of ["light", "dark"] as const) {
      await overlay
        .getByRole("button", { name: "Close slides", exact: true })
        .click();
      if (
        (await rendered(page.locator("html")).getAttribute("data-theme")) !==
        theme
      )
        await page
          .getByRole("button", { name: `Switch to ${theme} mode`, exact: true })
          .click();
      for (const size of [
        { width: 1440, height: 669 },
        { width: 375, height: 812 },
      ]) {
        await page.setViewportSize(size);
        await result
          .getByRole("button", { name: `See slide ${expected}`, exact: true })
          .scrollIntoViewIfNeeded();
        await expect(result).not.toContainText("Take another look.");
        if (level < 2)
          await page.screenshot({
            path: `artifacts/course-fixes-4/wrong-T${level}-${theme}-${size.width}.png`,
          });
      }
      await result
        .getByRole("button", { name: `See slide ${expected}`, exact: true })
        .click();
      for (const size of [
        { width: 1440, height: 669 },
        { width: 375, height: 812 },
      ]) {
        await page.setViewportSize(size);
        await expect(
          overlay.getByLabel("Slide counter").filter({ visible: true }),
        ).toHaveText(`${expected} / ${total}`);
        if (level < 2)
          await page.screenshot({
            path: `artifacts/course-fixes-4/reference-T${level}-${theme}-${size.width}.png`,
          });
      }
    }
    await overlay
      .getByRole("button", { name: "Close slides", exact: true })
      .click();
  }
  expect(await modelCalls(page)).toBe(before);
});
