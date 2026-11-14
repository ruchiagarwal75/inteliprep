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
import { roundViewSchema } from "../../src/lib/play/public";
test("a replay shows half-XP answers and combos on its result", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  await signIn(context, "fixes4Replay");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const before = await modelCalls(page);
  await openPlayLevel(page, 0);
  for (let i = 0; i < 8; i++) {
    const view = await playView(page);
    expect(view.question.ordinal).toBe(i);
    await fillPlayAnswer(page, view, i !== 7);
    const response = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/play/submit") && r.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Check answer", exact: true })
      .click();
    expect((await response).status()).toBe(200);
    await dismissLevelUp(page);
    const result = rendered(page.getByLabel("Drill result", { exact: true }));
    await expect(result).toBeVisible();
    if (i === 2) await expect(result).toContainText("3 in a row! +2 XP");
    if (i === 4) await expect(result).toContainText("5 in a row! +5 XP");
    if (i < 7) {
      const advanced = page.waitForResponse(
        (r) =>
          r.url().endsWith("/api/play/next") && r.request().method() === "POST",
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
    rendered(page.getByText("Replay: half XP.", { exact: true })),
  ).toBeVisible();
  await expect(
    rendered(page.getByLabel("44 XP earned", { exact: true })),
  ).toBeVisible();
  mkdirSync("artifacts/course-fixes-4", { recursive: true });
  for (const theme of ["light", "dark"] as const) {
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
      await page.screenshot({
        path: `artifacts/course-fixes-4/replay-${theme}-${size.width}.png`,
      });
    }
  }
  expect(await modelCalls(page)).toBe(before);
});
