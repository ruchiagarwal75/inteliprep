import { expect, test } from "@playwright/test";
import { bossView, bossShot } from "./boss-browser-helpers";
import { modelCalls } from "./course-evidence";
for (const [account, theme, width] of [
  ["bossWonLightDesktop", "light", 1440],
  ["bossWonDarkDesktop", "dark", 1440],
  ["bossWonLightPhone", "light", 375],
  ["bossWonDarkPhone", "dark", 375],
] as const)
  test(`world clear appears once: ${theme}, ${width}`, async ({
    page,
    context,
  }) => {
    const before = await modelCalls(page);
    await bossView(page, context, account, theme, width);
    const notice = page.getByRole("status", {
      name: "RAG World cleared",
      exact: true,
    });
    await expect(notice).toBeVisible();
    await bossShot(page, `world-cleared-${theme}-${width}`);
    await notice.getByRole("button", { name: "Done", exact: true }).click();
    await expect(notice).toHaveCount(0);
    await page.reload();
    await expect(page.locator("#rag-boss")).toHaveAttribute(
      "data-boss-state",
      "defeated",
    );
    await expect(notice).toHaveCount(0);
    expect(await modelCalls(page)).toBe(before);
  });
