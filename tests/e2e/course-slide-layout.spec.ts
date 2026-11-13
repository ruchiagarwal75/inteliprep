import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { signIn } from "./fixture-auth";
import { modelCalls } from "./course-evidence";

test("Learn slides remain readable in short windows and scroll with the page", async ({
  page,
  context,
}) => {
  await signIn(context, "courseLayout");
  await page.emulateMedia({ reducedMotion: "reduce" });
  mkdirSync("artifacts/rag-course-3", { recursive: true });
  const before = await modelCalls(page);
  for (const { width, height } of [
    { width: 1440, height: 669 },
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
    { width: 375, height: 667 },
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto("/play/rag/topics/1");
    for (let slide = 1; slide <= 13; slide++) {
      const body = page.getByRole("region", { name: "Slide content" });
      const metrics = await body.evaluate((node) => ({
        font: getComputedStyle(node).fontFamily,
        size: getComputedStyle(node).fontSize,
        lineHeight: parseFloat(getComputedStyle(node).lineHeight),
        width: node.clientWidth,
        height: node.clientHeight,
        scrollHeight: node.scrollHeight,
        overflow: getComputedStyle(node).overflowY,
      }));
      if (slide === 1)
        await test.info().attach(`body-${width}x${height}`, {
          body: JSON.stringify(metrics),
          contentType: "application/json",
        });
      if (slide === 1) {
        const back = page.getByRole("button", { name: "Back", exact: true });
        await expect(back).toBeDisabled();
        await expect(back).toHaveCSS("opacity", "1");
      }
      expect(metrics.font).toContain("Inter");
      expect(metrics.size).toBe("16px");
      expect(metrics.lineHeight).toBeGreaterThanOrEqual(26);
      expect(metrics.width).toBeLessThanOrEqual(640);
      expect(metrics.height).toBeGreaterThan(0);
      expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.height + 1);
      expect(metrics.overflow).toBe("visible");
      await body.locator("p,li").first().scrollIntoViewIfNeeded();
      await expect(body.locator("p,li").first()).toBeInViewport();
      await expect(body).toHaveJSProperty("scrollTop", 0);
      const controls = page
        .getByRole("button", {
          name: slide === 13 ? "Start quiz" : "Next",
          exact: true,
        })
        .last();
      const box = await controls.boundingBox();
      expect(box).not.toBeNull();
      expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(height);
      expect(await page.locator("article h2").textContent()).not.toMatch(
        /\.$/u,
      );
      if (slide === 2) {
        await expect(body.locator("ul li")).toHaveCount(6);
        expect(await body.locator("strong").count()).toBeGreaterThan(0);
      }
      if (slide === 13) await expect(body.locator("ol li")).toHaveCount(5);
      if (slide === 1 || slide === 6) {
        if (slide === 1) {
          await page
            .locator("article")
            .evaluate((node) => node.scrollIntoView({ block: "start" }));
          for (const paragraph of await body.locator("p").all())
            await expect(paragraph).toBeInViewport({ ratio: 1 });
        }
        if (slide === 6) {
          const diagram = body.locator('[data-course-diagram="overlap"]');
          await diagram.scrollIntoViewIfNeeded();
          await expect(diagram).toBeInViewport({ ratio: 1 });
          await expect(body).toHaveJSProperty("scrollTop", 0);
        }
        await page.screenshot({
          path: `artifacts/rag-course-3/learn-S${slide}-${width}x${height}.png`,
          fullPage: false,
        });
      }
      if (slide < 13) await controls.click();
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(await modelCalls(page)).toBe(before);
});
