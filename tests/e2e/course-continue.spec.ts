import { rendered } from "./rendered";
import { expect, test } from "@playwright/test";
import { signIn } from "./fixture-auth";
import { openPlayLevel, playView, fillPlayAnswer } from "./play-helpers";
import { modelCalls } from "./course-evidence";
test("Enter continues from feedback and the final answer, including after a level-up dialog", async ({
  page,
  context,
}) => {
  await signIn(context, "courseContinue");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const before = await modelCalls(page);
  await openPlayLevel(page, 1);
  for (let index = 0; index < 7; index++) {
    await fillPlayAnswer(page, await playView(page));
    await page.keyboard.press("Enter");
    const sheet = rendered(page.getByLabel("Drill result", { exact: true }));
    await expect(sheet).toBeVisible();
    if (index === 0) {
      const why = sheet.locator("summary");
      await why.focus();
      await page.keyboard.press("Enter");
      await expect(sheet.locator("details")).not.toHaveAttribute("open", "");
      await expect(sheet).toBeVisible();
    }
    if (index === 6) {
      const modal = page.getByRole("dialog", {
        name: "Level up!",
        exact: true,
      });
      await expect(modal).toBeVisible();
      await modal
        .getByRole("button", { name: "Continue", exact: true })
        .press("Enter");
      await expect(modal).toHaveCount(0);
      await expect(
        sheet.getByRole("button", { name: "Continue", exact: true }),
      ).toBeFocused();
    }
    // Reading the feedback moves focus off the button. The advertised shortcut still works.
    await sheet.getByRole("heading").click();
    await page.keyboard.press("Enter");
    if (index < 6)
      await expect(
        page.getByRole("button", { name: "Check answer", exact: true }),
      ).toBeVisible();
  }
  await expect(
    page.getByRole("heading", { name: "Topic passed", exact: true }),
  ).toBeVisible();
  expect(await modelCalls(page)).toBe(before);
});
