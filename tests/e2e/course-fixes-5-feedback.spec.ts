import { expect, test } from "@playwright/test";
import { signIn } from "./fixture-auth";
import {
  openPlayLevel,
  playView,
  fillPlayAnswer,
  dismissLevelUp,
} from "./play-helpers";
import { submitRoundResultSchema } from "../../src/lib/play/public";
import { modelCalls } from "./course-evidence";
import { mkdirSync } from "node:fs";
const cases = [
  { account: "fixes5Feedback", theme: "light", width: 1440, height: 669 },
  {
    account: "fixes5FeedbackDarkDesktop",
    theme: "dark",
    width: 1440,
    height: 669,
  },
  {
    account: "fixes5FeedbackLightPhone",
    theme: "light",
    width: 375,
    height: 812,
  },
  {
    account: "fixes5FeedbackDarkPhone",
    theme: "dark",
    width: 375,
    height: 812,
  },
];
for (const { account, theme, ...size } of cases)
  test(`old feedback spacing ${theme} ${size.width}`, async ({
    page,
    context,
  }) => {
    await signIn(context, account);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const before = await modelCalls(page);
    mkdirSync("artifacts/course-fixes-5", { recursive: true });
    let ifWrong: string | undefined;
    await page.route("**/api/play/submit", async (route) => {
      const response = await route.fetch();
      expect(response.status()).toBe(200);
      const data = submitRoundResultSchema.parse(await response.json());
      await route.fulfill({
        response,
        json: { ...data, result: { ...data.result, ifWrong } },
      });
    });
    await page.setViewportSize(size);
    await openPlayLevel(page, 1);
    if ((await page.locator("html").getAttribute("data-theme")) !== theme)
      await page
        .getByRole("button", { name: `Switch to ${theme} mode`, exact: true })
        .click();
    for (const value of [undefined, "", "  \n "]) {
      ifWrong = value;
      const view = await playView(page);
      await fillPlayAnswer(page, view, false);
      await page
        .getByRole("button", { name: "Check answer", exact: true })
        .click();
      await dismissLevelUp(page);
      const sheet = page.getByRole("region", {
        name: "Drill result",
        exact: true,
      });
      await expect(sheet.locator("[data-option-feedback]")).toHaveCount(0);
      const link = sheet.getByRole("button", { name: /^See slide \d+$/u });
      await expect(link).toHaveCSS("position", "static");
      const a = await sheet.locator("[data-course-answer]").boundingBox(),
        b = await link.boundingBox();
      if (!a || !b) throw Error("Missing answer layout");
      expect(b.y - a.y - a.height).toBeLessThanOrEqual(20);
      if (value === undefined)
        await sheet.screenshot({
          path: `artifacts/course-fixes-5/wrong-answer-${theme}-${size.width}.png`,
        });
      await sheet
        .getByRole("button", { name: "Continue", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Check answer", exact: true }),
      ).toBeVisible();
    }
    expect(await modelCalls(page)).toBe(before);
  });
