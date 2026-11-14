import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { signIn } from "./fixture-auth";
import { modelCalls } from "./course-evidence";

for (const theme of ["light", "dark"] as const)
  for (const width of [1440, 375])
    test(`whole course map fits and remains usable: ${theme}, ${width}`, async ({
      page,
      context,
    }) => {
      await signIn(context, "fixes4Path");
      await context.addCookies([
        { name: "mockmeai-theme", value: theme, url: "http://localhost:3100" },
      ]);
      await page.setViewportSize({ width, height: width === 1440 ? 669 : 812 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const before = await modelCalls(page);
      await page.goto("/play/rag");
      const map = page.locator("[data-course-map]");
      await expect(map).toBeVisible();
      await expect(page.locator("[data-map-topic]")).toHaveCount(10);
      await expect(page.locator("[data-map-boss]")).toHaveCount(1);
      for (const stop of await map.locator("li").all())
        await expect(stop).toBeInViewport({ ratio: 1 });
      expect(
        await map.evaluate((el) => el.getBoundingClientRect().height),
      ).toBeLessThanOrEqual(400);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.evaluate(() => document.fonts.ready);
      mkdirSync("artifacts/course-map", { recursive: true });
      await page.screenshot({
        path: `artifacts/course-map/overview-${theme}-${width}.png`,
      });
      await page
        .getByRole("button", {
          name: "Topic 9: Failure modes and safety, locked",
          exact: true,
        })
        .click();
      const selection = page.locator("#course-map-selection");
      await expect(selection).toContainText("Pass Topic 8 to unlock.");
      await expect(
        selection.getByRole("link", { name: "Learn", exact: true }),
      ).toHaveCount(0);
      const next = page.getByRole("button", {
        name: "Topic 2: Embeddings and the vector store, current",
        exact: true,
      });
      await next.focus();
      await next.press("Enter");
      await expect(selection.getByRole("heading")).toHaveText(
        "Embeddings and the vector store",
      );
      await expect(
        selection.getByRole("link", { name: "Learn", exact: true }),
      ).toHaveAttribute("href", "/play/rag/topics/2");
      await page
        .getByRole("link", { name: "Detailed path", exact: true })
        .click();
      await expect(page).toHaveURL(/view=path/);
      await expect(
        page
          .getByRole("list", { name: "RAG course topics", exact: true })
          .locator(":scope > li"),
      ).toHaveCount(10);
      await expect(map).toHaveCount(0);
      await page
        .getByRole("link", { name: "Map overview", exact: true })
        .click();
      await expect(page).toHaveURL(/view=map/);
      await expect(map).toBeInViewport({ ratio: 1 });
      await page
        .getByRole("link", {
          name: "Final boss: mock interview details",
          exact: true,
        })
        .click();
      await expect(page.locator("#rag-boss")).toBeInViewport();
      expect(await modelCalls(page)).toBe(before);
      expect(errors).toEqual([]);
    });
