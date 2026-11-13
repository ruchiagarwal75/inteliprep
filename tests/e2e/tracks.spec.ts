import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { signIn } from "./fixture-auth";
import { modelCalls } from "./course-evidence";

test("beta keeps both catalog groups visible but offers only the RAG mock", async ({
  page,
  context,
}) => {
  await signIn(context, "genai");
  const before = await modelCalls(page);
  mkdirSync("artifacts/beta-launch", { recursive: true });
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/mock");
    await expect(
      page.getByRole("heading", { name: "AI / ML system design", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Fundamentals", exact: true }),
    ).toBeVisible();
    await expect(page.locator("[data-locked-problem]")).toHaveCount(12);
    await expect(page.locator("[data-available-problem]")).toHaveCount(1);
    for (const button of await page
      .locator("[data-locked-problem] button")
      .all())
      await expect(button).toBeDisabled();
    await expect(
      page.getByRole("link", { name: "Choose mock", exact: true }),
    ).toHaveAttribute(
      "href",
      "/interview/new?problem=enterprise-rag-assistant",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/beta-launch/mock-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("link", { name: "Choose mock", exact: true }).click();
    await expect(
      page
        .getByRole("combobox", { name: "Problem", exact: true })
        .locator("option"),
    ).toHaveCount(1);
    await expect(
      page.getByRole("combobox", { name: "Problem", exact: true }),
    ).toHaveValue("enterprise-rag-assistant");
    await expect(
      page.getByRole("radiogroup", { name: "Interview track", exact: true }),
    ).toHaveCount(0);
    await page.reload();
    await expect(
      page.getByRole("combobox", { name: "Problem", exact: true }),
    ).toHaveValue("enterprise-rag-assistant");
  }
  // A stale bookmarked question cannot reopen a locked selection.
  await page.goto("/interview/new?problem=url-shortener");
  await expect(
    page.getByRole("combobox", { name: "Problem", exact: true }),
  ).toHaveValue("enterprise-rag-assistant");
  expect(await modelCalls(page)).toBe(before);
});
