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
  await expect(overlay.getByLabel("Slide counter")).toHaveText("13 / 13");
  for (let back = 0; back < 5; back++)
    await overlay.getByRole("button", { name: "Back", exact: true }).click();
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
    await diagram.scrollIntoViewIfNeeded();
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
    await page.screenshot({
      path: `artifacts/rag-course-3/overlay-S8-${width}x${height}.png`,
    });
  }
  await overlay.getByRole("button", { name: "Next", exact: true }).click();
  await expect(
    overlay.getByRole("region", { name: "Slides reader", exact: true }),
  ).toHaveJSProperty("scrollTop", 0);
  await page.keyboard.press("Escape");
  expect(await modelCalls(page)).toBe(before);
});
