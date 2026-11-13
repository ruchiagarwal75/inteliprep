import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { signIn } from "./fixture-auth";
import { modelCalls } from "./course-evidence";

for (const theme of ["light", "dark"] as const)
  for (const width of [1440, 375])
    test(`learning trail has readable stops: ${theme}, ${width}`, async ({
      page,
      context,
    }) => {
      await signIn(context, "bossReady");
      await context.addCookies([
        { name: "mockmeai-theme", value: theme, url: "http://localhost:3100" },
      ]);
      await page.setViewportSize({ width, height: width === 1440 ? 669 : 812 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      const before = await modelCalls(page);
      await page.goto("/play/welcome?replay=1");
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      for (const [panel, layout] of [
        [3, "encounter"],
        [4, "journey"],
      ] as const) {
        for (
          let n = 0;
          n < 20 &&
          !(await page
            .getByLabel(`Panel ${panel} of 4`, { exact: true })
            .count());
          n++
        )
          await page.getByRole("button", { name: "Next", exact: true }).click();
        const map = page.locator(`[data-learning-path="${layout}"]`);
        await expect(map).toBeVisible();
        await expect(
          page.getByRole("dialog").locator("[data-world]"),
        ).toHaveCount(0);
        await expect(map.locator("[data-learning-stop]")).toHaveCount(3);
        const fits = await map.evaluate((element) => {
          const scene = element.parentElement;
          if (!scene) return false;
          const bounds = scene.getBoundingClientRect();
          const ground = scene.lastElementChild?.getBoundingClientRect();
          if (!ground) return false;
          return [...element.querySelectorAll("[data-learning-caption]")].every(
            (caption) => {
              const r = caption.getBoundingClientRect();
              return (
                r.left >= bounds.left &&
                r.right <= bounds.right &&
                r.top >= bounds.top &&
                r.bottom <= ground.top
              );
            },
          );
        });
        expect(fits).toBe(true);
        if (layout === "journey") {
          const traveler = await map.locator("img").boundingBox();
          expect(traveler?.width).toBe(48);
          expect(traveler?.height).toBe(48);
          await expect(
            map.locator("[data-learning-caption]").first(),
          ).toContainText("RAG basics");
          await expect(
            map.locator("[data-learning-caption]").nth(1),
          ).toContainText("Topics 1-9");
          await expect(
            map.locator("[data-learning-caption]").last(),
          ).toContainText("Mock interview");
        }
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        mkdirSync("artifacts/welcome-path", { recursive: true });
        await page.screenshot({
          path: `artifacts/welcome-path/${layout}-${theme}-${width}.png`,
          animations: "disabled",
        });
      }
      expect(await modelCalls(page)).toBe(before);
    });
