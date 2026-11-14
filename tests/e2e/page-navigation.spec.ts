import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { signIn } from "./fixture-auth";
import { modelCalls } from "./course-evidence";
import { THEME_COOKIE } from "../../src/lib/theme-preference";

const routes = [
  { from: "/progress", to: "/play" },
  { from: "/play", to: "/play/rag" },
  { from: "/play/rag", to: "/play/rag/topics/1" },
  { from: "/play/rag", to: "/play/rag/notebook" },
  { from: "/play", to: "/mock" },
  { from: "/mock", to: "/progress" },
];

for (const theme of ["light", "dark"])
  for (const width of [1440, 375])
    test(`page frames appear before slow content: ${theme}, ${width}`, async ({
      page,
      context,
    }) => {
      test.setTimeout(120000);
      await signIn(context, "fixes4Learn");
      await context.addCookies([
        { name: THEME_COOKIE, value: theme, url: "http://localhost:3100" },
      ]);
      await page.setViewportSize({ width, height: width === 1440 ? 669 : 812 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      const before = await modelCalls(page);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const samples: { route: string; frameMs: number }[] = [];
      for (const { from, to } of routes) {
        await page.goto(from);
        await expect(page.locator("[data-page-loading]:visible")).toHaveCount(
          0,
        );
        const link = page.locator(`a[href="${to}"]:visible`).first();
        await link.scrollIntoViewIfNeeded();
        // Allow Next to prefetch the dynamic route's loading boundary.
        await page.waitForTimeout(1200);
        await page.route("**/*", async (route) => {
          const request = route.request();
          if (
            new URL(request.url()).pathname === to &&
            request.headers().rsc === "1" &&
            request.headers()["next-router-prefetch"] !== "1"
          )
            await new Promise((resolve) => setTimeout(resolve, 900));
          await route.continue();
        });
        await page.evaluate(() => {
          delete document.documentElement.dataset.navigationFrameMs;
          document.addEventListener(
            "click",
            () => {
              const start = performance.now();
              const observer = new MutationObserver(() => {
                if (
                  [...document.querySelectorAll("[data-page-loading]")].some(
                    (el) => el.checkVisibility(),
                  )
                ) {
                  document.documentElement.dataset.navigationFrameMs = String(
                    performance.now() - start,
                  );
                  observer.disconnect();
                }
              });
              observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
              });
            },
            { once: true, capture: true },
          );
        });
        await link.click();
        await expect(
          page.locator("[data-page-loading]:visible").first(),
        ).toBeVisible();
        const ms = Number(
          await page.locator("html").getAttribute("data-navigation-frame-ms"),
        );
        expect(ms).toBeGreaterThan(0);
        expect(ms).toBeLessThan(100);
        samples.push({ route: to, frameMs: ms });
        mkdirSync("artifacts/performance", { recursive: true });
        if (to === "/play")
          await page.screenshot({
            path: `artifacts/performance/loading-${theme}-${width}.png`,
          });
        await expect(page).toHaveURL(
          new RegExp(to.replaceAll("/", "\\/") + "$"),
        );
        await expect(page.locator("[data-page-loading]:visible")).toHaveCount(
          0,
        );
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await page.unroute("**/*");
      }
      writeFileSync(
        `artifacts/performance/navigation-${theme}-${width}.json`,
        JSON.stringify(samples, null, 2),
      );
      expect(errors).toEqual([]);
      expect(await modelCalls(page)).toBe(before);
    });
