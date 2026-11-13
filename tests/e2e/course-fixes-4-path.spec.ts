import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { signIn } from "./fixture-auth";
import { modelCalls } from "./course-evidence";
test("returning players land with the current node circle centered, including reduced motion", async ({
  page,
  context,
}) => {
  await signIn(context, "fixes4Path");
  const before = await modelCalls(page);
  mkdirSync("artifacts/course-fixes-4", { recursive: true });
  for (const theme of ["light", "dark"] as const)
    for (const size of [
      { width: 1440, height: 669 },
      { width: 375, height: 812 },
    ])
      for (const reduce of [false, true]) {
        await page.setViewportSize(size);
        await page.emulateMedia({
          reducedMotion: reduce ? "reduce" : "no-preference",
        });
        await page.goto("/play/rag");
        if ((await page.locator("html").getAttribute("data-theme")) !== theme) {
          await page
            .getByRole("button", {
              name: `Switch to ${theme} mode`,
              exact: true,
            })
            .click();
          await page.reload();
        }
        const current = page.locator(
          '[aria-current="step"] [data-course-node]',
        );
        await expect(page.locator('[data-topic-level="2"]')).toHaveAttribute(
          "aria-current",
          "step",
        );
        await expect
          .poll(async () =>
            current.evaluate((node) => {
              const rect = node.getBoundingClientRect();
              return Math.abs(rect.top + rect.height / 2 - innerHeight / 2);
            }),
          )
          .toBeLessThan(2);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        if (reduce)
          await page.screenshot({
            path: `artifacts/course-fixes-4/path-${theme}-${size.width}.png`,
          });
      }
  expect(await modelCalls(page)).toBe(before);
});
