import { expect, test } from "@playwright/test";
import { signIn } from "./fixture-auth";
import { openPlayLevel } from "./play-helpers";
import { modelCalls } from "./course-evidence";
import { mkdirSync } from "node:fs";

test("the quiz overlay gives the slide the full short-window reader", async ({
  page,
  context,
}) => {
  await signIn(context, "courseOverlay");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const before = await modelCalls(page);
  mkdirSync("artifacts/rag-course-3", { recursive: true });
  await openPlayLevel(page, 1);
  await page.getByRole("button", { name: "Slides", exact: true }).click();
  const overlay = page.getByRole("dialog", {
    name: "Topic 1 slides",
    exact: true,
  });
  await expect(overlay.getByLabel("Slide counter")).toHaveText("6 / 13");
  for (let next = 0; next < 2; next++)
    await overlay.getByRole("button", { name: "Next", exact: true }).click();
  for (const theme of ["light", "dark"]) {
    if (theme === "dark") {
      await overlay
        .getByRole("button", { name: "Close slides", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Switch to dark mode", exact: true })
        .click();
      await page.getByRole("button", { name: "Slides", exact: true }).click();
      await expect(overlay.getByLabel("Slide counter")).toHaveText("6 / 13");
      for (let next = 0; next < 2; next++)
        await overlay
          .getByRole("button", { name: "Next", exact: true })
          .click();
      await expect(overlay.getByLabel("Slide counter")).toHaveText("8 / 13");
    }
    for (const { width, height } of [
      { width: 1440, height: 669 },
      { width: 1280, height: 720 },
      { width: 1440, height: 900 },
      { width: 375, height: 667 },
    ]) {
      await page.setViewportSize({ width, height });
      await expect(
        overlay.getByRole("heading", {
          name: "Ingestion and chunking",
          exact: true,
        }),
      ).toHaveCount(0);
      await expect(
        overlay.getByText("Topic 1 · Learn", { exact: true }),
      ).toHaveCount(0);
      const reader = overlay.getByRole("region", {
        name: "Slides reader",
        exact: true,
      });
      const regionBox = await reader.boundingBox();
      expect(regionBox?.height).toBeGreaterThan(height * 0.6);
      const body = overlay.getByRole("region", { name: "Slide content" });
      expect(
        await body.evaluate((node) => node.clientHeight),
      ).toBeGreaterThanOrEqual(280);
      const diagram = overlay.locator('[data-course-diagram="split-table"]');
      // Nearest-edge scrolling can round a fraction of a pixel under the border.
      await diagram.evaluate((node) =>
        node.scrollIntoView({ block: "center", inline: "nearest" }),
      );
      await test.info().attach(`diagram-${theme}-${width}x${height}`, {
        body: JSON.stringify(
          await diagram.evaluate((node) => {
            const reader = node.closest('[aria-label="Slides reader"]');
            return {
              picture: node.getBoundingClientRect().toJSON(),
              reader: reader?.getBoundingClientRect().toJSON(),
              clientWidth: reader?.clientWidth,
              clientHeight: reader?.clientHeight,
              scrollWidth: reader?.scrollWidth,
              scrollHeight: reader?.scrollHeight,
              left: reader?.scrollLeft,
              top: reader?.scrollTop,
            };
          }),
        ),
        contentType: "application/json",
      });
      await expect(diagram).toBeInViewport({ ratio: 1 });
      const visible = await diagram.evaluate((node) => {
        const picture = node.getBoundingClientRect();
        const scroll = node
          .closest('[aria-label="Slides reader"]')
          ?.getBoundingClientRect();
        return (
          scroll && picture.top >= scroll.top && picture.bottom <= scroll.bottom
        );
      });
      expect(visible).toBe(true);
      const picture = await diagram.boundingBox();
      const controls = await overlay
        .getByRole("button", { name: "Next", exact: true })
        .boundingBox();
      expect((picture?.y ?? 0) + (picture?.height ?? 0)).toBeLessThan(
        controls?.y ?? 0,
      );
      await expect(body).toHaveJSProperty("scrollTop", 0);
      await expect(
        overlay.getByRole("button", { name: "Next", exact: true }),
      ).toBeInViewport();
      await page.mouse.move(0, 0);
      const closeButton = overlay.getByRole("button", {
        name: "Close slides",
        exact: true,
      });
      const backButton = overlay.getByRole("button", {
        name: "Back",
        exact: true,
      });
      const pixelStyle = (node: Element) => {
        const style = getComputedStyle(node);
        return {
          font: style.fontFamily,
          clip: style.clipPath,
          border: style.borderBottomWidth,
          radius: style.borderRadius,
          color: style.color,
          background: style.backgroundColor,
        };
      };
      expect(await closeButton.evaluate(pixelStyle)).toEqual(
        await backButton.evaluate(pixelStyle),
      );
      await expect(closeButton).toHaveCSS("border-bottom-width", "4px");
      await expect(closeButton).toHaveCSS("text-transform", "uppercase");
      await page.screenshot({
        path: `artifacts/rag-course-3/overlay-S8-${theme}-${width}x${height}.png`,
      });
    }
  }
  await overlay
    .getByRole("button", { name: "Close slides", exact: true })
    .focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  const focusedBack = overlay.getByRole("button", {
    name: "Back",
    exact: true,
  });
  await expect(focusedBack).toBeFocused();
  await expect(focusedBack).not.toHaveCSS("box-shadow", "none");

  await overlay.getByRole("button", { name: "Next", exact: true }).click();
  await expect(
    overlay.getByRole("region", { name: "Slides reader", exact: true }),
  ).toHaveJSProperty("scrollTop", 0);
  await page.keyboard.press("Escape");
  expect(await modelCalls(page)).toBe(before);
});
