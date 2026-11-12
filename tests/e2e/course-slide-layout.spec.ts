import { expect, test } from "@playwright/test";
import { signIn } from "./fixture-auth";
import { modelCalls } from "./course-evidence";

test("long slides scroll in their frame with readable formatting and visible controls", async ({
  page,
  context,
}) => {
  await signIn(context, "courseLayout");
  const before = await modelCalls(page);
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 900 });
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
      }));
      expect(metrics.font).toContain("Inter");
      expect(metrics.size).toBe("16px");
      expect(metrics.lineHeight).toBeGreaterThanOrEqual(26);
      expect(metrics.width).toBeLessThanOrEqual(640);
      if (slide === 2) {
        expect(metrics.scrollHeight).toBeGreaterThan(metrics.height);
        await body.evaluate((node) => {
          node.scrollTop = node.scrollHeight;
        });
      }
      const controls = page
        .getByRole("button", {
          name: slide === 13 ? "Start quiz" : "Next",
          exact: true,
        })
        .last();
      const box = await controls.boundingBox();
      expect(box).not.toBeNull();
      expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(900);
      expect(await page.locator("article h2").textContent()).not.toMatch(
        /\.$/u,
      );
      if (slide === 2) {
        await expect(body.locator("ul li")).toHaveCount(6);
        expect(await body.locator("strong").count()).toBeGreaterThan(0);
      }
      if (slide === 13) await expect(body.locator("ol li")).toHaveCount(5);
      if (slide < 13) {
        await controls.click();
        await expect(body).toHaveJSProperty("scrollTop", 0);
      }
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(await modelCalls(page)).toBe(before);
});
