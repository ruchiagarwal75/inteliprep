import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { signIn } from "./fixture-auth";
import { modelCalls } from "./course-evidence";
test("all course slides start at the top, fit or show a fade, and have no empty card floor", async ({
  page,
  context,
}) => {
  test.setTimeout(300000);
  await signIn(context, "fixes4Learn");
  const before = await modelCalls(page);
  mkdirSync("artifacts/course-fixes-4", { recursive: true });
  let queue = Promise.resolve();
  await page.route("**/api/play/**", async (route) => {
    queue = queue.then(
      () => new Promise<void>((resolve) => setTimeout(resolve, 650)),
    );
    await queue;
    await route.continue();
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const theme of ["light", "dark"] as const) {
    for (const size of [
      { width: 1440, height: 669 },
      { width: 375, height: 812 },
    ]) {
      await page.setViewportSize(size);
      for (const [level, total] of [
        [0, 10],
        [1, 13],
        [2, 13],
        [3, 12],
      ]) {
        await page.goto(`/play/rag/topics/${level}`);
        if ((await page.locator("html").getAttribute("data-theme")) !== theme) {
          await page
            .getByRole("button", {
              name: `Switch to ${theme} mode`,
              exact: true,
            })
            .click();
          await page.reload();
        }
        for (let slide = 1; slide <= total; slide++) {
          const frame = page.locator("article");
          await expect(page.getByLabel("Slide counter")).toHaveText(
            `${slide} / ${total}`,
          );
          await expect
            .poll(async () =>
              Math.abs(((await frame.boundingBox())?.y ?? 999) - 12),
            )
            .toBeLessThan(2);
          const body = page.getByRole("region", { name: "Slide content" });
          const last = await body.locator(":scope > :last-child").boundingBox();
          const box = await frame.boundingBox();
          if (!last || !box) throw Error("Missing lesson geometry");
          expect(box.y + box.height - last.y - last.height).toBeLessThanOrEqual(
            60,
          );
          const controls = await page
            .locator("[data-slide-controls]")
            .boundingBox();
          if (!controls) throw Error("Missing slide controls");
          if (box.y + box.height > controls.y + 1)
            await expect(
              page.getByRole("img", { name: "More slide content below" }),
            ).toBeVisible();
          else
            await expect(
              page.getByRole("img", { name: "More slide content below" }),
            ).toHaveCount(0);
          if (size.width === 1440) {
            for (const svg of await body.locator("svg:visible").all())
              expect((await svg.boundingBox())?.height).toBeLessThanOrEqual(
                220,
              );
            if (level === 1 && [6, 9].includes(slide))
              expect(
                (await body.locator("svg:visible").boundingBox())?.height,
              ).toBeLessThanOrEqual(200);
          }
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          ).toBe(true);
          if (
            (level === 0 && slide === 1) ||
            (level === 1 && [2, 6, 9].includes(slide))
          )
            await page.screenshot({
              path: `artifacts/course-fixes-4/learn-T${level}-S${slide}-${theme}-${size.width}.png`,
            });
          if (slide < total) {
            await page.evaluate(() => {
              if (document.activeElement instanceof HTMLElement)
                document.activeElement.blur();
            });
            await page.keyboard.press(slide % 2 ? "ArrowRight" : "Enter");
          }
        }
      }
    }
  }
  expect(await modelCalls(page)).toBe(before);
});
