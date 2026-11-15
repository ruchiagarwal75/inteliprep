import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { signIn } from "./fixture-auth";
import { modelCalls } from "./course-evidence";
import { setTheme } from "./theme-helpers";

test("the first RAG slide shows the missing-evidence example in both themes and narrow windows", async ({
  page,
  context,
}) => {
  test.setTimeout(90000);
  await signIn(context, "primerSlides");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const calls = await modelCalls(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  mkdirSync("artifacts/rag-primer-hook", { recursive: true });
  for (const theme of ["light", "dark"] as const) {
    for (const { width, height } of [
      { width: 1440, height: 900 },
      { width: 1440, height: 669 },
      { width: 375, height: 667 },
    ]) {
      await page.setViewportSize({ width, height });
      await page.goto("/play/rag/topics/0");
      await setTheme(page, theme);
      await expect(page.getByLabel("Slide counter")).toHaveText("1 / 10");
      const diagram = page.locator('[data-course-diagram="rag-knowledge-gap"]');
      await diagram.scrollIntoViewIfNeeded();
      await expect(diagram).toBeInViewport({ ratio: 1 });
      await expect(diagram).toHaveAttribute(
        "aria-label",
        /current private policy says 14 days/u,
      );
      const labels = await diagram
        .locator("svg:visible text")
        .evaluateAll((nodes) =>
          nodes.map((node) => {
            const svg = node.closest("svg"),
              rect = node.getBoundingClientRect(),
              bounds = svg?.getBoundingClientRect();
            return {
              size:
                parseFloat(getComputedStyle(node).fontSize) *
                (bounds && svg?.viewBox.baseVal.width
                  ? bounds.width / svg.viewBox.baseVal.width
                  : 0),
              within: Boolean(
                bounds &&
                rect.left >= bounds.left - 1 &&
                rect.right <= bounds.right + 1,
              ),
            };
          }),
        );
      for (const label of labels) {
        expect(label.size).toBeGreaterThanOrEqual(13);
        expect(label.within).toBe(true);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const next = page.getByRole("button", { name: "Next", exact: true });
      await expect(next).toBeInViewport({ ratio: 1 });
      await page.screenshot({
        path: `artifacts/rag-primer-hook/first-slide-${theme}-${width}x${height}.png`,
      });
      await next.click();
      await expect(page.getByLabel("Slide counter")).toHaveText("2 / 10");
      await expect(
        page.locator('[data-course-diagram="rag-answer"]'),
      ).toBeVisible();
    }
  }
  expect(await modelCalls(page)).toBe(calls);
  expect(errors).toEqual([]);
});
