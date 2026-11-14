import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { signIn } from "./fixture-auth";
import { modelCalls } from "./course-evidence";
test("all 48 early course slides use a fixed focus shell and an internally scrolling card", async ({
  page,
  context,
}) => {
  test.setTimeout(360000);
  await signIn(context, "fixes4Learn");
  const before = await modelCalls(page),
    errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  mkdirSync("artifacts/course-fixes-5", { recursive: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  let queue = Promise.resolve(),
    visited = 0;
  await page.route("**/api/play/**", async (route) => {
    queue = queue.then(
      () => new Promise<void>((resolve) => setTimeout(resolve, 500)),
    );
    await queue;
    await route.continue();
  });
  for (const theme of ["light", "dark"] as const)
    for (const size of [
      { width: 1440, height: 669 },
      { width: 375, height: 812 },
    ]) {
      await page.setViewportSize(size);
      let dock:
        { x: number; y: number; width: number; height: number } | undefined;
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
        await page.evaluate(() => document.fonts.ready);
        for (let n = 1; n <= total; n++) {
          await expect(
            page.getByLabel("Slide counter").filter({ visible: true }),
          ).toHaveText(`${n} / ${total}`);
          visited++;
          const header = page.locator("[data-learn-header]"),
            frame = page.getByRole("region", {
              name: "Slides reader",
              exact: true,
            });
          await expect(
            header.getByRole("link", { name: "Back to topics", exact: true }),
          ).toBeInViewport({ ratio: 1 });
          await expect(
            header.getByRole("button", { name: "Start quiz", exact: true }),
          ).toBeInViewport({ ratio: 1 });
          await expect(page.locator(".practice-nav")).not.toBeVisible();
          await expect(
            page.getByLabel("Your progress", { exact: true }),
          ).not.toBeVisible();
          const primary = page.locator(
              "[data-slide-controls] .practice-primary",
            ),
            box = await primary.boundingBox();
          if (!box) throw Error("Missing fixed slide control");
          dock ??= box;
          for (const key of ["x", "y", "width", "height"] as const)
            expect(Math.abs(box[key] - dock[key])).toBeLessThan(0.5);
          await expect(primary).toBeInViewport({ ratio: 1 });
          const progress = header.getByRole("progressbar", {
            name: "Slide progress",
          });
          await expect(progress).toHaveAttribute("aria-valuenow", String(n));
          await expect(progress.locator("[data-pixel-block]")).toHaveCount(
            total,
          );
          await expect(progress.locator('[data-state="done"]')).toHaveCount(n);
          await expect(frame).toHaveJSProperty("scrollTop", 0);
          const geometry = await frame.evaluate((node) => ({
            height: node.clientHeight,
            extra: node.scrollHeight - node.clientHeight,
          }));
          if (size.width === 1440)
            expect(geometry.height).toBeGreaterThanOrEqual(300);
          const fade = page.getByRole("img", {
            name: "More slide content below",
            exact: true,
          });
          await expect(fade).toHaveCount(geometry.extra > 1 ? 1 : 0);
          if (
            (level === 0 && n === 1) ||
            (level === 1 && [2, 6, 9].includes(n))
          )
            await page.screenshot({
              path: `artifacts/course-fixes-5/learn-T${level}-S${n}-${theme}-${size.width}.png`,
            });
          await frame.evaluate((node) =>
            node.scrollTo({ top: node.scrollHeight, behavior: "instant" }),
          );
          await expect
            .poll(() =>
              frame.evaluate(
                (node) =>
                  node.scrollHeight - node.clientHeight - node.scrollTop,
              ),
            )
            .toBeLessThanOrEqual(1);
          await expect(fade).toHaveCount(0);
          const last = frame.locator(
            '[aria-label="Slide content"] > :last-child',
          );
          const lastBox = await last.boundingBox(),
            readerBox = await frame.boundingBox();
          if (!lastBox || !readerBox) throw Error("Missing slide text");
          expect(lastBox.y + lastBox.height).toBeLessThanOrEqual(
            readerBox.y + readerBox.height + 1,
          );
          expect(
            await page.evaluate(() => ({
              y: scrollY,
              height: document.documentElement.scrollHeight,
              width: document.documentElement.scrollWidth,
            })),
          ).toEqual({ y: 0, height: size.height, width: size.width });
          if (n < total) {
            await page.evaluate(() => {
              if (document.activeElement instanceof HTMLElement)
                document.activeElement.blur();
            });
            await page.keyboard.press(n % 2 ? "ArrowRight" : "Enter");
          }
        }
      }
      await page.keyboard.press("Escape");
      await expect(page).toHaveURL(/\/play\/rag$/u);
    }
  expect(visited).toBe(192);
  expect(errors).toEqual([]);
  expect(await modelCalls(page)).toBe(before);
});
