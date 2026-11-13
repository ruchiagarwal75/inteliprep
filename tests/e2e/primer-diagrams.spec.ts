import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { signIn } from "./fixture-auth";
import { modelCalls } from "./course-evidence";
test("primer slides and vector diagrams read clearly in both themes at short desktop and narrow sizes", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  await signIn(context, "primerSlides");
  const before = await modelCalls(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  mkdirSync("artifacts/rag-primer", { recursive: true });
  await page.goto("/play/rag/topics/0");
  for (let slide = 1; slide <= 10; slide++) {
    await expect(page.getByLabel("Slide counter")).toHaveText(`${slide} / 10`);
    const body = page.getByRole("region", { name: "Slide content" });
    for (const theme of ["light", "dark"] as const) {
      if ((await page.locator("html").getAttribute("data-theme")) !== theme)
        await page
          .getByRole("button", { name: `Switch to ${theme} mode`, exact: true })
          .click();
      for (const width of [1440, 375]) {
        await page.setViewportSize({ width, height: 669 });
        expect(
          await body.evaluate(
            (node) => node.scrollHeight <= node.clientHeight + 1,
          ),
        ).toBe(true);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        if ([2, 7, 8].includes(slide)) {
          const diagram = body.getByRole("img");
          await expect(diagram).toHaveAttribute("aria-label", /.{30,}/u);
          const text = await diagram
            .locator("svg:visible text")
            .first()
            .evaluate((node) => ({
              height: node.getBoundingClientRect().height,
              font: getComputedStyle(node).fontFamily,
            }));
          expect(text.font).toContain("Inter");
          expect(text.height).toBeGreaterThanOrEqual(13);
          await page.evaluate(() =>
            window.scrollTo(0, document.documentElement.scrollHeight),
          );
          await page.screenshot({
            path: `artifacts/rag-primer/S${slide}-${theme}-${width}.png`,
            fullPage: true,
          });
        }
      }
    }
    await page.setViewportSize({ width: 1440, height: 669 });
    if (slide < 10)
      await page.getByRole("button", { name: "Next", exact: true }).click();
  }
  expect(await modelCalls(page)).toBe(before);
  expect(errors).toEqual([]);
});
