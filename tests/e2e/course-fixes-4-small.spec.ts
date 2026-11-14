import { rendered } from "./rendered";
import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { signIn } from "./fixture-auth";
import { modelCalls } from "./course-evidence";
test("the world copy and path buttons distinguish the current topic from practice", async ({
  page,
  context,
}) => {
  await signIn(context, "fixes4Path");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const before = await modelCalls(page);
  mkdirSync("artifacts/course-fixes-4", { recursive: true });
  for (const theme of ["light", "dark"] as const)
    for (const size of [
      { width: 1440, height: 669 },
      { width: 375, height: 812 },
    ]) {
      await page.setViewportSize(size);
      await page.goto("/play/rag");
      if (
        (await rendered(page.locator("html")).getAttribute("data-theme")) !==
        theme
      ) {
        await page
          .getByRole("button", { name: `Switch to ${theme} mode`, exact: true })
          .click();
        await page.reload();
      }
      await expect(
        page.getByRole("region", { name: "RAG World progress" }),
      ).toContainText(
        "From RAG basics to a production design, one topic at a time.",
      );
      const topics = page.getByRole("list", { name: "RAG course topics" });
      await expect(topics.locator(".practice-primary")).toHaveCount(1);
      await expect(
        rendered(page.locator('[aria-current="step"]')).getByRole("link", {
          name: "Learn",
          exact: true,
        }),
      ).toHaveClass(/practice-primary/u);
      for (const level of [0, 1])
        await expect(
          rendered(page.locator(`[data-topic-level="${level}"]`)).getByRole(
            "link",
            { name: "Practice again", exact: true },
          ),
        ).toHaveClass(/practice-secondary/u);
      await page.screenshot({
        path: `artifacts/course-fixes-4/path-final-${theme}-${size.width}.png`,
      });
    }
  expect(await modelCalls(page)).toBe(before);
});
