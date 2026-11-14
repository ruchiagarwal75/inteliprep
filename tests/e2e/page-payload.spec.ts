import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { signIn } from "./fixture-auth";
import { modelCalls } from "./course-evidence";
import { THEME_COOKIE } from "../../src/lib/theme-preference";

for (const theme of ["light", "dark"])
  for (const width of [1440, 375])
    test(`page payloads stay small: ${theme}, ${width}`, async ({
      page,
      context,
    }) => {
      test.setTimeout(120000);
      await signIn(context, "fixes4Path");
      await context.addCookies([
        { name: THEME_COOKIE, value: theme, url: "http://localhost:3100" },
      ]);
      await page.setViewportSize({ width, height: width === 1440 ? 669 : 812 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      const before = await modelCalls(page),
        errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const samples: {
        route: string;
        bytes: number;
        ttfbMs: number;
        responseMs: number;
      }[] = [];
      for (const route of [
        "/play",
        "/mock",
        "/progress",
        "/play/rag",
        "/play/rag/topics/1",
        ...Array.from(
          { length: 10 },
          (_, level) => `/play/rag/notebook?topic=${level}`,
        ),
      ]) {
        const response = await page.goto(route);
        if (!response) throw Error("Missing page response");
        expect(response.status()).toBe(200);
        const bytes = (await response.body()).length;
        const timing = await page.evaluate(() => {
          const n = performance
            .getEntriesByType("navigation")
            .find(
              (entry): entry is PerformanceNavigationTiming =>
                entry instanceof PerformanceNavigationTiming,
            );
          if (!n) throw Error("Missing navigation timing");
          return {
            ttfbMs: n.responseStart - n.startTime,
            responseMs: n.responseEnd - n.startTime,
          };
        });
        samples.push({ route, bytes, ...timing });
        if (route === "/play/rag") {
          expect(bytes).toBeLessThan(60000);
          await expect(
            page.getByRole("list", { name: "RAG course topics", exact: true }),
          ).toBeVisible();
          await expect(page.locator("[data-course-map]")).toHaveCount(0);
        }
        if (route.includes("/notebook")) {
          expect(bytes).toBeLessThan(100000);
          const level = new URL(route, "http://localhost").searchParams.get(
            "topic",
          );
          await expect(page.locator("section[id^=topic-]")).toHaveCount(1);
          await expect(page.locator(`#topic-${level}`)).toBeVisible();
          await page.locator("[data-topic-picker] > summary").click();
          await expect(
            page
              .getByRole("navigation", { name: "Notebook topics", exact: true })
              .getByRole("link"),
          ).toHaveCount(10);
          await page.locator("[data-topic-picker] > summary").click();
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          ).toBe(true);
        }
      }
      mkdirSync("artifacts/performance", { recursive: true });
      writeFileSync(
        `artifacts/performance/payload-${theme}-${width}.json`,
        JSON.stringify(samples, null, 2),
      );
      await page.screenshot({
        path: `artifacts/performance/notebook-${theme}-${width}.png`,
      });
      expect(errors).toEqual([]);
      expect(await modelCalls(page)).toBe(before);
    });
